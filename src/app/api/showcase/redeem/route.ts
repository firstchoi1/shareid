import { NextResponse } from "next/server";

import { listAppleAccountsForShowcase, type AppleAccount } from "@/lib/apple-auto-client";
import { activateAndResolveRedeemCode, describeRedeemCode } from "@/lib/redeem-codes";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!code) {
    return NextResponse.json({ ok: false, message: "请输入兑换码" }, { status: 400 });
  }

  try {
    const config = await getSiteConfig();
    const redeemCode = await activateAndResolveRedeemCode(code);
    const regionMap = new Map(config.regions.map((region) => [region.key, region]));
    const accounts: Array<
      AppleAccount & {
        accountLabel: string;
      }
    > = [];

    for (const binding of redeemCode.bindings) {
      const region = regionMap.get(binding.regionKey);
      if (!region || region.tagId == null) continue;
      const list = await listAppleAccountsForShowcase(region.tagId, {
        appleAutoBaseUrl: config.appleAutoBaseUrl,
        appleAutoApiKey: config.appleAutoApiKey,
      });
      const label = `${region.countryNote || region.label}账号`;
      accounts.push(
        ...list.slice(0, binding.count).map((account) => ({
          ...account,
          accountLabel: label,
        }))
      );
    }

    const desc = describeRedeemCode(redeemCode);
    return NextResponse.json({
      ok: true,
      data: {
        accounts,
        activatedAt: redeemCode.activatedAt,
        expiresAt: redeemCode.expiresAt,
        expiresText: desc.expiresText,
        status: desc.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "兑换失败" },
      { status: 400 }
    );
  }
}
