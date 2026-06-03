"use client";

import { useState } from "react";

/** 与 `tutorial-video-modal` 内联配置保持一致（同源、同 BV / MP4） */
const VIDEO_SRC =
  typeof process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL === "string" &&
  process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_URL.trim()
    : "/tutorial.mp4";

const VIDEO_WEBM_SRC =
  typeof process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_WEBM_URL === "string" &&
  process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_WEBM_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_TUTORIAL_VIDEO_WEBM_URL.trim()
    : "";

const POSTER_URL =
  typeof process.env.NEXT_PUBLIC_TUTORIAL_POSTER_URL === "string" &&
  process.env.NEXT_PUBLIC_TUTORIAL_POSTER_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_TUTORIAL_POSTER_URL.trim()
    : "";

const BILIBILI_BVID_RAW = process.env.NEXT_PUBLIC_TUTORIAL_BILIBILI_BVID;
const BILIBILI_BVID =
  BILIBILI_BVID_RAW === ""
    ? ""
    : (BILIBILI_BVID_RAW?.trim() || "BV1XFQwBQEWZ");

const USE_SELF_HOSTED_VIDEO = VIDEO_SRC.length > 0 || VIDEO_WEBM_SRC.length > 0;
const USE_BILIBILI = !USE_SELF_HOSTED_VIDEO && BILIBILI_BVID.length > 0;

function bilibiliEmbedSrcInline(bvid: string) {
  const q = new URLSearchParams({
    bvid,
    page: "1",
    high_quality: "1",
    danmaku: "0",
    autoplay: "0",
  });
  return `https://player.bilibili.com/player.html?${q.toString()}`;
}

/**
 * 与首屏弹窗相同的教程源（B 站或 MP4/WebM），用于页面内嵌，默认不自动播放以免与弹窗同时出声。
 */
export function TutorialVideoEmbed() {
  const [videoReady, setVideoReady] = useState(false);

  return (
    <div className="relative min-h-[120px] bg-black">
      {!videoReady ? (
        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 bg-zinc-100 px-4 py-8 text-center">
          <div
            className="size-8 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600"
            aria-hidden
          />
          <p className="text-xs text-zinc-500">视频加载中…</p>
        </div>
      ) : null}
      {USE_BILIBILI ? (
        <div className="relative mx-auto aspect-video w-full bg-black">
          <iframe
            title="登录教程视频"
            src={bilibiliEmbedSrcInline(BILIBILI_BVID)}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setVideoReady(true)}
          />
        </div>
      ) : (
        <video
          className="aspect-video w-full object-contain"
          preload="metadata"
          playsInline
          controls
          poster={POSTER_URL || undefined}
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
  );
}
