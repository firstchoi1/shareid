"use client";

import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { RedeemCodeItem } from "@/lib/redeem-codes";
import type { SiteConfig } from "@/lib/site-config";
import { durationText, formatShanghaiTime } from "@/lib/time";

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

export function AdminDashboard({ initialConfig }: { initialConfig: SiteConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<RedeemCodeItem[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [lastGeneratedCodes, setLastGeneratedCodes] = useState<string[]>([]);
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_20px_60px_rgba(79,70,229,0.12)] ring-1 ring-slate-200/60 backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-3xl font-extrabold text-transparent">
              ShareID 后台
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              这里可以统一管理购买链接、托管接口、地区标签和兑换码展示规则。
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              window.location.reload();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            退出后台
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_20px_60px_rgba(79,70,229,0.12)] ring-1 ring-slate-200/60 backdrop-blur sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">兑换模式</h2>
            <p className="mt-1 text-sm text-slate-500">
              开启后，前台右侧账号区会切换成兑换码模式。当前建议只给 pcyid 单独开启。
            </p>
          </div>
          <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
            <span>{config.redeemModeEnabled ? "已开启" : "未开启"}</span>
            <input
              type="checkbox"
              checked={config.redeemModeEnabled}
              onChange={(event) => {
                setConfig((prev) => ({ ...prev, redeemModeEnabled: event.target.checked }));
              }}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_20px_60px_rgba(79,70,229,0.12)] ring-1 ring-slate-200/60 backdrop-blur sm:p-6">
        <h2 className="text-xl font-bold text-slate-900">购买链接</h2>
        <p className="mt-1 text-sm text-slate-500">前台所有“点我购买独享ID”都会统一使用这个地址。</p>
        <input
          value={config.purchaseUrl}
          onChange={(event) => {
            setConfig((prev) => ({ ...prev, purchaseUrl: event.target.value }));
          }}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
          placeholder="https://example.com/"
        />
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_20px_60px_rgba(79,70,229,0.12)] ring-1 ring-slate-200/60 backdrop-blur sm:p-6">
        <h2 className="text-xl font-bold text-slate-900">托管接口配置</h2>
        <p className="mt-1 text-sm text-slate-500">
          这里可以直接为当前站点设置 AppleAuto 的 Base URL 和 API Key。不填写时会回退到服务器
          `.env` 里的配置。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Base URL</span>
            <input
              value={config.appleAutoBaseUrl}
              onChange={(event) => {
                setConfig((prev) => ({ ...prev, appleAutoBaseUrl: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              placeholder="https://your-host.example.com"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">API Key</span>
            <input
              value={config.appleAutoApiKey}
              onChange={(event) => {
                setConfig((prev) => ({ ...prev, appleAutoApiKey: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              placeholder="replace-with-api-key"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_20px_60px_rgba(79,70,229,0.12)] ring-1 ring-slate-200/60 backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">分类与标签</h2>
            <p className="mt-1 text-sm text-slate-500">
              增加“国家备注”后，前台账号卡片会显示成“美国账号 / 日本账号”这种形式。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfig((prev) => ({
                ...prev,
                regions: [
                  ...prev.regions,
                  {
                    key: `region_${prev.regions.length + 1}`,
                    label: "新分类",
                    tagId: null,
                    countryNote: "新地区",
                  },
                ],
              }));
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(99,102,241,0.24)] transition hover:from-indigo-600 hover:to-fuchsia-600"
          >
            <Plus className="size-4" />
            新增分类
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {config.regions.map((region, index) => (
            <div
              key={`${region.key}-${index}`}
              className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 ring-1 ring-slate-200/50"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_1.1fr_0.8fr_0.9fr_auto] md:items-end">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">分类 key</span>
                  <input
                    value={region.key}
                    onChange={(event) => {
                      const next = [...config.regions];
                      next[index] = { ...region, key: event.target.value };
                      setConfig((prev) => ({ ...prev, regions: next }));
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="us"
                  />
                </label>
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
                <button
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({
                      ...prev,
                      regions: prev.regions.filter((_, itemIndex) => itemIndex !== index),
                    }));
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600 transition hover:bg-rose-100"
                  aria-label={`删除分类 ${region.label}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_20px_60px_rgba(79,70,229,0.12)] ring-1 ring-slate-200/60 backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">兑换码管理</h2>
            <p className="mt-1 text-sm text-slate-500">
              支持批量生成、首次兑换后开始计时、上海时间显示失效时间。
            </p>
          </div>
          {lastGeneratedCodes.length > 0 ? (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(lastGeneratedCodes.join("\n"));
                setMessage("已复制本次生成的兑换码。");
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Copy className="size-4" />
              复制本次生成兑换码
            </button>
          ) : null}
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="grid gap-3 md:grid-cols-5">
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
              <span className="mb-2 block text-sm font-semibold text-slate-700">前缀</span>
              <input
                value={batchForm.prefix}
                onChange={(event) => setBatchForm((prev) => ({ ...prev, prefix: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                placeholder="PCY"
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
              <span className="mb-2 block text-sm font-semibold text-slate-700">备注</span>
              <input
                value={batchForm.note}
                onChange={(event) => setBatchForm((prev) => ({ ...prev, note: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                placeholder="可选"
              />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {batchForm.bindings.map((binding, index) => (
              <div key={`${binding.regionKey}-${index}`} className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
                <select
                  value={binding.regionKey}
                  onChange={(event) => {
                    const next = [...batchForm.bindings];
                    next[index] = { ...binding, regionKey: event.target.value };
                    setBatchForm((prev) => ({ ...prev, bindings: next }));
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                >
                  {regionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={binding.count}
                  onChange={(event) => {
                    const next = [...batchForm.bindings];
                    next[index] = { ...binding, count: Number(event.target.value) || 1 };
                    setBatchForm((prev) => ({ ...prev, bindings: next }));
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setBatchForm((prev) => ({
                      ...prev,
                      bindings: prev.bindings.filter((_, itemIndex) => itemIndex !== index),
                    }));
                  }}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600 transition hover:bg-rose-100"
                >
                  删除
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setBatchForm((prev) => ({
                  ...prev,
                  bindings: [
                    ...prev.bindings,
                    { regionKey: config.regions[0]?.key ?? "us", count: 1 },
                  ],
                }))
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              新增标签绑定
            </button>
            <button
              type="button"
              onClick={async () => {
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
                  setMessage(`成功生成 ${json.data.length} 个兑换码。`);
                } catch {
                  setError("网络错误，请稍后再试");
                }
              }}
              className="rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(99,102,241,0.28)] transition hover:from-indigo-600 hover:to-fuchsia-600"
            >
              批量生成兑换码
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {codesLoading ? (
            <p className="text-sm text-slate-500">正在加载兑换码...</p>
          ) : codes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              暂无兑换码。
            </p>
          ) : (
            codes.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 ring-1 ring-slate-200/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-bold text-slate-900">{item.code}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      创建时间：{formatShanghaiTime(item.createdAt)}（上海时间）
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      状态：<RedeemStatus item={item} />
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      规则：
                      {item.bindings
                        .map((binding) => {
                          const region = config.regions.find((entry) => entry.key === binding.regionKey);
                          return `${region?.label ?? binding.regionKey} × ${binding.count}`;
                        })
                        .join("，")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      有效期：
                      {!item.activatedAt
                        ? `首次兑换后开始计时（${durationText(item.durationType, item.durationValue)})`
                        : !item.expiresAt
                          ? "永久有效（上海时间）"
                          : `${formatShanghaiTime(item.expiresAt)}（上海时间）`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.code);
                        setMessage(`已复制兑换码 ${item.code}`);
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      复制
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/redeem-codes/${item.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ enabled: !item.enabled }),
                        });
                        const json = (await res.json().catch(() => ({}))) as { data?: RedeemCodeItem };
                        if (res.ok && json.data) {
                          setCodes((prev) =>
                            prev.map((entry) => (entry.id === item.id ? json.data! : entry))
                          );
                        }
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {item.enabled ? "禁用" : "启用"}
                    </button>
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
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

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

      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
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
            setMessage("保存成功，前台配置已更新。");
          } catch {
            setError("网络错误，请稍后再试");
          } finally {
            setSaving(false);
          }
        }}
        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-3 text-base font-bold text-white shadow-[0_14px_28px_rgba(99,102,241,0.28)] transition hover:from-indigo-600 hover:to-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="size-4" />
        {saving ? "保存中..." : "保存后台配置"}
      </button>
    </div>
  );
}
