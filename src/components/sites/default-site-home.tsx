import { FaqAccordionItems } from "@/components/faq/faq-content";
import { ShowcaseHome } from "@/components/showcase/showcase-client";
import { TutorialVideoEmbed } from "@/components/tutorial-video-embed";
import { TutorialVideoModal } from "@/components/tutorial-video-modal";
import { TutorialWarningBanner } from "@/components/tutorial-warning-banner";
import type { SiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function DefaultSiteHome({
  config,
  stackAccountsBelow = false,
}: {
  config: SiteConfig;
  stackAccountsBelow?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto min-h-full w-full max-w-3xl bg-transparent px-4 py-6 sm:px-6 sm:py-8 md:max-w-5xl lg:max-w-6xl"
      )}
    >
      <ShowcaseHome
        purchaseUrl={config.purchaseUrl}
        regions={config.regions}
        redeemModeEnabled={config.redeemModeEnabled}
        stackAccountsBelow={stackAccountsBelow}
      >
        <TutorialVideoModal
          purchaseUrl={config.purchaseUrl}
          countdownSeconds={config.modalCountdownSeconds}
        />
        <div
          className={cn(
            "rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-200/60",
            "[&_summary]:px-3.5 [&_summary]:py-3 [&_summary]:sm:px-4 [&_summary]:sm:py-3.5",
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

      {config.showCreatorContact ? (
        <footer className="pb-3 pt-6 text-center text-sm font-medium text-slate-600 sm:pb-4 sm:text-base">
          分享页制作进Q群联系99号客服：1090466661
        </footer>
      ) : null}
    </main>
  );
}
