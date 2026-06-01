import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminCookieName, isAdminSessionToken } from "@/lib/admin-auth";
import { getSiteConfig, saveSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const cookieStore = await cookies();
  return isAdminSessionToken(cookieStore.get(getAdminCookieName())?.value);
}

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, message: "未登录后台" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, data: await getSiteConfig() });
}

export async function PUT(request: Request) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, message: "未登录后台" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "配置格式错误" }, { status: 400 });
  }

  const saved = await saveSiteConfig(body as Parameters<typeof saveSiteConfig>[0]);
  return NextResponse.json({ ok: true, data: saved });
}
