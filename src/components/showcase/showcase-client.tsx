"use client";

import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { copyFromInputElement, copyText, copyTextSync } from "@/lib/copy-text";
import { cn } from "@/lib/utils";

type RegionKey = "us" | "us_rocket" | "hk" | "jp" | "tw" | "cn";

const REGIONS: { key: RegionKey; label: string }[] = [
  { key: "us", label: "美区 ID" },
  { key: "us_rocket", label: "美区小火箭" },
  { key: "hk", label: "香港 ID" },
  { key: "jp", label: "日本 ID" },
  { key: "tw", label: "台湾 ID" },
  { key: "cn", label: "中国 ID" },
];

type AccountRow = {
  id: number;
  username: string;
  password: string;
  region_display: string | null;
  last_check: string | null;
  last_check_success: boolean | null;
};

function CheckStatusLine({ a }: { a: AccountRow }) {
  if (!a.last_check && a.last_check_success == null) {
    return <p className="mt-2 text-sm text-slate-500">暂无检测记录</p>;
  }
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm leading-snug">
      {a.last_check ? <span className="text-slate-700">{a.last_check}</span> : null}
      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
        正常
      </span>
    </p>
  );
}

export function ShowcaseHome({ children }: { children?: React.ReactNode }) {
  const [region, setRegion] = useState<RegionKey>("us");
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [passwordSheet, setPasswordSheet] = useState<{ id: number; password: string } | null>(
    null
  );
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (r: RegionKey) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/showcase/accounts?region=${encodeURIComponent(r)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: AccountRow[];
        message?: string;
      };
      if (!res.ok || !json.ok) {
        setRows([]);
        setHint(null);
        setError(json.message ?? "加载失败");
        return;
      }
      setRows(Array.isArray(json.data) ? json.data : []);
      setHint(json.message ?? null);
    } catch {
      setRows([]);
      setHint(null);
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(region);
  }, [region, load]);

  useEffect(() => {
    const t = window.setInterval(() => void load(region), 25_000);
    return () => window.clearInterval(t);
  }, [region, load]);

  useEffect(() => {
    if (!passwordSheet) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      const el = passwordInputRef.current;
      if (el) {
        el.focus();
        el.select();
        el.setSelectionRange(0, el.value.length);
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [passwordSheet]);

  const title = useMemo(() => REGIONS.find((x) => x.key === region)?.label ?? "", [region]);

  const flashCopied = useCallback((key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }, []);

  /** 账号：同步 execCommand 优先（适配 iOS Safari 手势要求） */
  const copyAccountUsername = useCallback(
    (accountId: number, username: string) => {
      const key = `u-${accountId}`;
      if (copyTextSync(username)) {
        flashCopied(key);
        return;
      }
      void copyText(username).then((ok) => {
        if (ok) {
          flashCopied(key);
        }
      });
    },
    [flashCopied]
  );

  /** 密码已在加载/刷新列表时拉取，点击时直接复制内存中的值 */
  const copyAccountPassword = useCallback(
    (accountId: number, password: string) => {
      const key = `p-${accountId}`;
      if (!password || password === "—") {
        setError("暂无密码，请等待列表加载完成");
        return;
      }
      setError(null);
      if (copyTextSync(password)) {
        flashCopied(key);
        return;
      }
      void copyText(password).then((ok) => {
        if (ok) {
          flashCopied(key);
          return;
        }
        setPasswordSheet({ id: accountId, password });
      });
    },
    [flashCopied]
  );

  const regionSwitcher = (
    <div className="mx-auto flex w-full max-w-2xl flex-wrap justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white/90 p-2 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm sm:gap-2 sm:p-2">
      {REGIONS.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => setRegion(r.key)}
          className={cn(
            "min-h-10 min-w-[5.75rem] touch-manipulation whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-medium transition sm:min-h-9 sm:min-w-[5.75rem] sm:flex-1 sm:px-4 sm:py-2 sm:text-sm",
            region === r.key
              ? "bg-gradient-to-r from-indigo-500 to-violet-600 font-semibold text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/30"
              : "border border-transparent bg-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );

  const purchaseCta = (
    <div className="mx-auto flex w-full max-w-2xl items-center justify-center gap-1.5 sm:gap-2.5">
      <div
        className="flex shrink-0 items-center -space-x-2.5 sm:-space-x-3"
        aria-hidden
      >
        {Array.from({ length: 5 }, (_, i) => (
          <ChevronRight
            key={i}
            className="size-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.45)] sm:size-6"
            strokeWidth={2.75}
          />
        ))}
      </div>
      <a
        href="https://xpp.iosid.icu/"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "min-w-0 flex-1 rounded-full border border-red-200 bg-white px-4 py-3.5 text-center text-base font-semibold text-red-600 shadow-sm ring-1 ring-red-100/90 sm:text-lg",
          "transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-[0.99]"
        )}
      >
        购买永久海外独享ID点我
      </a>
      <div
        className="flex shrink-0 items-center -space-x-2.5 sm:-space-x-3"
        aria-hidden
      >
        {Array.from({ length: 5 }, (_, i) => (
          <ChevronLeft
            key={i}
            className="size-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.45)] sm:size-6"
            strokeWidth={2.75}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端：地区切换 → 购买 CTA；手机端在 FAQ 下同样顺序 */}
      <div className="hidden md:flex md:flex-col md:gap-3">
        {regionSwitcher}
        {purchaseCta}
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-6 md:mt-5 md:grid md:grid-cols-2 md:items-start md:gap-5">
        <div className="flex min-w-0 flex-col gap-6">
          {children}
          <div className="flex flex-col gap-3 md:hidden">
            {regionSwitcher}
            {purchaseCta}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
        <section
          className={cn(
            "min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-200/60"
          )}
        >
          <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-3.5 text-center text-white shadow-sm sm:px-6 sm:py-4">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">{title}</h2>
          </div>

          <div className="p-3 sm:p-4 lg:p-5">
            {hint ? (
              <p className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 sm:text-[13px]">
                {hint}
              </p>
            ) : null}
            {error ? (
              <p className="mb-3 rounded-lg border border-rose-200/80 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {error}
              </p>
            ) : null}
            {loading && rows.length === 0 && !error ? (
              <div className="space-y-3 py-2">
                <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
                <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
              </div>
            ) : null}
            {!loading && rows.length === 0 && !error ? (
              <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                暂无账号或尚未配置标签。
              </p>
            ) : null}
            {rows.length > 0 ? (
              <ul className="space-y-3">
                {rows.map((a) => (
                  <li
                    key={a.id}
                    className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/80 shadow-sm ring-1 ring-slate-200/50"
                  >
                    <div className="flex min-w-0 items-start gap-3 p-3 sm:gap-3.5">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md ring-2 ring-white"
                        aria-hidden
                      >
                        <User className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs font-medium text-slate-500">账号</p>
                        <p className="mt-0.5 font-mono text-sm leading-snug text-slate-900 break-all">{a.username}</p>
                        <p className="mt-1.5 text-sm leading-snug text-slate-700">
                          账号信息：选择其他 不升级
                        </p>
                        <CheckStatusLine a={a} />
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-slate-200/90 bg-white/90 px-3 py-3 sm:px-3.5">
                      <button
                        type="button"
                        onClick={() => copyAccountUsername(a.id, a.username)}
                        className="min-h-10 flex-1 touch-manipulation rounded-[10px] bg-[#0071e3] px-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition hover:bg-[#0077ed] active:bg-[#0062c4]"
                      >
                        复制账号
                      </button>
                      <button
                        type="button"
                        onClick={() => copyAccountPassword(a.id, a.password)}
                        className="min-h-10 flex-1 touch-manipulation rounded-[10px] bg-[#34c759] px-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.14)] transition hover:bg-[#30b350] active:bg-[#28a745]"
                      >
                        复制密码
                      </button>
                    </div>
                    {copied === `u-${a.id}` || copied === `p-${a.id}` ? (
                      <p className="border-t border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-center text-[11px] font-medium text-emerald-800 sm:text-xs">
                        已复制
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
        </div>
      </div>

      {passwordSheet ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-sheet-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="关闭"
            onClick={() => setPasswordSheet(null)}
          />
          <div className="relative z-10 m-0 w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:m-4 sm:rounded-2xl">
            <p id="password-sheet-title" className="text-sm font-semibold text-slate-900">
              复制密码
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              若本机限制剪贴板，请在下方再点一次「复制密码」，或全选文本手动复制。
            </p>
            <input
              key={passwordSheet.id}
              ref={passwordInputRef}
              readOnly
              value={passwordSheet.password}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-base text-slate-900 outline-none"
              style={{ fontSize: "16px" }}
              onFocus={(e) => e.target.select()}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (copyFromInputElement(passwordInputRef.current)) {
                    flashCopied(`p-${passwordSheet.id}`);
                    setPasswordSheet(null);
                  }
                }}
                className="min-h-10 flex-1 rounded-[10px] bg-[#34c759] px-4 text-sm font-medium text-white shadow-sm"
              >
                复制密码
              </button>
              <button
                type="button"
                onClick={() => setPasswordSheet(null)}
                className="min-h-10 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
              >
                关闭
              </button>
            </div>
            {typeof navigator !== "undefined" &&
            typeof navigator.share === "function" ? (
              <button
                type="button"
                className="mt-2 w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-700"
                onClick={() => {
                  void navigator
                    .share({ text: passwordSheet.password })
                    .then(() => {
                      flashCopied(`p-${passwordSheet.id}`);
                      setPasswordSheet(null);
                    })
                    .catch(() => {
                      /* 用户取消分享 */
                    });
                }}
              >
                用系统分享发送密码
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
