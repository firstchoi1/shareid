import { FaqAccordionItems } from "@/components/faq/faq-content";
import { ShowcaseHome } from "@/components/showcase/showcase-client";
import { TutorialVideoEmbed } from "@/components/tutorial-video-embed";
import { TutorialVideoModal } from "@/components/tutorial-video-modal";
import { TutorialWarningBanner } from "@/components/tutorial-warning-banner";
import { getSiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getSiteConfig();

  return (
    <main
      className={cn(
        "mx-auto min-h-full w-full max-w-3xl px-4 py-6 md:max-w-5xl lg:max-w-6xl sm:px-6 sm:py-8",
        "bg-transparent"
      )}
    >
      <ShowcaseHome
        purchaseUrl={config.purchaseUrl}
        regions={config.regions}
        redeemModeEnabled={config.redeemModeEnabled}
      >
        <TutorialVideoModal purchaseUrl={config.purchaseUrl} />
        <div
          className={cn(
            "rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-200/60",
            "[&_summary]:py-3 [&_summary]:sm:py-3.5",
            "[&_summary]:px-3.5 [&_summary]:sm:px-4",
            "[&_details>div]:px-3.5 [&_details>div]:py-3 [&_details>div]:sm:px-4 [&_details>div]:sm:py-4"
          )}
        >
          <TutorialWarningBanner purchaseUrl={config.purchaseUrl} />
          <TutorialVideoEmbed />

          <div className="grid grid-cols-1 items-start gap-3 p-3 sm:gap-4 sm:p-4 lg:p-5">
            <FaqAccordionItems />
          </div>
        </div>
      </ShowcaseHome>
      <footer className="pb-3 pt-6 text-center text-sm font-medium text-slate-600 sm:pb-4 sm:text-base">
        分享页制作联系Q：3668514531
      </footer>
    </main>
  );
}
