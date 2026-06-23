// 封面回填：用 Google Books API 查封面 → 下载到本机 public/covers → 更新 books.coverUrl。
// 在能访问 Google 的环境运行（如香港 VPS）：GBKEY=xxx npx tsx scripts/backfill-covers.ts
// 仅处理 coverUrl 为空的书；查不到的保持空（前端用生成封面兜底）。幂等：可重复跑只补缺。
import { config } from "dotenv";
config({ path: ".env.local" });
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const KEY = process.env.GBKEY;
const COVER_BASE = process.env.COVER_BASE || "https://marginalia-books.cn";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ImageLinks = {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
};
type GBResp = {
  error?: { message: string };
  items?: { volumeInfo?: { imageLinks?: ImageLinks } }[];
};

function bestImage(l: ImageLinks): string | null {
  return (
    l.extraLarge || l.large || l.medium || l.small || l.thumbnail || l.smallThumbnail || null
  );
}

async function findCover(title: string, author: string): Promise<string | null> {
  const q = encodeURIComponent(`${title} ${author}`.trim());
  const r = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&country=US&key=${KEY}`
  );
  if (!r.ok) return null;
  const j = (await r.json()) as GBResp;
  if (j.error) {
    console.log("  API 错误:", j.error.message);
    return null;
  }
  const item = (j.items || []).find((it) => it.volumeInfo?.imageLinks);
  const links = item?.volumeInfo?.imageLinks;
  if (!links) return null;
  let img = bestImage(links);
  if (!img) return null;
  img = img.replace(/^http:/, "https:").replace(/&edge=curl/g, "");
  return img;
}

async function main() {
  if (!KEY) throw new Error("GBKEY 未设置（Google Books API key）。");
  const { db } = await import("../lib/db/index");
  const { books } = await import("../lib/db/schema");
  const { isNull, eq } = await import("drizzle-orm");

  const dir = path.join(process.cwd(), "public", "covers");
  await mkdir(dir, { recursive: true });

  const rows = await db
    .select({ id: books.id, title: books.title, author: books.author })
    .from(books)
    .where(isNull(books.coverUrl));
  console.log(`待处理（无封面）：${rows.length} 本\n`);

  let hit = 0,
    miss = 0,
    fail = 0;
  for (const b of rows) {
    try {
      const img = await findCover(b.title, b.author);
      if (!img) {
        miss++;
        console.log("❌ 未找到  " + b.title);
        await sleep(150);
        continue;
      }
      const res = await fetch(img);
      if (!res.ok) {
        fail++;
        console.log("⚠️ 下载失败  " + b.title);
        await sleep(150);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(path.join(dir, `${b.id}.jpg`), buf);
      await db
        .update(books)
        .set({ coverUrl: `${COVER_BASE}/covers/${b.id}.jpg` })
        .where(eq(books.id, b.id));
      hit++;
      console.log("✅ " + b.title);
    } catch (e) {
      fail++;
      console.log("⚠️ 异常  " + b.title + "  " + (e as Error).message);
    }
    await sleep(150);
  }
  console.log(`\n完成：成功 ${hit} / 未找到 ${miss} / 失败 ${fail} / 共 ${rows.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
