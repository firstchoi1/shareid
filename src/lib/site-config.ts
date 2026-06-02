import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ShowcaseRegionConfig = {
  key: string;
  label: string;
  tagId: number | null;
};

export type SiteConfig = {
  purchaseUrl: string;
  appleAutoBaseUrl: string;
  appleAutoApiKey: string;
  regions: ShowcaseRegionConfig[];
};

const CONFIG_DIR = path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(CONFIG_DIR, "site-config.json");

const DEFAULT_CONFIG: SiteConfig = {
  purchaseUrl: "https://id188.vip/",
  appleAutoBaseUrl:
    process.env.SHOWCASE_APPLE_AUTO_BASE_URL?.trim() ||
    process.env.APPLE_AUTO_BASE_URL?.trim() ||
    "",
  appleAutoApiKey:
    process.env.SHOWCASE_APPLE_AUTO_API_KEY?.trim() ||
    process.env.APPLE_AUTO_API_KEY?.trim() ||
    "",
  regions: [
    { key: "us", label: "美区 ID", tagId: 1 },
    { key: "us_rocket", label: "美区小火箭", tagId: 6 },
    { key: "hk", label: "香港 ID", tagId: 2 },
    { key: "jp", label: "日本 ID", tagId: 3 },
    { key: "tw", label: "台湾 ID", tagId: 4 },
    { key: "cn", label: "中国 ID", tagId: 5 },
  ],
};

function fallbackTagIdForKey(key: string) {
  const envKey = `SHOWCASE_TAG_${key.toUpperCase()}`;
  const raw = process.env[envKey]?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeRegion(input: Partial<ShowcaseRegionConfig>, index: number): ShowcaseRegionConfig {
  const rawKey = typeof input.key === "string" ? input.key.trim().toLowerCase() : "";
  const safeKey = rawKey.replace(/[^a-z0-9_]/g, "");
  const key = safeKey || `region_${index + 1}`;

  const rawLabel = typeof input.label === "string" ? input.label.trim() : "";
  const label = rawLabel || key;

  const rawTag =
    typeof input.tagId === "number"
      ? input.tagId
      : typeof input.tagId === "string"
        ? Number(input.tagId)
        : fallbackTagIdForKey(key);

  const tagId = Number.isInteger(rawTag) && Number(rawTag) >= 0 ? Number(rawTag) : null;

  return { key, label, tagId };
}

function normalizeConfig(input: Partial<SiteConfig> | null | undefined): SiteConfig {
  const purchaseUrl =
    typeof input?.purchaseUrl === "string" && input.purchaseUrl.trim() !== ""
      ? input.purchaseUrl.trim()
      : DEFAULT_CONFIG.purchaseUrl;

  const appleAutoBaseUrl =
    typeof input?.appleAutoBaseUrl === "string" && input.appleAutoBaseUrl.trim() !== ""
      ? input.appleAutoBaseUrl.trim()
      : DEFAULT_CONFIG.appleAutoBaseUrl;

  const appleAutoApiKey =
    typeof input?.appleAutoApiKey === "string" && input.appleAutoApiKey.trim() !== ""
      ? input.appleAutoApiKey.trim()
      : DEFAULT_CONFIG.appleAutoApiKey;

  const rawRegions = Array.isArray(input?.regions) ? input.regions : DEFAULT_CONFIG.regions;
  const deduped = new Map<string, ShowcaseRegionConfig>();

  rawRegions.forEach((region, index) => {
    const normalized = normalizeRegion(region, index);
    if (!deduped.has(normalized.key)) {
      deduped.set(normalized.key, normalized);
    }
  });

  const regions = Array.from(deduped.values());

  return {
    purchaseUrl,
    appleAutoBaseUrl,
    appleAutoApiKey,
    regions: regions.length > 0 ? regions : DEFAULT_CONFIG.regions,
  };
}

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return normalizeConfig(JSON.parse(raw) as SiteConfig);
  } catch {
    return normalizeConfig(DEFAULT_CONFIG);
  }
}

export async function saveSiteConfig(config: SiteConfig) {
  const normalized = normalizeConfig(config);
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}
