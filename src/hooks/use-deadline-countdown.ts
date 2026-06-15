"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const UNLOCK_AT_STORAGE_KEY = "shareid:tutorial-modal-unlock-at";

export type CountdownSnapshot = {
  secondsLeft: number;
  canClose: boolean;
};

function clampCountdown(seconds: number) {
  return Math.max(0, Math.min(300, Math.floor(seconds || 0)));
}

function readSnapshot(unlockAt: number | null): CountdownSnapshot {
  if (unlockAt === null) {
    return { secondsLeft: 0, canClose: true };
  }

  const remainingMs = unlockAt - Date.now();
  if (remainingMs <= 0) {
    return { secondsLeft: 0, canClose: true };
  }

  return {
    secondsLeft: Math.ceil(remainingMs / 1000),
    canClose: false,
  };
}

type CountdownStore = {
  totalSeconds: number;
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => CountdownSnapshot;
  getServerSnapshot: () => CountdownSnapshot;
  canCloseNow: () => boolean;
  syncNow: () => void;
  clear: () => void;
};

function createCountdownStore(countdownSeconds: number): CountdownStore {
  const totalSeconds = clampCountdown(countdownSeconds);
  let unlockAt: number | null = null;
  let listeners = new Set<() => void>();
  let stopped = false;
  let rafId = 0;
  let intervalId = 0;
  let timeoutId = 0;
  let cachedSnapshot: CountdownSnapshot = { secondsLeft: 0, canClose: true };

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const clearStorage = () => {
    try {
      sessionStorage.removeItem(UNLOCK_AT_STORAGE_KEY);
    } catch {
      // 隐私模式 / 部分 WebView 可能不可用
    }
  };

  const stopTickers = () => {
    stopped = true;
    window.cancelAnimationFrame(rafId);
    window.clearInterval(intervalId);
    window.clearTimeout(timeoutId);
    rafId = 0;
    intervalId = 0;
    timeoutId = 0;
  };

  const finishIfDue = () => {
    if (unlockAt === null || Date.now() < unlockAt) {
      return false;
    }
    unlockAt = null;
    clearStorage();
    stopTickers();
    return true;
  };

  const getSnapshot = () => {
    finishIfDue();
    const next = readSnapshot(unlockAt);
    if (
      next.secondsLeft === cachedSnapshot.secondsLeft &&
      next.canClose === cachedSnapshot.canClose
    ) {
      return cachedSnapshot;
    }
    cachedSnapshot = next;
    return cachedSnapshot;
  };

  const syncNow = () => {
    if (stopped && unlockAt === null) {
      return;
    }
    stopped = false;
    finishIfDue();
    emit();
  };

  const tickRaf = () => {
    if (stopped) {
      return;
    }
    syncNow();
    if (!stopped) {
      rafId = window.requestAnimationFrame(tickRaf);
    }
  };

  const scheduleTimeout = () => {
    if (stopped) {
      return;
    }
    timeoutId = window.setTimeout(() => {
      syncNow();
      if (!stopped) {
        scheduleTimeout();
      }
    }, 250);
  };

  const startTickers = () => {
    if (unlockAt === null) {
      return;
    }
    stopped = false;
    syncNow();
    if (stopped) {
      return;
    }
    if (!rafId && document.visibilityState !== "hidden") {
      rafId = window.requestAnimationFrame(tickRaf);
    }
    if (!intervalId) {
      intervalId = window.setInterval(syncNow, 1000);
    }
    if (!timeoutId) {
      scheduleTimeout();
    }
  };

  const resume = () => {
    if (unlockAt === null) {
      return;
    }
    stopped = false;
    syncNow();
    if (stopped) {
      return;
    }
    if (document.visibilityState === "hidden") {
      return;
    }
    if (!rafId) {
      rafId = window.requestAnimationFrame(tickRaf);
    }
    if (!intervalId) {
      intervalId = window.setInterval(syncNow, 1000);
    }
    if (!timeoutId) {
      scheduleTimeout();
    }
  };

  if (totalSeconds <= 0) {
    unlockAt = null;
    cachedSnapshot = { secondsLeft: 0, canClose: true };
  } else {
    try {
      const stored = sessionStorage.getItem(UNLOCK_AT_STORAGE_KEY);
      const storedAt = stored ? Number(stored) : Number.NaN;
      if (Number.isFinite(storedAt) && storedAt > Date.now()) {
        unlockAt = storedAt;
      } else {
        unlockAt = Date.now() + totalSeconds * 1000;
        sessionStorage.setItem(UNLOCK_AT_STORAGE_KEY, String(unlockAt));
      }
    } catch {
      unlockAt = Date.now() + totalSeconds * 1000;
    }
    cachedSnapshot = readSnapshot(unlockAt);
  }

  const passive = { passive: true } as AddEventListenerOptions;
  const scrollCapture = { passive: true, capture: true } as AddEventListenerOptions;

  const subscribe = (onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    if (listeners.size === 1) {
      startTickers();

      window.addEventListener("focus", resume);
      window.addEventListener("pageshow", resume);
      window.addEventListener("touchstart", resume, passive);
      window.addEventListener("touchmove", resume, passive);
      window.addEventListener("touchend", resume, passive);
      window.addEventListener("pointerdown", resume, passive);
      window.addEventListener("pointerup", resume, passive);
      window.addEventListener("click", resume, passive);
      window.addEventListener("scroll", resume, scrollCapture);
      window.addEventListener("orientationchange", resume);
      window.addEventListener("resize", resume);
      document.addEventListener("visibilitychange", resume);
    }

    return () => {
      listeners.delete(onStoreChange);
      if (listeners.size === 0) {
        stopTickers();
        window.removeEventListener("focus", resume);
        window.removeEventListener("pageshow", resume);
        window.removeEventListener("touchstart", resume, passive);
        window.removeEventListener("touchmove", resume, passive);
        window.removeEventListener("touchend", resume, passive);
        window.removeEventListener("pointerdown", resume, passive);
        window.removeEventListener("pointerup", resume, passive);
        window.removeEventListener("click", resume, passive);
        window.removeEventListener("scroll", resume, scrollCapture);
        window.removeEventListener("orientationchange", resume);
        window.removeEventListener("resize", resume);
        document.removeEventListener("visibilitychange", resume);
      }
    };
  };

  return {
    totalSeconds,
    subscribe,
    getSnapshot,
    getServerSnapshot: () =>
      totalSeconds <= 0
        ? { secondsLeft: 0, canClose: true }
        : { secondsLeft: totalSeconds, canClose: false },
    canCloseNow: () => {
      finishIfDue();
      return unlockAt === null || Date.now() >= unlockAt;
    },
    syncNow,
    clear: () => {
      unlockAt = null;
      clearStorage();
      stopTickers();
      cachedSnapshot = { secondsLeft: 0, canClose: true };
      emit();
    },
  };
}

export function useDeadlineCountdown(countdownSeconds: number) {
  const storeRef = useRef<CountdownStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createCountdownStore(countdownSeconds);
  }
  const store = storeRef.current;

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  const canCloseNow = useCallback(() => store.canCloseNow(), [store]);
  const syncNow = useCallback(() => store.syncNow(), [store]);
  const clear = useCallback(() => store.clear(), [store]);

  const elapsedSeconds = Math.max(0, store.totalSeconds - snapshot.secondsLeft);

  return {
    secondsLeft: snapshot.secondsLeft,
    canClose: snapshot.canClose,
    totalSeconds: store.totalSeconds,
    elapsedSeconds,
    canCloseNow,
    syncNow,
    clear,
  };
}
