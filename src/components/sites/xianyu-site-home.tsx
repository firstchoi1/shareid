import { DefaultSiteHome } from "@/components/sites/default-site-home";
import type { SiteConfig } from "@/lib/site-config";

export function XianyuSiteHome({ config }: { config: SiteConfig }) {
  return <DefaultSiteHome config={config} />;
}
