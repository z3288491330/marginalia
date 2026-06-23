import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminConfigured,
  adminToken,
  checkPassword,
} from "@/lib/auth";
import { cooldown, rateKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // 按 IP 限制登录尝试频率，挡暴力破解（每 5 秒最多一次）。
  if (!(await cooldown(rateKey(req, "admin-login"), 5_000))) {
    return NextResponse.json(
      { error: "尝试太频繁了，请稍候几秒再试" },
      { status: 429 }
    );
  }

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
