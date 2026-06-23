// 封面查找：用 Google Books API（需环境变量 GOOGLE_BOOKS_KEY，且服务器能访问 Google，如香港 VPS）。
// 关键：精确查询 intitle/inauthor + 优先中文版，并校验书名/作者对得上，避免配错封面。
// 没 key、查不到、或对不上 → 返回 null，前端用主题色生成封面兜底。
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const COVER_BASE = process.env.COVER_BASE || "https://marginalia-books.cn";

type ImageLinks = {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
};
type Volume = {
  volumeInfo?: { title?: string; authors?: string[]; imageLinks?: ImageLinks };
};
type GBResp = { error?: { message: string }; items?: Volume[] };

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\s《》「」“”‘’()（）【】[\]·.,，。:：!！?？'"\-—~]/g, "");
}
// 去掉副标题/版本括注，取主标题
function stripSub(title: string): string {
  return (title || "").split(/[（(:：—]/)[0];
}
function titleMatches(our: string, their: string): boolean {
  const a = norm(our);
  const b = norm(stripSub(their));
  if (!a || !b) return false;
  return a === b || b.startsWith(a);
}
function authorMatches(our: string, theirs: string[]): boolean {
  if (!our) return true; // 没作者就不卡作者
  const a = norm(our);
  return (theirs || []).some((t) => {
    const n = norm(t);
    return !!n && (n.includes(a) || a.includes(n));
  });
}
function bestImage(l: ImageLinks): string | null {
  return (
    l.extraLarge || l.large || l.medium || l.small || l.thumbnail || l.smallThumbnail || null
  );
}

async function queryGB(key: string, q: string, lang?: string): Promise<Volume[]> {
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    q
  )}&maxResults=10&country=US&key=${key}`;
  if (lang) url += `&langRestrict=${lang}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) return [];
  const j = (await r.json()) as GBResp;
  return j.items || [];
}

// 找封面图地址（校验书名/作者匹配）。无 key / 没匹配 → null。
export async function findCoverUrl(
  title: string,
  author: string
): Promise<string | null> {
  const key = process.env.GOOGLE_BOOKS_KEY;
  if (!key) return null;
  const tries: { q: string; lang?: string }[] = [
    { q: `intitle:${title} inauthor:${author}`, lang: "zh" },
    { q: `intitle:${title} inauthor:${author}` },
    { q: `intitle:${title}`, lang: "zh" },
  ];
  for (const t of tries) {
    if (t.q.includes("inauthor:") && !author) continue;
    let items: Volume[] = [];
    try {
      items = await queryGB(key, t.q, t.lang);
    } catch {
      continue;
    }
    // 有图 + 书名对得上 的候选
    const cands = items.filter(
      (it) => it.volumeInfo?.imageLinks && titleMatches(title, it.volumeInfo.title || "")
    );
    if (cands.length === 0) continue;
    // 优先书名完全相等的；再优先作者也对得上的（Google 作者常是罗马音/英文，对不上也接受）
    const exact = cands.filter(
      (it) => norm(stripSub(it.volumeInfo!.title || "")) === norm(title)
    );
    const pool = exact.length ? exact : cands;
    const chosen =
      pool.find((it) => authorMatches(author, it.volumeInfo!.authors || [])) || pool[0];
    const img = bestImage(chosen.volumeInfo!.imageLinks!);
    if (img) return img.replace(/^http:/, "https:").replace(/&edge=curl/g, "");
  }
  return null;
}

// 找封面并下载自存到 public/covers/<id>.jpg，返回可访问的绝对地址；任何失败 → null。
export async function fetchAndStoreCover(
  id: string,
  title: string,
  author: string
): Promise<string | null> {
  try {
    const img = await findCoverUrl(title, author);
    if (!img) return null;
    const res = await fetch(img, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "covers");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${id}.jpg`), buf);
    return `${COVER_BASE}/covers/${id}.jpg`;
  } catch {
    return null;
  }
}

// 把指定图片地址下载并自存到 public/covers/<id>.jpg，返回绝对地址；失败返回 null。
// 用于后台手动设封面（管理员粘贴图片地址）。
export async function storeCoverFromUrl(
  id: string,
  url: string
): Promise<string | null> {
  try {
    if (!/^https?:\/\//i.test(url)) return null;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return null; // 太小多半不是有效图片
    const dir = path.join(process.cwd(), "public", "covers");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${id}.jpg`), buf);
    return `${COVER_BASE}/covers/${id}.jpg`;
  } catch {
    return null;
  }
}

// 直接把上传的图片字节存到 public/covers/<id>.jpg，返回绝对地址。用于后台「上传封面」。
export async function storeCoverBytes(id: string, buf: Buffer): Promise<string> {
  const dir = path.join(process.cwd(), "public", "covers");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.jpg`), buf);
  return `${COVER_BASE}/covers/${id}.jpg`;
}

// 删除自存封面文件（重修时清理配错的）。
export async function removeStoredCover(id: string): Promise<void> {
  try {
    await rm(path.join(process.cwd(), "public", "covers", `${id}.jpg`));
  } catch {
    /* 不存在就算了 */
  }
}
