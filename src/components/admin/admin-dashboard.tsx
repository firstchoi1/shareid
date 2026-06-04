"use client";

import {
  Copy,
  LayoutDashboard,
  Plus,
  Save,
  Tags,
  Ticket,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { RedeemCodeItem } from "@/lib/redeem-codes";
import type { SiteConfig, ShowcaseRegionConfig } from "@/lib/site-config";
import { durationText, formatShanghaiTime } from "@/lib/time";

type AdminTab = "overview" | "regions" | "redeem";

type RedeemBindingDraft = {
  regionKey: string;
  count: number;
};

type RedeemBatchForm = {
  quantity: number;
  prefix: string;
  durationType: "day" | "month" | "year" | "forever";
  durationValue: number;
  note: string;
  bindings: RedeemBindingDraft[];
};

const TAB_ITEMS: Array<{
  key: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: "overview", label: "总览", icon: LayoutDashboard },
  { key: "regions", label: "分类标签配置", icon: Tags },
  { key: "redeem", label: "兑换码管理", icon: Ticket },
];

const REDEEM_BATCH_FORM_STORAGE_KEY = "shareid-admin-redeem-batch-form";

function RedeemStatus({ item }: { item: RedeemCodeItem }) {
  if (!item.enabled) return <span className="text-rose-600">已禁用</span>;
  if (!item.activatedAt) return <span className="text-amber-600">未激活</span>;
  if (!item.expiresAt) return <span className="text-emerald-600">永久有效</span>;
  return new Date(item.expiresAt).getTime() > Date.now() ? (
    <span className="text-emerald-600">生效中</span>
  ) : (
    <span className="text-rose-600">已过期</span>
  );
}

function createRegionDraft(index: number): ShowcaseRegionConfig {
  return {
    key: `region_${index + 1}`,
    label: "新分类",
    tagId: null,
    countryNote: "新地区",
  };
}

function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white px-6 py-6 shadow-[0_10px_40px_rgba(148,163,184,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[1.75rem] font-extrabold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function getRedeemDurationLabel(item: RedeemCodeItem) {
  if (!item.activatedAt) {
    return durationText(item.durationType, item.durationValue);
  }

  if (!item.expiresAt) {
    return "永久有效";
  }

  return `${formatShanghaiTime(item.expiresAt)} 到期`;
}

export function AdminDashboard({ initialConfig }: { initialConfig: SiteConfig }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [config, setConfig] = useState(initialConfig);
  const [savingTab, setSavingTab] = useState<AdminTab | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<RedeemCodeItem[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [lastGeneratedCodes, setLastGeneratedCodes] = useState<string[]>([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [redeemPage, setRedeemPage] = useState(1);
  const [batchForm, setBatchForm] = useState<RedeemBatchForm>({
    quantity: 10,
    prefix: "",
    durationType: "month",
    durationValue: 1,
    note: "",
    bindings: [{ regionKey: initialConfig.regions[0]?.key ?? "us", count: 1 }],
  });

  const regionOptions = useMemo(
    () => config.regions.map((region) => ({ value: region.key, label: region.label })),
    [config.regions]
  );

  const redeemPageSize = 30;
  const redeemPageCount = Math.max(1, Math.ceil(codes.length / redeemPageSize));
  const pagedCodes = useMemo(
    () => codes.slice((redeemPage - 1) * redeemPageSize, redeemPage * redeemPageSize),
    [codes, redeemPage]
  );

  useEffect(() => {
    void (async () => {
      setCodesLoading(true);
      try {
        const res = await fetch("/api/admin/redeem-codes", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as { data?: RedeemCodeItem[] };
        setCodes(Array.isArray(json.data) ? json.data : []);
      } finally {
        setCodesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REDEEM_BATCH_FORM_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<RedeemBatchForm>;
      setBatchForm((prev) => ({
        ...prev,
        quantity: typeof parsed.quantity === "number" && parsed.quantity > 0 ? parsed.quantity : prev.quantity,
        durationType:
          parsed.durationType === "day" ||
          parsed.durationType === "month" ||
          parsed.durationType === "year" ||
          parsed.durationType === "forever"
            ? parsed.durationType
            : prev.durationType,
        durationValue:
          typeof parsed.durationValue === "number" && parsed.durationValue > 0
            ? parsed.durationValue
            : prev.durationValue,
        note: typeof parsed.note === "string" ? parsed.note : prev.note,
        bindings:
          Array.isArray(parsed.bindings) && parsed.bindings.length > 0
            ? parsed.bindings
                .filter(
                  (item): item is RedeemBindingDraft =>
                    !!item &&
                    typeof item.regionKey === "string" &&
                    item.regionKey.trim() !== "" &&
                    typeof item.count === "number" &&
                    item.count > 0
                )
                .map((item) => ({ regionKey: item.regionKey, count: item.count }))
            : prev.bindings,
      }));
    } catch {
      // Ignore malformed local storage values.
    }
  }, []);

  async function saveConfigSection(section: AdminTab, successText: string) {
    setSavingTab(section);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: SiteConfig;
        message?: string;
      };
      if (!res.ok || !json.data) {
        setError(json.message ?? "保存失败");
        return;
      }
      setConfig(json.data);
      setMessage(successText);
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setSavingTab(null);
    }
  }

  function saveRedeemBatchConfig() {
    try {
      const payload: RedeemBatchForm = {
        ...batchForm,
        prefix: "",
      };
      window.localStorage.setItem(REDEEM_BATCH_FORM_STORAGE_KEY, JSON.stringify(payload));
      setMessage("兑换码生成配置已保存。");
      setError(null);
    } catch {
      setError("兑换码生成配置保存失败");
    }
  }

  const saveButtonClass =
    "inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(99,102,241,0.22)] transition hover:from-indigo-600 hover:via-violet-600 hover:to-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-60";

  const sidebar = (
    <aside className="flex h-full flex-col rounded-[32px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_40px_rgba(148,163,184,0.12)]">
      <div className="rounded-[28px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-6 text-white shadow-[0_18px_40px_rgba(99,102,241,0.28)]">
        <h1 className="text-[2.1rem] font-extrabold tracking-tight">ShareID 后台</h1>
      </div>

      <nav className="mt-5 space-y-3">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={[
                "flex w-full items-center gap-3 rounded-[22px] border px-4 py-4 text-left transition",
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40",
              ].join(" ")}
            >
              <span
                className={[
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                  active ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-600",
                ].join(" ")}
              >
                <Icon className="size-5" />
              </span>
              <span className="block text-base font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          window.location.reload();
        }}
        className="mt-auto rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        退出后台
      </button>
    </aside>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <SectionCard
        title="总览"
        actions={
          <button
            type="button"
            disabled={savingTab === "overview"}
            onClick={() => void saveConfigSection("overview", "总览配置已保存。")}
            className={saveButtonClass}
          >
            <Save className="size-4" />
            {savingTab === "overview" ? "保存中..." : "保存总览"}
          </button>
        }
      >
        <div className="space-y-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-950">兑换模式</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  开启后，前台右侧账号区会切换成兑换码模式。当前建议只给 pcyid 单独开启。
                </p>
              </div>
              <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                <span>{config.redeemModeEnabled ? "已开启" : "未开启"}</span>
                <input
                  type="checkbox"
                  checked={config.redeemModeEnabled}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, redeemModeEnabled: event.target.checked }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-950">底部联系方式</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  控制前台最底部“分享页制作联系Q：3668514531”是否显示。
                </p>
              </div>
              <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                <span>{config.showCreatorContact ? "显示中" : "已隐藏"}</span>
                <input
                  type="checkbox"
                  checked={config.showCreatorContact}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, showCreatorContact: event.target.checked }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 px-5 py-5">
            <h3 className="text-xl font-bold text-slate-950">购买链接</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">前台所有“点我购买独享ID”都会统一使用这个地址。</p>
            <input
              value={config.purchaseUrl}
              onChange={(event) => setConfig((prev) => ({ ...prev, purchaseUrl: event.target.value }))}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              placeholder="https://example.com/"
            />
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 px-5 py-5">
            <h3 className="text-xl font-bold text-slate-950">托管接口配置</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              这里可以直接为当前站点设置 AppleAuto 的 Base URL 和 API Key。不填写时会回退到服务器 `.env`
              里的配置。
            </p>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Base URL</span>
                <input
                  value={config.appleAutoBaseUrl}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, appleAutoBaseUrl: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder="https://your-host.example.com"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">API Key</span>
                <input
                  value={config.appleAutoApiKey}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, appleAutoApiKey: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder="replace-with-api-key"
                />
              </label>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderRegions = () => (
    <div className="space-y-6">
      <SectionCard
        title="分类标签配置"
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  regions: [...prev.regions, createRegionDraft(prev.regions.length)],
                }))
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="size-4" />
              新增分类
            </button>
            <button
              type="button"
              disabled={savingTab === "regions"}
              onClick={() => void saveConfigSection("regions", "分类标签配置已保存。")}
              className={saveButtonClass}
            >
              <Save className="size-4" />
              {savingTab === "regions" ? "保存中..." : "保存分类标签"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {config.regions.map((region, index) => (
            <div
              key={`${region.key}-${index}`}
              className="rounded-[24px] border border-slate-200 bg-slate-50/60 px-5 py-5"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">分类 {index + 1}</p>
                  <p className="mt-1 text-xs text-slate-400">系统 key：{region.key}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      regions: prev.regions.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600 transition hover:bg-rose-100"
                  aria-label={`删除分类 ${region.label}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">分类名称</span>
                  <input
                    value={region.label}
                    onChange={(event) => {
                      const next = [...config.regions];
                      next[index] = { ...region, label: event.target.value };
                      setConfig((prev) => ({ ...prev, regions: next }));
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="美区 ID"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">标签 ID</span>
                  <input
                    value={region.tagId ?? ""}
                    onChange={(event) => {
                      const next = [...config.regions];
                      next[index] = {
                        ...region,
                        tagId: event.target.value === "" ? null : Number(event.target.value),
                      };
                      setConfig((prev) => ({ ...prev, regions: next }));
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="1"
                    inputMode="numeric"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">国家备注</span>
                  <input
                    value={region.countryNote}
                    onChange={(event) => {
                      const next = [...config.regions];
                      next[index] = { ...region, countryNote: event.target.value };
                      setConfig((prev) => ({ ...prev, regions: next }));
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="美国"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const renderRedeem = () => (
    <div className="space-y-6">
      <SectionCard
        title="兑换码管理"
        description="支持批量生成、首次兑换后开始计时，并按上海时间显示状态和失效时间。"
      >
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 px-5 py-5">
          <div className="space-y-5">
            <div className="space-y-3">
              {batchForm.bindings.map((binding, index) => (
                <div
                  key={`${binding.regionKey}-${index}`}
                  className="grid gap-3 xl:grid-cols-[1.45fr_0.95fr_auto]"
                >
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">标签选择</span>
                    <select
                      value={binding.regionKey}
                      onChange={(event) => {
                        const next = [...batchForm.bindings];
                        next[index] = { ...binding, regionKey: event.target.value };
                        setBatchForm((prev) => ({ ...prev, bindings: next }));
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    >
                      {regionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">该标签下展示账号数量</span>
                    <input
                      type="number"
                      min={1}
                      value={binding.count}
                      onChange={(event) => {
                        const next = [...batchForm.bindings];
                        next[index] = { ...binding, count: Number(event.target.value) || 1 };
                        setBatchForm((prev) => ({ ...prev, bindings: next }));
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setBatchForm((prev) => ({
                          ...prev,
                          bindings: prev.bindings.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      className="h-[44px] rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold leading-none text-rose-600 transition hover:bg-rose-100"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setBatchForm((prev) => ({
                    ...prev,
                    bindings: [...prev.bindings, { regionKey: config.regions[0]?.key ?? "us", count: 1 }],
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                新增标签绑定
              </button>
              <button
                type="button"
                onClick={saveRedeemBatchConfig}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Save className="size-4" />
                保存配置
              </button>
              {lastGeneratedCodes.length > 0 ? (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(lastGeneratedCodes.join("\n"));
                    setMessage("已复制本次生成的兑换码。");
                    setError(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Copy className="size-4" />
                  复制本次生成兑换码
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.8fr_0.8fr_0.8fr_1fr]">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">生成数量</span>
                <input
                  type="number"
                  min={1}
                  value={batchForm.quantity}
                  onChange={(event) =>
                    setBatchForm((prev) => ({ ...prev, quantity: Number(event.target.value) || 1 }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">时长数值</span>
                <input
                  type="number"
                  min={1}
                  disabled={batchForm.durationType === "forever"}
                  value={batchForm.durationValue}
                  onChange={(event) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      durationValue: Number(event.target.value) || 1,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">有效期类型</span>
                <select
                  value={batchForm.durationType}
                  onChange={(event) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      durationType: event.target.value as RedeemBatchForm["durationType"],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="day">天</option>
                  <option value="month">月</option>
                  <option value="year">年</option>
                  <option value="forever">永久</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">备注</span>
                <input
                  value={batchForm.note}
                  onChange={(event) => setBatchForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                  placeholder="可选"
                />
              </label>
            </div>

            <div>
              <button
                type="button"
                disabled={batchSubmitting}
                onClick={async () => {
                  setBatchSubmitting(true);
                  setError(null);
                  setMessage(null);
                  try {
                    const res = await fetch("/api/admin/redeem-codes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(batchForm),
                    });
                    const json = (await res.json().catch(() => ({}))) as {
                      ok?: boolean;
                      data?: RedeemCodeItem[];
                      message?: string;
                    };
                    if (!res.ok || !json.ok || !Array.isArray(json.data)) {
                      setError(json.message ?? "生成兑换码失败");
                      return;
                    }
                    setLastGeneratedCodes(json.data.map((item) => item.code));
                    setCodes((prev) => [...json.data!, ...prev]);
                    setRedeemPage(1);
                    setMessage(`成功生成 ${json.data.length} 个兑换码。`);
                  } catch {
                    setError("网络错误，请稍后再试");
                  } finally {
                    setBatchSubmitting(false);
                  }
                }}
                className={saveButtonClass}
              >
                <Save className="size-4" />
                {batchSubmitting ? "生成中..." : "生成兑换码"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {codesLoading ? (
            <p className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
              正在加载兑换码...
            </p>
          ) : codes.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-500">
              暂无兑换码。
            </p>
          ) : (
            <>
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                <div className="grid grid-cols-[1.1fr_1.6fr_0.8fr_1fr_1.25fr_auto] gap-4 border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                  <span>创建时间</span>
                  <span>兑换码</span>
                  <span>状态</span>
                  <span>有效时长</span>
                  <span>规则</span>
                  <span className="text-right">操作</span>
                </div>
                {pagedCodes.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1.1fr_1.6fr_0.8fr_1fr_1.25fr_auto] gap-4 border-b border-slate-100 px-4 py-2.5 text-sm text-slate-700 last:border-b-0"
                  >
                    <span className="text-slate-500">{formatShanghaiTime(item.createdAt)}</span>
                    <p className="truncate font-mono font-semibold text-slate-950">{item.code}</p>
                    <span className="text-sm">
                      <RedeemStatus item={item} />
                    </span>
                    <span className="text-slate-500">{getRedeemDurationLabel(item)}</span>
                    <span className="text-slate-500">
                      {item.bindings
                        .map((binding) => {
                          const region = config.regions.find((entry) => entry.key === binding.regionKey);
                          return `${region?.label ?? binding.regionKey} × ${binding.count}`;
                        })
                        .join("，")}
                    </span>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await fetch(`/api/admin/redeem-codes/${item.id}`, {
                            method: "DELETE",
                          });
                          if (res.ok) {
                            setCodes((prev) => prev.filter((entry) => entry.id !== item.id));
                          }
                        }}
                        className="inline-flex h-[34px] items-center rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold leading-none text-rose-600 transition hover:bg-rose-50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {redeemPageCount > 1 ? (
                <div className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <span>
                    第 {redeemPage} / {redeemPageCount} 页，每页 30 个兑换码
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={redeemPage <= 1}
                      onClick={() => setRedeemPage((prev) => Math.max(1, prev - 1))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      disabled={redeemPage >= redeemPageCount}
                      onClick={() => setRedeemPage((prev) => Math.min(redeemPageCount, prev + 1))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_22%,#ffffff_100%)]">
      <div className="grid min-h-screen gap-6 px-4 py-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-6 lg:py-6">
        <div className="lg:sticky lg:top-0 lg:h-[calc(100vh-3rem)]">{sidebar}</div>

        <div className="min-w-0 space-y-5">
          {message ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {activeTab === "overview" ? renderOverview() : null}
          {activeTab === "regions" ? renderRegions() : null}
          {activeTab === "redeem" ? renderRedeem() : null}
        </div>
      </div>
    </div>
  );
}
