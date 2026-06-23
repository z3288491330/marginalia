// 封面回填/重修：用 lib/cover 的精确逻辑给书配封面（下载自存 public/covers）。
// 在能访问 Google 的环境运行（香港 VPS），需 .env.local 里有 GOOGLE_BOOKS_KEY。
//   普通：只处理没封面的书   ->  npx tsx scripts/backfill-covers.ts
//   重修：重新评估全部书、纠正配错的（对不上的清掉改用生成封面）-> FORCE=1 npx tsx scripts/backfill-covers.ts
// 跑完记得 pm2 restart marginalia（否则 next 启动时锁定了 public 清单，新图 404）。
import { config } from "dotenv";
config({ path: ".env.local" });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.GOOGLE_BOOKS_KEY) throw new Error("GOOGLE_BOOKS_KEY 未设置（.env.local）。");
  const { db } = await import("../lib/db/index");
  const { books } = await import("../lib/db/schema");
  const { isNull, eq } = await import("drizzle-orm");
  const { fetchAndStoreCover, removeStoredCover } = await import("../lib/cover");

  const FORCE = process.env.FORCE === "1";
  const rows = await db
    .select({ id: books.id, title: books.title, author: books.author, coverUrl: books.coverUrl })
    .from(books)
    .where(FORCE ? undefined : isNull(books.coverUrl));
  console.log(`${FORCE ? "重修(全部)" : "回填(缺封面)"}：${rows.length} 本\n`);

  let hit = 0,
    cleared = 0,
    miss = 0;
  for (const b of rows) {
    const url = await fetchAndStoreCover(b.id, b.title, b.author);
    if (url) {
      await db.update(books).set({ coverUrl: url }).where(eq(books.id, b.id));
      hit++;
      console.log("✅ " + b.title);
    } else if (FORCE && b.coverUrl) {
      // 重修时没匹配到 → 清掉旧封面（可能是之前配错的），改用生成封面
      await db.update(books).set({ coverUrl: null }).where(eq(books.id, b.id));
      await removeStoredCover(b.id);
      cleared++;
      console.log("🧹 清除(改生成封面) " + b.title);
    } else {
      miss++;
      console.log("❌ 未找到 " + b.title);
    }
    await sleep(150);
  }
  console.log(`\n完成：配上 ${hit} / 清除 ${cleared} / 仍无 ${miss} / 共 ${rows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
