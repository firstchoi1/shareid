import { randomBytes } from "node:crypto";

import { ensureCurrentSiteRecord } from "@/lib/current-site";
import { hasDatabaseConfig, query, withTransaction } from "@/lib/db";
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

type CreateBatchInput = {
  quantity: number;
  prefix?: string;
  durationType: RedeemDurationType;
  durationValue: number | null;
  note?: string;
  bindings: RedeemCodeBinding[];
};

type DbCodeRow = {
  id: number;
  code: string;
  enabled: boolean;
  duration_type: RedeemDurationType;
  duration_value: number | null;
  note: string | null;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
};

type DbBindingRow = {
  redeem_code_id: number;
  tag_id: number;
  count: number;
  region_key: string | null;
};

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

function makeCode(prefix?: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = (length: number) =>
    Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const core = `${segment(4)}-${segment(4)}-${segment(4)}`;
  const cleanedPrefix = prefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleanedPrefix ? `${cleanedPrefix}-${core}` : core;
}

async function readDatabaseItems(): Promise<RedeemCodeItem[] | null> {
  const site = await ensureCurrentSiteRecord();
  if (!site) return null;

  const [codeResult, bindingResult] = await Promise.all([
    query<DbCodeRow>(
      `SELECT id, code, enabled, duration_type, duration_value, note, created_at, activated_at, expires_at
       FROM redeem_codes
       WHERE site_id = $1
       ORDER BY created_at DESC, id DESC`,
      [site.id]
    ),
    query<DbBindingRow>(
      `SELECT b.redeem_code_id, b.tag_id, b.count, r.region_key
       FROM redeem_code_bindings b
       JOIN redeem_codes c ON c.id = b.redeem_code_id
       LEFT JOIN site_regions r ON r.site_id = c.site_id AND r.tag_id = b.tag_id
       WHERE c.site_id = $1
       ORDER BY b.id ASC`,
      [site.id]
    ),
  ]);

  const bindingMap = new Map<number, RedeemCodeBinding[]>();
  for (const row of bindingResult.rows) {
    const bindings = bindingMap.get(row.redeem_code_id) ?? [];
    bindings.push({
      regionKey: (row.region_key ?? `tag_${row.tag_id}`).toLowerCase(),
      count: row.count,
    });
    bindingMap.set(row.redeem_code_id, bindings);
  }

  return codeResult.rows.map((row) => ({
    id: String(row.id),
    code: row.code,
    enabled: row.enabled,
    createdAt: new Date(row.created_at).toISOString(),
    activatedAt: row.activated_at ? new Date(row.activated_at).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    durationType: row.duration_type,
    durationValue: row.duration_value,
    note: row.note ?? "",
    bindings: bindingMap.get(row.id) ?? [],
  }));
}

async function readActiveStore() {
  if (!hasDatabaseConfig()) return { source: "memory" as const, items: [] };

  const items = await readDatabaseItems();
  if (items) return { source: "db" as const, items };
  return { source: "memory" as const, items: [] };
}

export async function listRedeemCodes() {
  const store = await readActiveStore();
  return [...store.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function createBatchInDatabase(input: CreateBatchInput, regions: ShowcaseRegionConfig[]) {
  const site = await ensureCurrentSiteRecord();
  if (!site) {
    throw new Error("Current site record is unavailable");
  }

  const quantity = Number.isInteger(input.quantity) && input.quantity > 0 ? input.quantity : 1;
  const durationType = input.durationType;
  const durationValue = durationType === "forever" ? null : input.durationValue ?? 1;
  const note = input.note?.trim() ?? "";

  const regionMap = new Map(regions.map((region) => [region.key, region]));
  const bindings = (input.bindings ?? [])
    .map(normalizeBinding)
    .filter((item): item is RedeemCodeBinding => Boolean(item))
    .filter((item) => regionMap.has(item.regionKey));

  if (bindings.length === 0) {
    throw new Error("请至少配置一个有效的兑换标签");
  }

  const created = await withTransaction(async (client) => {
    const existingResult = await client.query<{ code: string }>(
      `SELECT code FROM redeem_codes WHERE site_id = $1`,
      [site.id]
    );
    const existingCodes = new Set(existingResult.rows.map((row) => row.code));
    const nextItems: RedeemCodeItem[] = [];

    for (let index = 0; index < quantity; index += 1) {
      let code = makeCode(input.prefix);
      while (existingCodes.has(code)) {
        code = makeCode(input.prefix);
      }
      existingCodes.add(code);

      const inserted = await client.query<{ id: number; created_at: string }>(
        `INSERT INTO redeem_codes (
           site_id,
           code,
           enabled,
           duration_type,
           duration_value,
           note,
           created_at,
           activated_at,
           expires_at
         )
         VALUES ($1, $2, TRUE, $3, $4, $5, NOW(), NULL, NULL)
         RETURNING id, created_at`,
        [site.id, code, durationType, durationValue, note]
      );

      const codeId = inserted.rows[0].id;
      for (const binding of bindings) {
        const region = regionMap.get(binding.regionKey);
        if (!region || region.tagId == null) continue;
        await client.query(
          `INSERT INTO redeem_code_bindings (redeem_code_id, tag_id, count)
           VALUES ($1, $2, $3)`,
          [codeId, region.tagId, binding.count]
        );
      }

      nextItems.push({
        id: String(codeId),
        code,
        enabled: true,
        createdAt: new Date(inserted.rows[0].created_at).toISOString(),
        activatedAt: null,
        expiresAt: null,
        durationType,
        durationValue,
        note,
        bindings,
      });
    }

    return nextItems;
  });

  return created;
}

export async function createRedeemCodesBatch(input: CreateBatchInput, regions: ShowcaseRegionConfig[]) {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL 未配置，兑换码功能无法使用");
  }

  return createBatchInDatabase(input, regions);
}

async function updateRedeemCodeInDatabase(
  id: string,
  patch: Partial<Pick<RedeemCodeItem, "enabled" | "note">>
) {
  const site = await ensureCurrentSiteRecord();
  if (!site) {
    throw new Error("Current site record is unavailable");
  }

  const result = await query<DbCodeRow>(
    `UPDATE redeem_codes
     SET enabled = COALESCE($3, enabled),
         note = COALESCE($4, note),
         created_at = created_at
     WHERE id = $1::bigint AND site_id = $2
     RETURNING id, code, enabled, duration_type, duration_value, note, created_at, activated_at, expires_at`,
    [
      Number(id),
      site.id,
      typeof patch.enabled === "boolean" ? patch.enabled : null,
      typeof patch.note === "string" ? patch.note.trim() : null,
    ]
  );

  if (!result.rows[0]) {
    throw new Error("兑换码不存在");
  }

  const items = await readDatabaseItems();
  if (items) {
    const item = items.find((entry) => entry.id === id);
    if (item) return item;
  }

  throw new Error("兑换码更新后读取失败");
}

export async function updateRedeemCode(
  id: string,
  patch: Partial<Pick<RedeemCodeItem, "enabled" | "note">>
) {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL 未配置，兑换码功能无法使用");
  }

  return updateRedeemCodeInDatabase(id, patch);
}

async function deleteRedeemCodeInDatabase(id: string) {
  const site = await ensureCurrentSiteRecord();
  if (!site) {
    throw new Error("Current site record is unavailable");
  }

  await query(`DELETE FROM redeem_codes WHERE id = $1::bigint AND site_id = $2`, [Number(id), site.id]);
  return;
}

export async function deleteRedeemCode(id: string) {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL 未配置，兑换码功能无法使用");
  }

  await deleteRedeemCodeInDatabase(id);
}

async function activateAndResolveRedeemCodeInDatabase(codeInput: string) {
  const site = await ensureCurrentSiteRecord();
  if (!site) {
    throw new Error("Current site record is unavailable");
  }

  const code = normalizeCode(codeInput);

  const updated = await withTransaction(async (client) => {
    const result = await client.query<DbCodeRow>(
      `SELECT id, code, enabled, duration_type, duration_value, note, created_at, activated_at, expires_at
       FROM redeem_codes
       WHERE site_id = $1 AND code = $2
       LIMIT 1
       FOR UPDATE`,
      [site.id, code]
    );

    const item = result.rows[0];
    if (!item) throw new Error("兑换码不存在");
    if (!item.enabled) throw new Error("兑换码已禁用");

    const now = new Date();
    if (!item.activated_at) {
      const expiresAt = computeExpiryFromActivation(now, item.duration_type, item.duration_value);
      const activationResult = await client.query<DbCodeRow>(
        `UPDATE redeem_codes
         SET activated_at = $3, expires_at = $4
         WHERE id = $1 AND site_id = $2
         RETURNING id, code, enabled, duration_type, duration_value, note, created_at, activated_at, expires_at`,
        [item.id, site.id, now.toISOString(), expiresAt ? expiresAt.toISOString() : null]
      );
      return activationResult.rows[0];
    }

    return item;
  });

  if (updated.expires_at && new Date(updated.expires_at).getTime() <= Date.now()) {
    throw new Error("兑换码已失效");
  }

  const items = await readDatabaseItems();
  if (items) {
    const item = items.find((entry) => entry.code === code);
    if (item) return item;
  }

  throw new Error("兑换码读取失败");
}

export async function activateAndResolveRedeemCode(codeInput: string) {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL 未配置，兑换码功能无法使用");
  }

  return activateAndResolveRedeemCodeInDatabase(codeInput);
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
