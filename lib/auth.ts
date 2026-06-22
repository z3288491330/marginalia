import { cookies } from "next/headers";
import crypto from "node:crypto";

export const ADMIN_COOKIE = "mg_admin";

// 是否配置了管理员密码。未配置则管理后台整体关闭（登录会被拒）。
export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

// 由密码派生的会话令牌：cookie 里存它而非明文密码；服务端可重算校验。
export function adminToken(): string {
  const pw = process.env.ADMIN_PASSWORD || "";
  return crypto.createHash("sha256").update("mg:" + pw).digest("hex");
}

// 校验提交的密码是否正确（定长比较，避免计时侧信道）。
export function checkPassword(input: string): boolean {
  if (!adminConfigured()) return false;
  const a = crypto.createHash("sha256").update("mg:" + input).digest();
  const b = crypto.createHash("sha256").update("mg:" + (process.env.ADMIN_PASSWORD || "")).digest();
  return crypto.timingSafeEqual(a, b);
}

// 当前请求是否已登录为管理员（读 httpOnly cookie）。
export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === adminToken();
}
