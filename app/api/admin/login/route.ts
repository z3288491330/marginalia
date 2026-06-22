import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminConfigured,
  adminToken,
  checkPassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "未配置管理员密码（请在 .env.local 设置 ADMIN_PASSWORD）" },
      { status: 503 }
    );
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式有误" }, { status: 400 });
  }
  const pw = typeof (data as { password?: unknown }).password === "string"
    ? (data as { password: string }).password
    : "";

  if (!checkPassword(pw)) {
    return NextResponse.json({ error: "密码不对" }, { status: 401 });
  }

  // 按实际访问协议决定 secure：HTTPS（如 Netlify）才加 secure，
  // 纯 HTTP（如 IP 直连的服务器）下加了会被浏览器丢弃 cookie，导致登录失效。
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    new URL(req.url).protocol === "https:";

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 天
  });
  return res;
}
