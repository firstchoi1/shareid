"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

const COUNTDOWN_SEC = 20;

export function TutorialVideoModal({ purchaseUrl }: { purchaseUrl: string }) {
  const [open, setOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SEC);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    let remaining = COUNTDOWN_SEC;
    const timer = window.setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        setCanClose(true);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const handleClose = useCallback(() => {
    if (!canClose) {
      return;
    }
    setOpen(false);
  }, [canClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usage-warning-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-[0_25px_80px_rgba(15,23,42,0.35)]">
        <div className="px-6 pb-5 pt-7 text-center sm:px-8 sm:pb-6">
          <h2
            id="usage-warning-title"
            className="text-3xl font-extrabold tracking-wide text-red-600 sm:text-[2.25rem]"
          >
            使用必读
          </h2>

          <div className="mt-6 space-y-4 text-left text-[15px] leading-8 text-slate-600 sm:text-[16px]">
            <p>
              <span className="font-semibold text-red-600">共享ID为多人共用，存在较高风险。</span>
              如被他人利用，可能导致设备被锁、个人信息泄露及财产损失。
            </p>
            <p>
              只可以在 <span className="font-semibold text-slate-800">App Store 商店</span> 登录下载，
              <span className="font-semibold text-red-600">禁止登录设置</span>，以防被恶意锁机。
            </p>
            <p>
              为保障您的账号与设备安全，建议购买独享ID使用。
              <a
                href={purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 inline-flex rounded-xl bg-[#1677ff] px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f67e6]"
              >
                点我购买独享ID
              </a>
              一人一号。
            </p>
            <p className="text-center text-lg font-semibold leading-9 text-red-600 sm:text-[1.35rem]">
              共享账号严禁出借给朋友使用，若因你的朋友登录设置造成锁机后果你自己承担
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[22px] bg-[#0b0b0f] px-4 py-5 text-white">
            <div className="flex items-center gap-3">
              <Image
                src="/apple-settings.svg"
                alt="设置"
                width={48}
                height={48}
                className="size-12 rounded-2xl object-contain"
              />
              <div className="text-left">
                <p className="text-sm text-white/60">设置</p>
                <p className="text-2xl font-bold text-white">
                  <span className="mr-2 text-[#ff7a45]">✕</span>
                  禁止登录设置！
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Image
                src="/apple-store.svg"
                alt="App Store"
                width={48}
                height={48}
                className="size-12 rounded-2xl object-contain"
              />
              <div className="text-left">
                <p className="text-sm text-white/60">App Store</p>
                <p className="text-2xl font-bold text-white">
                  <span className="mr-2 text-[#52c41a]">✓</span>
                  使用账号下载东西
                </p>
                <p className="text-xl font-bold text-white">只在 App Store 登录！</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={!canClose}
            className="mt-7 w-full rounded-full px-6 py-5 text-2xl font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 enabled:bg-[#1677ff] enabled:shadow-[0_12px_28px_rgba(22,119,255,0.3)] enabled:hover:bg-[#0f67e6]"
          >
            {canClose ? "我已知晓" : `请等待（${secondsLeft}秒）`}
          </button>
        </div>
      </div>
    </div>
  );
}
