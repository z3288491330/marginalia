import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// 惰性初始化：首次真正用到数据库时才读 DATABASE_URL 并建连接，
// 这样在没有 env 的环境里（如本地 `next build` 收集阶段）导入本模块不会抛错。
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL 未设置。请在 .env.local 里填入 Neon 连接串（见 .env.example）。"
    );
  }
  _db = drizzle(neon(url), { schema });
  return _db;
}

// 以代理转发，调用方可继续像普通对象一样 `db.select()...`。
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? v.bind(real) : v;
  },
});
