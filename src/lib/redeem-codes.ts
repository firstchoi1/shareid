import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

import type { ShowcaseRegionConfig } from "@/lib/site-config";
import { computeExpiryFromActivation, durationText, formatShanghaiTime } from "@/lib/time";

export type RedeemDurationType = "day" | "month" | "year" | "forever";

export type RedeemCodeBinding = {
  regionKey: string;
  count: number;
};

export type RedeemCodeItem = {
  id: string;
  code: string;
  enabled: boolean;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  durationType: RedeemDurationType;
  durationValue: number | null;
  note: string;
  bindings: RedeemCodeBinding[];
};

type RedeemStore = {
  items: RedeemCodeItem[];
};

type CreateBatchInput = {
  quantity: number;
  prefix?: string;
  durationType: RedeemDurationType;
  durationValue: number | null;
  note?: string;
  bindings: RedeemCodeBinding[];
};

const CONFIG_DIR = path.join(process.cwd(), "data");
const REDEEM_CODES_PATH = path.join(CONFIG_DIR, "redeem-codes.json");

function normalizeBinding(input: Partial<RedeemCodeBinding>): RedeemCodeBinding | null {
  const regionKey = typeof input.regionKey === "string" ? input.regionKey.trim().toLowerCase() : "";
  const count =
    typeof input.count === "number"
      ? input.count
      : typeof input.count === "string"
        ? Number(input.count)
        : 0;

  if (!regionKey) return null;
  if (!Number.isInteger(count) || count <= 0) return null;

  return { regionKey, count };
}

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}

function normalizeItem(input: Partial<RedeemCodeItem>): RedeemCodeItem | null {
  const code = typeof input.code === "string" ? normalizeCode(input.code) : "";
  if (!code) return null;

  const durationType: RedeemDurationType =
    input.durationType === "day" ||
    input.durationType === "month" ||
    input.durationType === "year" ||
    input.durationType === "forever"
      ? input.durationType
      : "forever";

  const durationValue =
    durationType === "forever"
      ? null
      : typeof input.durationValue === "number"
        ? input.durationValue
        : typeof input.durationValue === "string"
          ? Number(input.durationValue)
          : 1;

  const bindings = Array.isArray(input.bindings)
    ? input.bindings.map(normalizeBinding).filter(Boolean) as RedeemCodeBinding[]
    : [];

  return {
    id:
      typeof input.id === "string" && input.id.trim() !== ""
        ? input.id
        : randomBytes(12).toString("hex"),
    code,
    enabled: input.enabled !== false,
    createdAt:
      typeof input.createdAt === "string" && input.createdAt.trim() !== ""
        ? input.createdAt
        : new Date().toISOString(),
    activatedAt:
      typeof input.activatedAt === "string" && input.activatedAt.trim() !== "" ? input.activatedAt : null,
    expiresAt:
      typeof input.expiresAt === "string" && input.expiresAt.trim() !== "" ? input.expiresAt : null,
    durationType,
    durationValue:
      durationType === "forever"
        ? null
        : Number.isInteger(durationValue) && Number(durationValue) > 0
          ? Number(durationValue)
          : 1,
    note: typeof input.note === "string" ? input.note.trim() : "",
    bindings,
  };
}

async function readStore(): Promise<RedeemStore> {
  try {
    const raw = await readFile(REDEEM_CODES_PATH, "utf-8");
    const parsed = JSON.parse(raw) as RedeemStore;
    return {
      items: Array.isArray(parsed?.items)
        ? parsed.items.map(normalizeItem).filter(Boolean) as RedeemCodeItem[]
        : [],
    };
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: RedeemStore) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(REDEEM_CODES_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function makeCode(prefix?: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = (length: number) =>
    Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const core = `${segment(4)}-${segment(4)}-${segment(4)}`;
  const cleanedPrefix = prefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleanedPrefix ? `${cleanedPrefix}-${core}` : core;
}

export async function listRedeemCodes() {
  const store = await readStore();
  return store.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createRedeemCodesBatch(input: CreateBatchInput, regions: ShowcaseRegionConfig[]) {
  const quantity = Number.isInteger(input.quantity) && input.quantity > 0 ? input.quantity : 1;
  const durationType = input.durationType;
  const durationValue = durationType === "forever" ? null : input.durationValue ?? 1;
  const note = input.note?.trim() ?? "";

  const validRegionKeys = new Set(regions.map((region) => region.key));
  const bindings = (input.bindings ?? [])
    .map(normalizeBinding)
    .filter((item): item is RedeemCodeBinding => Boolean(item))
    .filter((item) => validRegionKeys.has(item.regionKey));

  if (bindings.length === 0) {
    throw new Error("请至少配置一个有效的兑换标签");
  }

  const store = await readStore();
  const existingCodes = new Set(store.items.map((item) => item.code));
  const created: RedeemCodeItem[] = [];

  for (let index = 0; index < quantity; index += 1) {
    let code = makeCode(input.prefix);
    while (existingCodes.has(code)) {
      code = makeCode(input.prefix);
    }
    existingCodes.add(code);
    created.push({
      id: randomBytes(12).toString("hex"),
      code,
      enabled: true,
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiresAt: null,
      durationType,
      durationValue,
      note,
      bindings,
    });
  }

  store.items.unshift(...created);
  await writeStore(store);
  return created;
}

export async function updateRedeemCode(
  id: string,
  patch: Partial<Pick<RedeemCodeItem, "enabled" | "note">>
) {
  const store = await readStore();
  const item = store.items.find((entry) => entry.id === id);
  if (!item) {
    throw new Error("兑换码不存在");
  }
  if (typeof patch.enabled === "boolean") item.enabled = patch.enabled;
  if (typeof patch.note === "string") item.note = patch.note.trim();
  await writeStore(store);
  return item;
}

export async function deleteRedeemCode(id: string) {
  const store = await readStore();
  const next = store.items.filter((entry) => entry.id !== id);
  store.items = next;
  await writeStore(store);
}

export async function activateAndResolveRedeemCode(codeInput: string) {
  const code = normalizeCode(codeInput);
  const store = await readStore();
  const item = store.items.find((entry) => entry.code === code);
  if (!item) throw new Error("兑换码不存在");
  if (!item.enabled) throw new Error("兑换码已禁用");

  const now = new Date();
  if (!item.activatedAt) {
    item.activatedAt = now.toISOString();
    const expiresAt = computeExpiryFromActivation(now, item.durationType, item.durationValue);
    item.expiresAt = expiresAt ? expiresAt.toISOString() : null;
    await writeStore(store);
  }

  if (item.expiresAt && new Date(item.expiresAt).getTime() <= now.getTime()) {
    throw new Error("兑换码已失效");
  }

  return item;
}

export function describeRedeemCode(item: RedeemCodeItem) {
  if (!item.activatedAt) {
    return {
      status: "未激活",
      expiresText: `首次兑换后开始计时，时长：${durationText(item.durationType, item.durationValue)}`,
    };
  }

  if (!item.expiresAt) {
    return {
      status: "生效中",
      expiresText: "永久有效（上海时间）",
    };
  }

  return {
    status: new Date(item.expiresAt).getTime() > Date.now() ? "生效中" : "已过期",
    expiresText: `${formatShanghaiTime(item.expiresAt)}（上海时间）`,
  };
}
