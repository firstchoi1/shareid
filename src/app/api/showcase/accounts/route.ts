import { NextResponse } from "next/server";

import { listAppleAccountsForShowcase, type AppleAccount } from "@/lib/apple-auto-client";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

function toPublicAccount(acc: AppleAccount) {
  return {
    id: acc.id,
    username: acc.username,
    password: acc.password,
    region_display: acc.region_display ?? null,
    last_check: acc.last_check ?? null,
    last_check_success: acc.last_check_success ?? null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const config = await getSiteConfig();
  const region = (url.searchParams.get("region") ?? config.regions[0]?.key ?? "us").toLowerCase();
  const regionConfig = config.regions.find((item) => item.key === region);

  if (!regionConfig) {
    return NextResponse.json({ ok: false, message: "无效地区" }, { status: 400 });
  }

  const tag = regionConfig.tagId;
  if (tag == null) {
    return NextResponse.json({
      ok: true,
      data: [],
      message: "该分类尚未在后台配置标签 ID",
    });
  }

  try {
    const list = await listAppleAccountsForShowcase(tag);
    return NextResponse.json({
      ok: true,
      data: list.map((a) => toPublicAccount(a)),
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "托管站请求失败";
    const message =
      raw === "SHOWCASE_APPLE_AUTO_NOT_CONFIGURED"
        ? "未配置托管接口（SHOWCASE_APPLE_AUTO_API_KEY，可选 SHOWCASE_APPLE_AUTO_BASE_URL）"
        : raw;
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
