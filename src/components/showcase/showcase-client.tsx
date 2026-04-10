"use client";

import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { copyText } from "@/lib/copy-text";
import { cn } from "@/lib/utils";

type RegionKey = "us" | "hk" | "jp" | "tw" | "cn";

const REGIONS: { key: RegionKey; label: string }[] = [
  { key: "us", label: "美区 ID" },
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
      {a.last_check_success === true ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
          正常
        </span>
      ) : a.last_check_success === false ? (
        <span className="inline-flex shrink-0 items-center rounded-md border-2 border-red-500 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
          检测未通过
        </span>
      ) : null}
    </p>
  );
}

export function ShowcaseHome({ children }: { children?: React.ReactNode }) {
  const [region, setRegion] = useState<RegionKey>("us");
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const title = useMemo(() => REGIONS.find((x) => x.key === region)?.label ?? "", [region]);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback(async (key: string, value: string) => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    }
  }, []);

  const regionSwitcher = (
    <div className="mx-auto flex w-full max-w-2xl flex-wrap justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white/90 p-2 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm sm:gap-2 sm:p-2">
      {REGIONS.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => setRegion(r.key)}
          className={cn(
            "min-h-10 min-w-[4.25rem] touch-manipulation rounded-xl px-3 py-2.5 text-xs font-medium transition sm:min-h-9 sm:min-w-0 sm:flex-1 sm:px-4 sm:py-2 sm:text-sm",
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
                        onClick={() => void handleCopy(`u-${a.id}`, a.username)}
                        className="min-h-10 flex-1 touch-manipulation rounded-[10px] bg-[#0071e3] px-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition hover:bg-[#0077ed] active:bg-[#0062c4]"
                      >
                        复制账号
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopy(`p-${a.id}`, a.password)}
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
    </>
  );
}
