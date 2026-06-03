import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminCookieName, isAdminSessionToken } from "@/lib/admin-auth";
import { deleteRedeemCode, updateRedeemCode } from "@/lib/redeem-codes";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const cookieStore = await cookies();
  return isAdminSessionToken(cookieStore.get(getAdminCookieName())?.value);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, message: "未登录后台" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  try {
    const item = await updateRedeemCode(id, (body ?? {}) as { enabled?: boolean; note?: string });
    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "更新兑换码失败" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ ok: false, message: "未登录后台" }, { status: 401 });
  }

  const { id } = await context.params;
  await deleteRedeemCode(id);
  return NextResponse.json({ ok: true });
}
