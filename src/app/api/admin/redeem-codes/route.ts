import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminCookieName, isAdminSessionToken } from "@/lib/admin-auth";
import { createRedeemCodesBatch, listRedeemCodes } from "@/lib/redeem-codes";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const cookieStore = await cookies();
  return isAdminSessionToken(cookieStore.get(getAdminCookieName())?.value);
}

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, message: "未登录后台" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, data: await listRedeemCodes() });
}

export async function POST(request: Request) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, message: "未登录后台" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  try {
    const config = await getSiteConfig();
    const created = await createRedeemCodesBatch(
      body as Parameters<typeof createRedeemCodesBatch>[0],
      config.regions
    );
    return NextResponse.json({ ok: true, data: created });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "生成兑换码失败" },
      { status: 400 }
    );
  }
}
