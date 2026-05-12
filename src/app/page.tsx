import { FaqAccordionItems } from "@/components/faq/faq-content";
import { ShowcaseHome } from "@/components/showcase/showcase-client";
import { TutorialVideoEmbed } from "@/components/tutorial-video-embed";
import { TutorialVideoModal } from "@/components/tutorial-video-modal";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main
      className={cn(
        "mx-auto min-h-full w-full max-w-3xl px-4 py-6 md:max-w-5xl lg:max-w-6xl sm:px-6 sm:py-8",
        "bg-transparent"
      )}
    >
      <ShowcaseHome>
        <TutorialVideoModal />
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-200/60",
            "[&_summary]:py-3 [&_summary]:sm:py-3.5",
            "[&_summary]:px-3.5 [&_summary]:sm:px-4",
            "[&_details>div]:px-3.5 [&_details>div]:py-3 [&_details>div]:sm:px-4 [&_details>div]:sm:py-4"
          )}
        >
          <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-4 text-center text-white shadow-sm sm:px-6 sm:py-4">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">登录教程视频</h2>
          </div>

          <TutorialVideoEmbed />

          <div className="grid grid-cols-1 items-start gap-3 p-3 sm:gap-4 sm:p-4 lg:p-5">
            <FaqAccordionItems />
          </div>
        </div>
      </ShowcaseHome>
    </main>
  );
}
