import { NextResponse } from "next/server";

import { listAppleAccountsForShowcase } from "@/lib/apple-auto-client";

export const dynamic = "force-dynamic";

const REGION_KEYS = ["us", "hk", "jp", "tw", "cn"] as const;
type RegionKey = (typeof REGION_KEYS)[number];

function tagForRegion(region: string): number | null {
  const envKey = `SHOWCASE_TAG_${region.toUpperCase()}` as const;
  const raw = process.env[envKey]?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

/** 点击「复制密码」时拉取明文（列表接口为脱敏，不依赖 SHOWCASE_REVEAL_PASSWORDS） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = (url.searchParams.get("region") ?? "us").toLowerCase();
  const idRaw = url.searchParams.get("id");
  const id = idRaw != null ? Number(idRaw) : NaN;

  if (!REGION_KEYS.includes(region as RegionKey)) {
    return NextResponse.json({ ok: false, message: "无效地区" }, { status: 400 });
  }
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ ok: false, message: "无效账号" }, { status: 400 });
  }

  const tag = tagForRegion(region);
  if (tag == null) {
    return NextResponse.json({ ok: false, message: "该地区尚未配置标签" }, { status: 400 });
  }

  try {
    const list = await listAppleAccountsForShowcase(tag);
    const acc = list.find((a) => a.id === id);
    if (!acc) {
      return NextResponse.json({ ok: false, message: "未找到该账号" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, password: acc.password });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "托管站请求失败";
    const msg =
      raw === "SHOWCASE_APPLE_AUTO_NOT_CONFIGURED"
        ? "未配置托管接口（SHOWCASE_APPLE_AUTO_API_KEY，可选 SHOWCASE_APPLE_AUTO_BASE_URL）"
        : raw;
    return NextResponse.json({ ok: false, message: msg }, { status: 502 });
  }
}
