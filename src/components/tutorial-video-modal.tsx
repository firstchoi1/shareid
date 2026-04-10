"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "shareid_tutorial_video_seen";
const COUNTDOWN_SEC = 5;

/** 构建时注入；可设为 CDN 全路径以加速国内/海外访问 */
const VIDEO_SRC =
  typeof process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL === "string" &&
  process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL.trim()
    : "/tutorial.mp4";

/** 可选：体积更小的 WebM，浏览器会优先选用（需自行用 ffmpeg 转出并上传同 CDN） */
const VIDEO_WEBM_SRC =
  typeof process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_WEBM_URL === "string" &&
  process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_WEBM_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_WEBM_URL.trim()
    : "";

/** 可选：封面图，弹窗打开即有画面，减轻「黑屏等加载」体感 */
const POSTER_URL =
  typeof process.env.NEXT_PUBLIC_TUTORIAL_POSTER_URL === "string" &&
  process.env.NEXT_PUBLIC_TUTORIAL_POSTER_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_TUTORIAL_POSTER_URL.trim()
    : "";

/**
 * 哔哩哔哩稿件 BV 号（嵌入 player.bilibili.com，国内访问通常比自托管 mp4 更顺）。
 * 设为空字符串可改回仅用下方 MP4/WebM。
 * 默认：用户提供的 https://b23.tv/4qetUhH → BV1XFQwBQEWZ
 */
const BILIBILI_BVID_RAW = process.env.NEXT_PUBLIC_TUTORIAL_BILIBILI_BVID;
const BILIBILI_BVID =
  BILIBILI_BVID_RAW === ""
    ? ""
    : (BILIBILI_BVID_RAW?.trim() || "BV1XFQwBQEWZ");

const USE_BILIBILI = BILIBILI_BVID.length > 0;

function bilibiliEmbedSrc(bvid: string) {
  const q = new URLSearchParams({
    bvid,
    page: "1",
    high_quality: "1",
    danmaku: "0",
    autoplay: "1",
  });
  return `https://player.bilibili.com/player.html?${q.toString()}`;
}

export function TutorialVideoModal() {
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SEC);
  const [canClose, setCanClose] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        if (USE_BILIBILI) {
          const origins = ["https://player.bilibili.com", "https://www.bilibili.com"];
          for (const href of origins) {
            if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
              const pre = document.createElement("link");
              pre.rel = "preconnect";
              pre.href = href;
              document.head.appendChild(pre);
            }
          }
        } else {
          try {
            const primarySrc = VIDEO_WEBM_SRC || VIDEO_SRC;
            const u = new URL(primarySrc, window.location.href);
            if (u.origin !== window.location.origin) {
              const preId = "data-shareid-preconnect-tutorial";
              if (!document.querySelector(`link[${preId}]`)) {
                const pre = document.createElement("link");
                pre.rel = "preconnect";
                pre.href = u.origin;
                pre.crossOrigin = "anonymous";
                pre.setAttribute(preId, "");
                document.head.appendChild(pre);
              }
            }
          } catch {
            /* ignore */
          }

          const existing = document.querySelector(`link[data-shareid-preload-tutorial="1"]`);
          if (!existing) {
            const link = document.createElement("link");
            link.rel = "preload";
            link.href = VIDEO_WEBM_SRC || VIDEO_SRC;
            link.as = "video";
            link.type = VIDEO_WEBM_SRC ? "video/webm" : "video/mp4";
            link.setAttribute("data-shareid-preload-tutorial", "1");
            document.head.appendChild(link);
          }
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage 仅客户端可读，需在挂载后与 SSR 首屏对齐后再打开
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 弹窗每次打开时重置倒计时与关闭权限
    setSecondsLeft(COUNTDOWN_SEC);
    setCanClose(false);
    let n = COUNTDOWN_SEC;
    const id = window.setInterval(() => {
      n -= 1;
      setSecondsLeft(n);
      if (n <= 0) {
        window.clearInterval(id);
        setCanClose(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 与弹窗打开同步重置，避免显示旧状态
      setVideoReady(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (!canClose) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, [canClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-video-title"
    >
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <h2 id="tutorial-video-title" className="text-base font-semibold text-white sm:text-lg">
            登录教程
          </h2>
        </div>
        <div className="border-b border-amber-500/25 bg-amber-950/40 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-amber-100 sm:text-base">获取共享ID登录教程提示：</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-50/95 sm:text-[15px]">
            不能登录设备，使用之前必看视频，登录教程，避免登录错误
          </p>
        </div>
        <div className="relative min-h-[120px] bg-black">
          {!videoReady ? (
            <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 bg-black/80 px-4 py-8 text-center">
              <div className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
              <p className="text-xs text-zinc-400">视频加载中…</p>
            </div>
          ) : null}
          {USE_BILIBILI ? (
            <div className="relative mx-auto aspect-video w-full max-h-[min(70vh,720px)] bg-black">
              <iframe
                title="苹果登录教程"
                src={bilibiliEmbedSrc(BILIBILI_BVID)}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setVideoReady(true)}
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              className="max-h-[min(70vh,720px)] w-full object-contain"
              preload="auto"
              playsInline
              autoPlay
              muted
              controls
              poster={POSTER_URL || undefined}
              // @ts-expect-error React 19：提示浏览器优先下载该资源
              fetchPriority="high"
              onCanPlay={() => setVideoReady(true)}
              onLoadedData={() => setVideoReady(true)}
              onError={() => setVideoReady(true)}
            >
              {VIDEO_WEBM_SRC ? <source src={VIDEO_WEBM_SRC} type="video/webm" /> : null}
              <source src={VIDEO_SRC} type="video/mp4" />
              您的浏览器不支持视频播放。
            </video>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5">
          <span className="text-sm tabular-nums text-zinc-300" aria-live="polite">
            {canClose ? "可以关闭" : `请观看 ${secondsLeft} 秒后可关闭`}
          </span>
          <button
            type="button"
            onClick={handleClose}
            disabled={!canClose}
            className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
