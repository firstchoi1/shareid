"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";

const UNLOCK_AT_STORAGE_KEY = "shareid:tutorial-modal-unlock-at";

function clampCountdown(seconds: number) {
  return Math.max(0, Math.min(300, Math.floor(seconds || 0)));
}

export function TutorialVideoModal({
  purchaseUrl,
  countdownSeconds,
}: {
  purchaseUrl: string;
  countdownSeconds: number;
}) {
  const normalizedCountdown = clampCountdown(countdownSeconds);
  const [open, setOpen] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(normalizedCountdown);
  const [canClose, setCanClose] = useState(normalizedCountdown <= 0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cssAnimRef = useRef<HTMLDivElement>(null);
  const cssAnimBoundRef = useRef(false);
  const unlockAtRef = useRef<number | null>(null);

  const clearStoredDeadline = useCallback(() => {
    try {
      sessionStorage.removeItem(UNLOCK_AT_STORAGE_KEY);
    } catch {
      // Ignore storage failures on restricted browsers/webviews.
    }
  }, []);

  const syncCountdown = useCallback(() => {
    const unlockAt = unlockAtRef.current;
    if (unlockAt === null) {
      setSecondsLeft(0);
      setCanClose(true);
      return true;
    }

    const remainingMs = unlockAt - Date.now();
    if (remainingMs <= 0) {
      unlockAtRef.current = null;
      clearStoredDeadline();
      setSecondsLeft(0);
      setCanClose(true);
      return true;
    }

    setSecondsLeft(Math.ceil(remainingMs / 1000));
    setCanClose(false);
    return false;
  }, [clearStoredDeadline]);

  useEffect(() => {
    cssAnimBoundRef.current = false;

    if (normalizedCountdown <= 0) {
      unlockAtRef.current = null;
      clearStoredDeadline();
      setSecondsLeft(0);
      setCanClose(true);
      return;
    }

    let unlockAt = Date.now() + normalizedCountdown * 1000;
    try {
      const raw = sessionStorage.getItem(UNLOCK_AT_STORAGE_KEY);
      const stored = raw ? Number(raw) : Number.NaN;
      if (Number.isFinite(stored) && stored > Date.now()) {
        unlockAt = stored;
      } else {
        sessionStorage.setItem(UNLOCK_AT_STORAGE_KEY, String(unlockAt));
      }
    } catch {
      // Ignore storage failures on restricted browsers/webviews.
    }

    unlockAtRef.current = unlockAt;
    syncCountdown();

    const timer = window.setInterval(() => {
      if (syncCountdown()) {
        window.clearInterval(timer);
      }
    }, 250);

    const resume = () => {
      syncCountdown();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncCountdown();
      }
    };

    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("touchstart", resume, { passive: true });
    window.addEventListener("touchend", resume, { passive: true });
    window.addEventListener("orientationchange", resume);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("touchstart", resume);
      window.removeEventListener("touchend", resume);
      window.removeEventListener("orientationchange", resume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearStoredDeadline, normalizedCountdown, syncCountdown]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node || normalizedCountdown <= 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          syncCountdown();
        }
      },
      { threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [normalizedCountdown, syncCountdown]);

  useEffect(() => {
    if (cssAnimBoundRef.current || normalizedCountdown <= 0 || !cssAnimRef.current) {
      return;
    }
    cssAnimBoundRef.current = true;
    const elapsed = Math.max(0, normalizedCountdown - secondsLeft);
    cssAnimRef.current.style.animation = `tutorial-modal-countdown ${normalizedCountdown}s linear forwards`;
    cssAnimRef.current.style.animationDelay = `-${elapsed}s`;
  }, [normalizedCountdown, secondsLeft]);

  const handleClose = useCallback((event?: SyntheticEvent) => {
    event?.preventDefault();

    if (normalizedCountdown <= 0) {
      setOpen(false);
      return;
    }

    if (!syncCountdown()) {
      if (!syncCountdown()) {
        return;
      }
    }
    setOpen(false);
    unlockAtRef.current = null;
    clearStoredDeadline();
  }, [clearStoredDeadline, normalizedCountdown, syncCountdown]);

  if (!open) {
    return null;
  }

  const progress =
    normalizedCountdown > 0
      ? Math.min(
          100,
          Math.max(0, ((normalizedCountdown - secondsLeft) / normalizedCountdown) * 100)
        )
      : 100;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-2 backdrop-blur-[2px] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usage-warning-title"
    >
      <div className="max-h-[calc(100vh-1rem)] w-full max-w-[24rem] overflow-y-auto rounded-[26px] bg-white shadow-[0_25px_80px_rgba(15,23,42,0.35)] sm:max-h-[calc(100vh-2rem)] sm:max-w-md sm:rounded-[32px]">
        <div className="px-4 pb-4 pt-4 text-center sm:px-8 sm:pb-6 sm:pt-7">
          {normalizedCountdown > 0 && !canClose ? (
            <div
              ref={cssAnimRef}
              aria-hidden
              className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
              onAnimationEnd={syncCountdown}
            />
          ) : null}

          <h2
            id="usage-warning-title"
            className="text-[1.65rem] font-extrabold tracking-wide text-red-600 sm:text-[2.1rem]"
          >
            使用必读
          </h2>

          <div className="mt-3 space-y-2.5 text-left text-[14px] leading-7 text-slate-600 sm:mt-6 sm:space-y-4 sm:text-[15px] sm:leading-8">
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
            <p className="text-center text-[1.2rem] font-semibold leading-8 text-red-600 sm:text-[1.2rem] sm:leading-9">
              共享账号严禁借给朋友使用，若因朋友登录设置造成锁机后果自己承担
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-[18px] bg-[#0b0b0f] px-3 py-3 text-white sm:mt-6 sm:rounded-[22px] sm:px-4 sm:py-5">
            <div className="flex items-center gap-2.5">
              <Image
                src="/apple-settings.svg"
                alt="设置"
                width={40}
                height={40}
                className="size-10 rounded-2xl object-contain sm:size-12"
              />
              <div className="text-left">
                <p className="text-xs text-white/60 sm:text-sm">设置</p>
                <p className="text-[1.25rem] font-bold leading-tight text-white sm:text-[1.7rem]">
                  <span className="mr-2 text-[#ff7a45]">✕</span>
                  禁止登录设置！
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2.5 sm:mt-5">
              <Image
                src="/apple-store.svg"
                alt="App Store"
                width={40}
                height={40}
                className="size-10 rounded-2xl object-contain sm:size-12"
              />
              <div className="text-left">
                <p className="text-xs text-white/60 sm:text-sm">App Store</p>
                <p className="text-[1.25rem] font-bold leading-tight text-white sm:text-[1.7rem]">
                  <span className="mr-2 text-[#52c41a]">✓</span>
                  使用账号下载东西
                </p>
                <p className="text-[1.02rem] font-bold leading-tight text-white sm:text-[1.05rem]">只在 App Store 登录！</p>
              </div>
            </div>
          </div>

          {normalizedCountdown > 0 && !canClose ? (
            <div
              className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200 sm:mt-7"
              aria-hidden
            >
              <div
                className="h-full origin-left rounded-full bg-[#1677ff] transition-[width] duration-300 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleClose}
            onTouchEnd={handleClose}
            onPointerUp={handleClose}
            disabled={!canClose}
            aria-disabled={!canClose}
            className="mt-4 w-full touch-manipulation rounded-full px-6 py-3.5 text-[1rem] font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 enabled:bg-[#1677ff] enabled:shadow-[0_12px_28px_rgba(22,119,255,0.3)] enabled:hover:bg-[#0f67e6] sm:mt-7 sm:py-5 sm:text-[1.3rem]"
          >
            {canClose ? "我已知晓" : `请等待（${secondsLeft}秒）`}
          </button>
        </div>
      </div>
    </div>
  );
}
