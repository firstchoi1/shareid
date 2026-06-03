import path from "node:path";

import { headers } from "next/headers";

import { hasDatabaseConfig, query } from "@/lib/db";

function normalizeHost(raw: string) {
  return raw.trim().toLowerCase().replace(/:\d+$/, "");
}

function inferSiteKeyFromCwd() {
  const cwdName = path.basename(process.cwd()).trim().toLowerCase();
  if (cwdName === "shareid") return "pcyid";
  return cwdName || "pcyid";
}

async function readCurrentHost() {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-host");
    const host = headerStore.get("host");
    const value = forwarded || host || "";
    return value ? normalizeHost(value) : "";
  } catch {
    return "";
  }
}

function inferSiteName(siteKey: string) {
  return siteKey.toUpperCase();
}

type SiteIdentity = {
  siteKey: string;
  siteName: string;
  domain: string;
};

export async function resolveCurrentSiteIdentity(): Promise<SiteIdentity> {
  const siteKey = (process.env.SITE_KEY?.trim().toLowerCase() || inferSiteKeyFromCwd()).replace(
    /[^a-z0-9_-]/g,
    ""
  );
  const domain = await readCurrentHost();

  return {
    siteKey: siteKey || "pcyid",
    siteName: inferSiteName(siteKey || "pcyid"),
    domain,
  };
}

type SiteRecord = {
  id: number;
  site_key: string;
  site_name: string;
  domain: string | null;
};

export async function ensureCurrentSiteRecord() {
  if (!hasDatabaseConfig()) return null;

  const identity = await resolveCurrentSiteIdentity();

  const byKey = await query<SiteRecord>(
    `SELECT id, site_key, site_name, domain
     FROM sites
     WHERE site_key = $1
     LIMIT 1`,
    [identity.siteKey]
  );

  if (byKey.rows[0]) {
    const current = byKey.rows[0];
    if (identity.domain && current.domain !== identity.domain) {
      const updated = await query<SiteRecord>(
        `UPDATE sites
         SET domain = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING id, site_key, site_name, domain`,
        [current.id, identity.domain]
      );
      return updated.rows[0];
    }

    return current;
  }

  const inserted = await query<SiteRecord>(
    `INSERT INTO sites (site_key, site_name, domain, timezone)
     VALUES ($1, $2, NULLIF($3, ''), 'Asia/Shanghai')
     RETURNING id, site_key, site_name, domain`,
    [identity.siteKey, identity.siteName, identity.domain]
  );

  return inserted.rows[0] ?? null;
}
