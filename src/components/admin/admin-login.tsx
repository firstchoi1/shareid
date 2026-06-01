"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function AdminLogin({ usingDefaultPassword }: { usingDefaultPassword: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_20px_60px_rgba(79,70,229,0.16)] ring-1 ring-slate-200/60 backdrop-blur">
      <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-center text-3xl font-extrabold text-transparent">
        ShareID 后台
      </div>
      <p className="mt-3 text-center text-sm leading-6 text-slate-500">
        统一修改购买链接、展示分类和标签 ID。
      </p>
      {usingDefaultPassword ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          当前还在使用默认后台密码 `admin123456`。上线前建议设置环境变量 `SHAREID_ADMIN_PASSWORD`。
        </p>
      ) : null}
      <form
        className="mt-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError(null);
          try {
            const res = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const json = (await res.json().catch(() => ({}))) as { message?: string };
            if (!res.ok) {
              setError(json.message ?? "登录失败");
              return;
            }
            window.location.reload();
          } catch {
            setError("网络错误，请稍后再试");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">后台密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cn(
              "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition",
              "focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
            )}
            placeholder="请输入后台密码"
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-base font-bold text-white shadow-[0_12px_30px_rgba(99,102,241,0.28)] transition hover:from-indigo-600 hover:to-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "登录中..." : "进入后台"}
        </button>
      </form>
    </div>
  );
}
