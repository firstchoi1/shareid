import Image from "next/image";

import { FaqAccordionItems } from "@/components/faq/faq-content";
import { ShowcaseHome } from "@/components/showcase/showcase-client";
import { TutorialVideoEmbed } from "@/components/tutorial-video-embed";
import { TutorialWarningBanner } from "@/components/tutorial-warning-banner";
import type { SiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const XIANYU_MALL_URL = "https://www.luffyid.com/";

const XIANYU_SHOP_ITEMS = [
  { id: 1, title: "独享ID", link: "https://www.luffyid.com/?cat=appleid-exclusive", image: "/App_Store_(iOS).svg" },
  { id: 2, title: "共享ID", link: "https://www.luffyid.com/?cat=appleid-share", image: "/App_Store_(iOS).svg" },
  { id: 3, title: "小火箭", link: "https://www.luffyid.com/appleid-exclusive/shadowrocket?checkout=1", image: "/shadowrocket.png" },
  { id: 4, title: "AI充值", link: "https://www.luffyid.com/?cat=ai-pro", image: "/chatgpt.svg" },
  { id: 5, title: "小火箭网络", link: "https://www.luffyid.com/price-adjustment/ladder?checkout=1", image: "/ladder.svg" },
  { id: 6, title: "TikTok", link: "https://www.luffyid.com/?cat=tiktok", image: "/tiktok.svg" },
  { id: 7, title: "Twitter", link: "https://www.luffyid.com/?cat=twitter", image: "/twitter.svg" },
  { id: 8, title: "Gmail", link: "https://www.luffyid.com/?cat=google-gmail", image: "/gmail.svg" },
  { id: 9, title: "纸飞机", link: "https://www.luffyid.com/?cat=plane", image: "/tele.svg" },
];

function XianyuAppStoreOnlyWarningBanner() {
  return (
    <section className="overflow-hidden rounded-t-2xl bg-red-600 shadow-[0_8px_24px_rgba(220,38,38,0.22)]">
      <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-center text-sm font-bold text-white sm:px-6 sm:text-[15px]">
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.5 22.5 21H1.5L12 2.5z"
            fill="#facc15"
            stroke="#171717"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M12 8.2v5.2M12 16.3h.01"
            stroke="#171717"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="min-w-0 max-w-full leading-snug">只能在AppStore登录，绝不能在系统设置中登录！</span>
      </div>
    </section>
  );
}

function XianyuAccountTopContent() {
  return (
    <div className="overflow-hidden">
      <XianyuAppStoreOnlyWarningBanner />
    </div>
  );
}

function XianyuShopLinks() {
  return (
    <section className="rounded-2xl border border-white/70 bg-white/80 p-3 backdrop-blur-md ring-1 ring-slate-200/70 sm:p-4">
      <div className="mb-3 flex items-center gap-2 px-1 sm:gap-3">
        <p className="min-w-0 shrink-0 text-sm font-semibold text-slate-800 sm:text-[15px]">账号直通车</p>
        <div className="flex min-w-0 flex-1" />
        <a
          href={XIANYU_MALL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group relative inline-flex shrink-0 items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-600 transition",
            "hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700 sm:text-xs"
          )}
        >
          <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-indigo-300/35 blur-sm" />
          <span>更多好物尽在路飞商城 ➔</span>
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {XIANYU_SHOP_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 text-left",
              "transition duration-200 hover:-translate-y-1 hover:border-violet-400 hover:shadow-[0_10px_24px_rgba(139,92,246,0.22)] active:translate-y-0 active:scale-[0.995]"
            )}
          >
            <div className="flex min-h-[54px] items-center gap-1.5 px-1.5 py-1 sm:min-h-[68px] sm:gap-2 sm:px-2 sm:py-2">
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-9 sm:w-9">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <p className="line-clamp-2 pr-1 text-[11px] font-medium leading-snug text-slate-700 sm:text-sm">
                {item.title}
              </p>
            </div>
            <span
              className={cn(
                "pointer-events-none absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600",
                "opacity-0 translate-x-1 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:flex sm:right-2 sm:text-[11px]"
              )}
              aria-hidden
            >
              GO
              <span className="text-[11px]">➔</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function XianyuSiteHome({ config }: { config: SiteConfig }) {
  return (
    <main className="mx-auto min-h-full w-full max-w-2xl bg-transparent px-4 py-6 sm:px-6 sm:py-8">
      <div
        className={cn(
          "rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-200/60",
          "[&_summary]:px-3.5 [&_summary]:py-3 [&_summary]:sm:px-4 [&_summary]:sm:py-3.5",
          "[&_details>div]:px-3.5 [&_details>div]:py-3 [&_details>div]:sm:px-4 [&_details>div]:sm:py-4"
        )}
      >
        <TutorialWarningBanner purchaseUrl={config.purchaseUrl} />
        <TutorialVideoEmbed />
        <div className="p-3 sm:p-4 lg:p-5">
          <XianyuShopLinks />
        </div>
        <div className="grid grid-cols-1 items-start gap-3 p-3 sm:gap-4 sm:p-4 lg:p-5">
          <FaqAccordionItems />
        </div>
      </div>

      <ShowcaseHome
        purchaseUrl={config.purchaseUrl}
        regions={config.regions}
        redeemModeEnabled={config.redeemModeEnabled}
        stackAccountsBelow
        accountTopContent={<XianyuAccountTopContent />}
      />

      {config.showCreatorContact ? (
        <footer className="pb-3 pt-6 text-center text-sm font-medium text-slate-600 sm:pb-4 sm:text-base">
          分享页制作进Q群联系99号客服：1090466661
        </footer>
      ) : null}
    </main>
  );
}
