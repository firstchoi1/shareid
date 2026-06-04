import { cookies } from "next/headers";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import {
  getAdminCookieName,
  isAdminSessionToken,
  isUsingDefaultAdminPassword,
} from "@/lib/admin-auth";
import { getSiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const loggedIn = isAdminSessionToken(cookieStore.get(getAdminCookieName())?.value);

  return (
    <main
      className={cn(
        "min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_22%,#ffffff_100%)]",
        "text-slate-900"
      )}
    >
      {loggedIn ? (
        <AdminDashboard initialConfig={await getSiteConfig()} />
      ) : (
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <AdminLogin usingDefaultPassword={isUsingDefaultAdminPassword()} />
        </div>
      )}
    </main>
  );
}
