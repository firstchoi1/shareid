import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function parseArgs(argv) {
  const args = {
    manifest: path.resolve("db/sites-migration-manifest.json"),
    output: path.resolve("db/export/sites-migration.sql"),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--manifest" && value) {
      args.manifest = path.resolve(value);
      index += 1;
      continue;
    }
    if (key === "--output" && value) {
      args.output = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${key}`);
  }

  return args;
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBoolean(value) {
  return value ? "TRUE" : "FALSE";
}

function sqlInteger(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "NULL";
  return String(Number(value));
}

function normalizeConfig(raw, env) {
  const purchaseUrl =
    typeof raw?.purchaseUrl === "string" && raw.purchaseUrl.trim() !== ""
      ? raw.purchaseUrl.trim()
      : "https://id188.vip/";

  const appleAutoBaseUrl =
    typeof raw?.appleAutoBaseUrl === "string" && raw.appleAutoBaseUrl.trim() !== ""
      ? raw.appleAutoBaseUrl.trim()
      : env.SHOWCASE_APPLE_AUTO_BASE_URL || env.APPLE_AUTO_BASE_URL || "";

  const appleAutoApiKey =
    typeof raw?.appleAutoApiKey === "string" && raw.appleAutoApiKey.trim() !== ""
      ? raw.appleAutoApiKey.trim()
      : env.SHOWCASE_APPLE_AUTO_API_KEY || env.APPLE_AUTO_API_KEY || "";

  const redeemModeEnabled = raw?.redeemModeEnabled === true;

  const regions = Array.isArray(raw?.regions)
    ? raw.regions.map((region, index) => ({
        key:
          typeof region?.key === "string" && region.key.trim() !== ""
            ? region.key.trim().toLowerCase()
            : `region_${index + 1}`,
        label:
          typeof region?.label === "string" && region.label.trim() !== ""
            ? region.label.trim()
            : `region_${index + 1}`,
        tagId:
          region?.tagId === null || region?.tagId === undefined || region?.tagId === ""
            ? null
            : Number(region.tagId),
        countryNote:
          typeof region?.countryNote === "string" && region.countryNote.trim() !== ""
            ? region.countryNote.trim()
            : typeof region?.label === "string"
              ? region.label.replace(/\s*ID$/i, "").trim()
              : "",
      }))
    : [];

  return {
    purchaseUrl,
    appleAutoBaseUrl,
    appleAutoApiKey,
    redeemModeEnabled,
    regions,
  };
}

function parseEnv(text) {
  const env = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeRedeemStore(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items
    .map((item) => ({
      code: typeof item?.code === "string" ? item.code.trim().toUpperCase() : "",
      enabled: item?.enabled !== false,
      createdAt:
        typeof item?.createdAt === "string" && item.createdAt.trim() !== ""
          ? item.createdAt.trim()
          : new Date().toISOString(),
      activatedAt:
        typeof item?.activatedAt === "string" && item.activatedAt.trim() !== ""
          ? item.activatedAt.trim()
          : null,
      expiresAt:
        typeof item?.expiresAt === "string" && item.expiresAt.trim() !== ""
          ? item.expiresAt.trim()
          : null,
      durationType:
        item?.durationType === "day" ||
        item?.durationType === "month" ||
        item?.durationType === "year" ||
        item?.durationType === "forever"
          ? item.durationType
          : "forever",
      durationValue:
        item?.durationType === "forever" || item?.durationType === undefined
          ? null
          : item?.durationValue === null || item?.durationValue === undefined
            ? 1
            : Number(item.durationValue),
      note: typeof item?.note === "string" ? item.note.trim() : "",
      bindings: Array.isArray(item?.bindings)
        ? item.bindings
            .map((binding) => ({
              regionKey:
                typeof binding?.regionKey === "string" ? binding.regionKey.trim().toLowerCase() : "",
              count: Number(binding?.count),
            }))
            .filter((binding) => binding.regionKey && Number.isInteger(binding.count) && binding.count > 0)
        : [],
    }))
    .filter((item) => item.code);
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(stripBom(await readFile(filePath, "utf8")));
  } catch {
    return fallback;
  }
}

async function readTextIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function renderSiteSql(site, config, redeemStore) {
  const lines = [];
  lines.push(`-- Site: ${site.siteKey}`);
  lines.push("BEGIN;");
  lines.push(`
INSERT INTO sites (site_key, site_name, domain, purchase_url, apple_auto_base_url, apple_auto_api_key, redeem_mode_enabled, timezone)
VALUES (
  ${sqlString(site.siteKey)},
  ${sqlString(site.siteName)},
  ${sqlString(site.domain || null)},
  ${sqlString(config.purchaseUrl)},
  ${sqlString(config.appleAutoBaseUrl)},
  ${sqlString(config.appleAutoApiKey)},
  ${sqlBoolean(config.redeemModeEnabled)},
  'Asia/Shanghai'
)
ON CONFLICT (site_key) DO UPDATE SET
  site_name = EXCLUDED.site_name,
  domain = EXCLUDED.domain,
  purchase_url = EXCLUDED.purchase_url,
  apple_auto_base_url = EXCLUDED.apple_auto_base_url,
  apple_auto_api_key = EXCLUDED.apple_auto_api_key,
  redeem_mode_enabled = EXCLUDED.redeem_mode_enabled,
  timezone = EXCLUDED.timezone,
  updated_at = NOW();
`.trim());

  lines.push(`
DELETE FROM redeem_logs
WHERE site_id = (SELECT id FROM sites WHERE site_key = ${sqlString(site.siteKey)});

DELETE FROM site_regions
WHERE site_id = (SELECT id FROM sites WHERE site_key = ${sqlString(site.siteKey)});

DELETE FROM redeem_codes
WHERE site_id = (SELECT id FROM sites WHERE site_key = ${sqlString(site.siteKey)});
`.trim());

  config.regions.forEach((region, index) => {
    lines.push(`
INSERT INTO site_regions (site_id, region_key, region_label, tag_id, country_note, sort_order)
VALUES (
  (SELECT id FROM sites WHERE site_key = ${sqlString(site.siteKey)}),
  ${sqlString(region.key)},
  ${sqlString(region.label)},
  ${sqlInteger(region.tagId)},
  ${sqlString(region.countryNote)},
  ${index}
);
`.trim());
  });

  redeemStore.forEach((item) => {
    lines.push(`
INSERT INTO redeem_codes (
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
VALUES (
  (SELECT id FROM sites WHERE site_key = ${sqlString(site.siteKey)}),
  ${sqlString(item.code)},
  ${sqlBoolean(item.enabled)},
  ${sqlString(item.durationType)},
  ${sqlInteger(item.durationValue)},
  ${sqlString(item.note)},
  ${sqlString(item.createdAt)}::timestamptz,
  ${item.activatedAt ? `${sqlString(item.activatedAt)}::timestamptz` : "NULL"},
  ${item.expiresAt ? `${sqlString(item.expiresAt)}::timestamptz` : "NULL"}
);
`.trim());

    item.bindings.forEach((binding) => {
      const region = config.regions.find((entry) => entry.key === binding.regionKey);
      const tagId = region?.tagId ?? null;
      if (tagId === null) return;

      lines.push(`
INSERT INTO redeem_code_bindings (redeem_code_id, tag_id, count)
VALUES (
  (
    SELECT id FROM redeem_codes
    WHERE site_id = (SELECT id FROM sites WHERE site_key = ${sqlString(site.siteKey)})
      AND code = ${sqlString(item.code)}
  ),
  ${sqlInteger(tagId)},
  ${sqlInteger(binding.count)}
);
`.trim());
    });
  });

  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = JSON.parse(stripBom(await readFile(args.manifest, "utf8")));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error("Manifest is empty");
  }

  const sqlChunks = [];

  for (const site of manifest) {
    if (!site?.siteKey || !site?.appDir) {
      throw new Error(`Invalid manifest entry: ${JSON.stringify(site)}`);
    }

    const appDir = site.appDir;
    const envText = await readTextIfExists(path.join(appDir, ".env"));
    const env = parseEnv(envText);
    const rawConfig = await readJsonIfExists(path.join(appDir, "data", "site-config.json"), {});
    const rawRedeem = await readJsonIfExists(path.join(appDir, "data", "redeem-codes.json"), {});

    const config = normalizeConfig(rawConfig, env);
    const redeemStore = normalizeRedeemStore(rawRedeem);

    sqlChunks.push(renderSiteSql(site, config, redeemStore));
  }

  await writeFile(args.output, sqlChunks.join("\n"), "utf8");
  console.log(`Wrote migration SQL to ${args.output}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
