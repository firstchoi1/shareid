"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ChevronDown,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** 与页头品牌色一致的图标渐变轮换 */
const ICON_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-violet-500 to-fuchsia-500",
  "from-indigo-400 to-fuchsia-400",
  "from-violet-400 to-indigo-500",
  "from-fuchsia-500 to-indigo-400",
  "from-indigo-500 to-fuchsia-400",
] as const;

export function FaqBlock(props: {
  index: number;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** 仅兑换发货页侧栏：首条「如何正确登录账号」默认展开 */
  defaultOpen?: boolean;
  /** 为 true 时始终展开且不可折叠 */
  lockedOpen?: boolean;
}) {
  const Icon = props.icon;
  const g = ICON_GRADIENTS[props.index % ICON_GRADIENTS.length];
  const locked = props.lockedOpen === true;
  return (
    <details
      open={locked || props.defaultOpen === true ? true : undefined}
      className={cn(
        "group overflow-hidden rounded-xl border border-slate-200/90 bg-card shadow-sm ring-1 ring-slate-200/60 transition-shadow hover:shadow-md",
        "dark:border-slate-700/80 dark:ring-slate-800/60"
      )}
    >
      <summary
        className={cn(
          "flex list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden",
          locked ? "cursor-default" : "cursor-pointer"
        )}
        onClick={locked ? (e) => e.preventDefault() : undefined}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3.5">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md sm:size-11",
              g
            )}
          >
            <Icon className="size-5 sm:size-6" aria-hidden />
          </div>
          <div className="min-w-0 text-left">
            <span className="font-semibold tracking-tight text-foreground">{props.title}</span>
            <p className="mt-0.5 text-sm text-muted-foreground">{props.subtitle}</p>
          </div>
        </div>
        {!locked && (
          <ChevronDown
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180 group-open:text-indigo-500 dark:group-open:text-indigo-300"
            aria-hidden
          />
        )}
      </summary>
      <div className="border-t border-border bg-muted/25 px-4 py-4 sm:px-5 sm:py-5 dark:bg-muted/10">
        {props.children}
      </div>
    </details>
  );
}

/** 与 /faq 页面相同的问答条目，供独立页与兑换发货页侧栏复用 */
export function FaqAccordionItems() {
  return (
    <>
      <FaqBlock
        index={0}
        icon={Smartphone}
        title="如何正确登录账号？"
        subtitle="学习正确的登录步骤和注意事项"
        lockedOpen
      >
        <div className="overflow-hidden rounded-lg border border-border shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element -- 外链教程图 */}
          <img
            src="https://img.alicdn.com/imgextra/i1/2218810210323/O1CN01Vmdphw1EFyz9AixuO_!!2218810210323.png"
            alt="如何正确登陆共享账号教程"
            className="h-auto max-w-full"
          />
        </div>
        <div className="mt-4 rounded-lg border border-indigo-100/80 bg-indigo-50/90 p-4 dark:border-indigo-800/40 dark:bg-indigo-900/35">
          <p className="text-sm font-medium text-slate-800 dark:text-indigo-50">
            💡 重要提醒：请严格按照图示步骤操作，避免登录到设置中
          </p>
        </div>
      </FaqBlock>

      <FaqBlock
        index={1}
        icon={Sparkles}
        title="更多常见问题"
        subtitle="展开查看永久独享、验证码、设置登录与更新问题"
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-indigo-100/90 bg-indigo-50/90 p-4 dark:border-indigo-800/40 dark:bg-indigo-900/30">
            <p className="mb-1.5 text-sm font-semibold text-slate-900 dark:text-indigo-50">
              永久独享ID账号的好处？
            </p>
            <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-indigo-50">
              临时ID只能下载，不能更新，每次下载需要卸载重装，永久独享苹果ID后续可以正常更新使用！！！
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/85 p-4 dark:border-emerald-900/35 dark:bg-emerald-950/25">
            <p className="text-sm font-medium leading-relaxed text-emerald-950/95 dark:text-emerald-100/90">
              建议：重新安装或者购买永久独享的ID是最简单的办法
            </p>
          </div>

          <div className="h-px bg-slate-200/90 dark:bg-slate-700/70" />

          <div className="rounded-lg border border-violet-100/90 bg-violet-50/90 p-4 dark:border-violet-800/40 dark:bg-violet-900/25">
            <p className="mb-1.5 text-sm font-semibold text-slate-900 dark:text-violet-100">
              登录时提示需要输入验证码
            </p>
            <p className="mb-1.5 text-sm font-semibold text-violet-800 dark:text-violet-100">📱 问题原因</p>
            <p className="text-sm leading-relaxed text-violet-900/90 dark:text-violet-50/90">
              其他用户登录时绑定了手机号，导致需要验证码验证，我们无法获取这些验证码
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/80 p-4 dark:border-emerald-900/35 dark:bg-emerald-950/20">
            <p className="mb-1.5 text-sm font-semibold text-emerald-900 dark:text-emerald-200">🔄 解决方案</p>
            <p className="text-sm leading-relaxed text-emerald-950/90 dark:text-emerald-100/90">
              请重新获取其他账号进行登录，或等待 10 分钟后尝试，系统会自动解绑
            </p>
          </div>

          <div className="h-px bg-slate-200/90 dark:bg-slate-700/70" />

          <div className="rounded-lg border border-red-200/90 bg-red-50/90 p-5 dark:border-red-900/45 dark:bg-red-950/25">
            <p className="mb-1.5 text-sm font-semibold text-slate-900 dark:text-red-200">
              共享账号可以在设置中登录吗？
            </p>
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-7 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
              <div className="min-w-0">
                <p className="mb-1.5 text-base font-bold text-red-900 dark:text-red-200">❌ 绝对不可以！</p>
                <p className="mb-3 text-sm leading-relaxed text-red-800 dark:text-red-200/90">
                  切记：共享账号绝对不能在 iPhone 设置中登录！哪怕万分之一的概率出问题，也可能导致严重后果。
                </p>
                <div className="rounded-md border border-red-200/80 bg-card p-3 dark:border-red-900/50">
                  <p className="text-xs font-medium leading-relaxed text-red-700 dark:text-red-300">
                    ⚠️
                    风险提示：一旦在设置中登录，可能导致数据丢失、设备锁定等不可挽回的损失，我们也无法提供技术支持。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200/90 dark:bg-slate-700/70" />

          <div className="rounded-lg border border-indigo-100/80 bg-indigo-50/80 p-4 dark:border-indigo-800/40 dark:bg-indigo-900/30">
            <p className="mb-1.5 text-sm font-semibold text-slate-900 dark:text-indigo-100">
              更新 App 时提示禁用/锁定错误
            </p>
            <p className="mb-1.5 text-sm font-semibold text-indigo-800 dark:text-indigo-100">📱 问题原因</p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              苹果 App 更新机制：用哪个账号下载的 App，就必须用哪个账号才能更新
            </p>
          </div>
          <div className="rounded-lg border border-slate-200/90 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="mb-1.5 text-sm font-semibold text-foreground">💡 解决方案</p>
            <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
              <li>• 使用原下载账号进行更新</li>
              <li>• 重新安装或者购买永久独享的ID是最简单的办法</li>
            </ul>
          </div>
        </div>
      </FaqBlock>
    </>
  );
}

/** 兑换码发货页右侧：与 /faq 相同内容；与左侧同高时仅本区域滚动（含展开问答） */
export function FaqRedeemSidebar() {
  return (
    <aside className="flex min-h-0 h-full min-w-0 flex-col">
      <div
        className={cn(
          "flex min-h-0 h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-card shadow-sm ring-1 ring-slate-200/60",
          "dark:border-slate-700/80 dark:ring-slate-800/60",
          "max-lg:max-h-[min(70vh,calc(100dvh-6rem))]"
        )}
      >
        <div className="shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-3 text-center text-white shadow-sm sm:px-5">
          <h2 className="text-lg font-bold tracking-tight">常见问题解答</h2>
          <p className="mt-0.5 text-xs text-white/90">快速找到您需要的答案</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-auto md:overscroll-contain p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3">
            <FaqAccordionItems />
          </div>
        </div>
      </div>
    </aside>
  );
}
