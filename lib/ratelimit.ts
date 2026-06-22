import crypto from "node:crypto";
import { lt } from "drizzle-orm";
import { db } from "./db";
import { rateLimits } from "./db/schema";

// 取客户端 IP（部署在 Vercel/反代后，优先看 x-forwarded-for）。
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// 限流键：动作 + 哈希后的 IP（不存明文 IP）。
export function rateKey(req: Request, action: string): string {
  const ip = clientIp(req);
  const h = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
  return `${action}:${h}`;
}

// 冷却：距上次同键命中不足 ms 毫秒则拒绝（返回 false）。
// 用一条带条件的 upsert 原子完成「检查+写入」：
//   插入新行，或仅当上次命中已超过窗口时才更新——能写入(RETURNING 有行)即放行。
export async function cooldown(key: string, ms: number): Promise<boolean> {
  const now = Date.now();
  const ts = new Date(now);
  const cutoff = new Date(now - ms);
  try {
    const res = await db
      .insert(rateLimits)
      .values({ key, lastHit: ts })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { lastHit: ts },
        where: lt(rateLimits.lastHit, cutoff),
      })
      .returning({ key: rateLimits.key });
    return res.length > 0;
  } catch {
    // 限流表临时不可用时，不应拖垮正常发帖——放行（fail-open）。
    return true;
  }
}
