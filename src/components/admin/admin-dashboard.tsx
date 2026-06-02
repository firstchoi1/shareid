"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import type { SiteConfig } from "@/lib/site-config";

export function AdminDashboard({ initialConfig }: { initialConfig: SiteConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_20px_60px_rgba(79,70,229,0.12)] ring-1 ring-slate-200/60 backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-3xl font-extrabold text-transparent">
              ShareID 后台
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              这里改完保存，前台购买链接、托管接口配置和分类标签都会统一跟着变化。
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
              `分类 key` 用来请求数据，`分类名称` 会显示在前台，`标签 ID` 对应托管站标签。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfig((prev) => ({
                ...prev,
                regions: [
                  ...prev.regions,
                  { key: `region_${prev.regions.length + 1}`, label: "新分类", tagId: null },
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
              <div className="grid gap-3 md:grid-cols-[1.1fr_1.2fr_0.8fr_auto] md:items-end">
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
