import { ensureCurrentSiteRecord } from "@/lib/current-site";
import { hasDatabaseConfig, query, withTransaction } from "@/lib/db";

export type ShowcaseRegionConfig = {
  key: string;
  label: string;
  tagId: number | null;
  countryNote: string;
};

export type SiteConfig = {
  purchaseUrl: string;
  appleAutoBaseUrl: string;
  appleAutoApiKey: string;
  redeemModeEnabled: boolean;
  regions: ShowcaseRegionConfig[];
};

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
  redeemModeEnabled: false,
  regions: [
    { key: "us", label: "美区 ID", tagId: 1, countryNote: "美国" },
    { key: "us_rocket", label: "美区小火箭", tagId: 6, countryNote: "美国" },
    { key: "hk", label: "香港 ID", tagId: 2, countryNote: "香港" },
    { key: "jp", label: "日本 ID", tagId: 3, countryNote: "日本" },
    { key: "tw", label: "台湾 ID", tagId: 4, countryNote: "台湾" },
    { key: "cn", label: "中国 ID", tagId: 5, countryNote: "中国" },
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

  const rawCountryNote = typeof input.countryNote === "string" ? input.countryNote.trim() : "";
  const countryNote = rawCountryNote || label.replace(/\s*ID$/i, "").trim() || label;

  const rawTag =
    typeof input.tagId === "number"
      ? input.tagId
      : typeof input.tagId === "string"
        ? Number(input.tagId)
        : fallbackTagIdForKey(key);

  const tagId = Number.isInteger(rawTag) && Number(rawTag) >= 0 ? Number(rawTag) : null;

  return { key, label, tagId, countryNote };
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

  const redeemModeEnabled =
    typeof input?.redeemModeEnabled === "boolean"
      ? input.redeemModeEnabled
      : DEFAULT_CONFIG.redeemModeEnabled;

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
    redeemModeEnabled,
    regions: regions.length > 0 ? regions : DEFAULT_CONFIG.regions,
  };
}

type SiteConfigRow = {
  purchase_url: string | null;
  apple_auto_base_url: string | null;
  apple_auto_api_key: string | null;
  redeem_mode_enabled: boolean;
};

type SiteRegionRow = {
  region_key: string;
  region_label: string;
  tag_id: number | null;
  country_note: string | null;
};

async function readDatabaseConfig(): Promise<SiteConfig | null> {
  const site = await ensureCurrentSiteRecord();
  if (!site) return null;

  const [siteResult, regionsResult] = await Promise.all([
    query<SiteConfigRow>(
      `SELECT purchase_url, apple_auto_base_url, apple_auto_api_key, redeem_mode_enabled
       FROM sites
       WHERE id = $1
       LIMIT 1`,
      [site.id]
    ),
    query<SiteRegionRow>(
      `SELECT region_key, region_label, tag_id, country_note
       FROM site_regions
       WHERE site_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [site.id]
    ),
  ]);

  const siteRow = siteResult.rows[0];
  if (!siteRow) return null;

  return normalizeConfig({
    purchaseUrl: siteRow.purchase_url ?? DEFAULT_CONFIG.purchaseUrl,
    appleAutoBaseUrl: siteRow.apple_auto_base_url ?? DEFAULT_CONFIG.appleAutoBaseUrl,
    appleAutoApiKey: siteRow.apple_auto_api_key ?? DEFAULT_CONFIG.appleAutoApiKey,
    redeemModeEnabled: siteRow.redeem_mode_enabled,
    regions: regionsResult.rows.map((row) => ({
      key: row.region_key,
      label: row.region_label,
      tagId: row.tag_id,
      countryNote: row.country_note ?? "",
    })),
  });
}

async function writeDatabaseConfig(config: SiteConfig) {
  const site = await ensureCurrentSiteRecord();
  if (!site) {
    throw new Error("Current site record is unavailable");
  }

  const normalized = normalizeConfig(config);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE sites
       SET purchase_url = $2,
           apple_auto_base_url = $3,
           apple_auto_api_key = $4,
           redeem_mode_enabled = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [
        site.id,
        normalized.purchaseUrl,
        normalized.appleAutoBaseUrl,
        normalized.appleAutoApiKey,
        normalized.redeemModeEnabled,
      ]
    );

    await client.query(`DELETE FROM site_regions WHERE site_id = $1`, [site.id]);

    for (const [index, region] of normalized.regions.entries()) {
      await client.query(
        `INSERT INTO site_regions (
           site_id,
           region_key,
           region_label,
           tag_id,
           country_note,
           sort_order,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [site.id, region.key, region.label, region.tagId, region.countryNote, index]
      );
    }
  });

  return normalized;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  if (hasDatabaseConfig()) {
    const config = await readDatabaseConfig();
    if (config) return config;
  }

  return normalizeConfig(DEFAULT_CONFIG);
}

export async function saveSiteConfig(config: SiteConfig) {
  if (!hasDatabaseConfig()) return normalizeConfig(config);

  return writeDatabaseConfig(config);
}
