import { NextResponse } from "next/server";

import { listAppleAccountsForShowcase, type AppleAccount } from "@/lib/apple-auto-client";

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

function maskPassword(pw: string): string {
  if (!pw) return "—";
  if (pw.length <= 2) return "**";
  return `${pw[0]}${"*".repeat(Math.min(8, pw.length - 2))}${pw[pw.length - 1]!}`;
}

function toPublicAccount(acc: AppleAccount, reveal: boolean) {
  return {
    id: acc.id,
    username: acc.username,
    password: reveal ? acc.password : maskPassword(acc.password),
    region_display: acc.region_display ?? null,
    last_check: acc.last_check ?? null,
    last_check_success: acc.last_check_success ?? null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = (url.searchParams.get("region") ?? "us").toLowerCase();

  if (!REGION_KEYS.includes(region as RegionKey)) {
    return NextResponse.json({ ok: false, message: "无效地区" }, { status: 400 });
  }

  const tag = tagForRegion(region);
  if (tag == null) {
    return NextResponse.json({
      ok: true,
      data: [],
      message: "该地区尚未配置标签（请设置 SHOWCASE_TAG_" + region.toUpperCase() + "）",
    });
  }

  const reveal = process.env.SHOWCASE_REVEAL_PASSWORDS === "true";

  try {
    const list = await listAppleAccountsForShowcase(tag);
    return NextResponse.json({
      ok: true,
      data: list.map((a) => toPublicAccount(a, reveal)),
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "托管站请求失败";
    const msg =
      raw === "SHOWCASE_APPLE_AUTO_NOT_CONFIGURED"
        ? "未配置托管接口（SHOWCASE_APPLE_AUTO_API_KEY，可选 SHOWCASE_APPLE_AUTO_BASE_URL）"
        : raw;
    return NextResponse.json({ ok: false, message: msg }, { status: 502 });
  }
}
