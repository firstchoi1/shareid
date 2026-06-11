import { DefaultSiteHome } from "@/components/sites/default-site-home";
import { XianyuSiteHome } from "@/components/sites/xianyu-site-home";
import { resolveCurrentSiteIdentity } from "@/lib/current-site";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [config, site] = await Promise.all([getSiteConfig(), resolveCurrentSiteIdentity()]);

  if (site.siteKey === "xianyu") {
    return <XianyuSiteHome config={config} />;
  }

  return <DefaultSiteHome config={config} />;
}
