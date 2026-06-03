const shanghaiFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function formatShanghaiTime(input: string | Date | null | undefined) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return shanghaiFormatter.format(date).replace(/\//g, "-");
}

export function durationText(type: "day" | "month" | "year" | "forever", value: number | null) {
  if (type === "forever") return "永久有效";
  const safeValue = value && value > 0 ? value : 1;
  const label = type === "day" ? "天" : type === "month" ? "个月" : "年";
  return `${safeValue}${label}`;
}

export function computeExpiryFromActivation(
  activatedAt: Date,
  type: "day" | "month" | "year" | "forever",
  value: number | null
) {
  if (type === "forever") return null;
  const safeValue = value && value > 0 ? value : 1;
  const next = new Date(activatedAt);
  if (type === "day") next.setUTCDate(next.getUTCDate() + safeValue);
  if (type === "month") next.setUTCMonth(next.getUTCMonth() + safeValue);
  if (type === "year") next.setUTCFullYear(next.getUTCFullYear() + safeValue);
  return next;
}
