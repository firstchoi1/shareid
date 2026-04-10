/**
 * AppleAutoPro User API — 展示站专用（X-API-Key）
 * 配置：SHOWCASE_APPLE_AUTO_BASE_URL、SHOWCASE_APPLE_API_KEY（未设时可回退 APPLE_AUTO_*）
 */

export type AppleAccount = {
  id: number;
  username: string;
  password: string;
  last_check?: string | null;
  last_check_success?: boolean;
  region_display?: string | null;
};

type ApiEnvelope<T> = {
  ret: number;
  msg?: string;
  data?: T;
};

function normalizeHttpOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function requireShowcaseConfig() {
  const base = normalizeHttpOrigin(
    (process.env.SHOWCASE_APPLE_AUTO_BASE_URL ?? process.env.APPLE_AUTO_BASE_URL ?? "").trim()
  );
  const key =
    process.env.SHOWCASE_APPLE_AUTO_API_KEY?.trim() ||
    process.env.APPLE_AUTO_API_KEY?.trim() ||
    "";
  if (!base || !key) {
    throw new Error("SHOWCASE_APPLE_AUTO_NOT_CONFIGURED");
  }
  return { base, key };
}

async function fetchAppleJson(
  path: string,
  init: RequestInit | undefined,
  config: { base: string; key: string }
): Promise<unknown> {
  const { base, key } = config;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "X-API-Key": key,
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("APPLE_AUTO_INVALID_JSON");
  }
}

function unwrapAccountList(raw: unknown): AppleAccount[] {
  if (Array.isArray(raw)) {
    return raw as AppleAccount[];
  }
  if (raw && typeof raw === "object" && "ret" in raw) {
    const env = raw as ApiEnvelope<AppleAccount[]>;
    if (env.ret !== 1) {
      throw new Error(env.msg ?? "AppleAuto API error");
    }
    if (Array.isArray(env.data)) {
      return env.data;
    }
  }
  return [];
}

export async function listAppleAccountsForShowcase(tag?: number | null): Promise<AppleAccount[]> {
  const cfg = requireShowcaseConfig();
  const path =
    tag != null
      ? `/client/getAccountsByTag?tag=${encodeURIComponent(String(tag))}`
      : "/client/getAllAccounts";
  const raw = await fetchAppleJson(path, undefined, cfg);
  return unwrapAccountList(raw);
}
