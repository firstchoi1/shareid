"use client";

import { useEffect, useRef, useState } from "react";

export function TutorialWarningBanner({ purchaseUrl }: { purchaseUrl: string }) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      setBannerHeight(bannerRef.current?.offsetHeight ?? 0);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const bannerContent = (
    <div className="px-4 py-4 text-center sm:px-6">
      <p className="bg-pink-100 px-3 py-1 text-lg font-bold text-red-700 shadow-sm sm:text-2xl">
        ID账号密码在教程最下边
      </p>
      <div className="mt-3 space-y-2 text-base font-bold leading-8 text-red-600 sm:text-[1.7rem] sm:leading-[1.8]">
        <p>共享ID为多人共用，存在较高风险。可能被骗子利用，导致设备被锁、个人信息泄露。</p>
        <p className="text-yellow-200 [text-shadow:0_2px_8px_rgba(8,47,73,0.35)]">
          强烈建议购买属于自己的独享id。
        </p>
      </div>
      <a
        href={purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-full bg-[#0d6efd] px-8 py-3 text-xl font-bold text-white shadow-[0_12px_24px_rgba(13,110,253,0.28)] transition hover:bg-[#0b5ed7]"
      >
        点我购买独享id
      </a>
    </div>
  );

  return (
    <>
      <div
        className="md:hidden"
        style={{ height: bannerHeight > 0 ? bannerHeight + 12 : undefined }}
        aria-hidden
      />
      <section
        ref={bannerRef}
        className="fixed left-1/2 top-3 z-40 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 overflow-hidden rounded-xl border border-cyan-200/80 bg-gradient-to-br from-sky-300 via-cyan-300 to-teal-300 shadow-[0_10px_30px_rgba(14,116,144,0.28)] ring-1 ring-cyan-200/80 md:hidden"
      >
        {bannerContent}
      </section>
      <section className="hidden overflow-hidden rounded-xl border border-cyan-200/80 bg-gradient-to-br from-sky-300 via-cyan-300 to-teal-300 shadow-[0_10px_30px_rgba(14,116,144,0.2)] ring-1 ring-cyan-200/80 md:block">
        {bannerContent}
      </section>
    </>
  );
}
