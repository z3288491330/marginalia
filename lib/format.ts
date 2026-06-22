// 相对时间。接受 Date / 时间戳 / ISO 字符串。
export function timeAgo(input: Date | string | number): string {
  const ts = input instanceof Date ? input.getTime() : new Date(input).getTime();
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
