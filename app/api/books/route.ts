import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { getApprovedBooks } from "@/lib/queries";
import { GENRES } from "@/lib/taxonomy";
import { fetchCover } from "@/lib/cover";
import { cooldown, rateKey } from "@/lib/ratelimit";

// 列出已上架（approved）书目，附带每本的议论数（一次查询，避免前端 N+1）。
export async function GET() {
  return NextResponse.json(await getApprovedBooks());
}

// 投稿新书：先审后显，写入 status='pending'，不在前台展示，等管理员通过。
export async function POST(req: Request) {
  if (!(await cooldown(rateKey(req, "book"), 10_000))) {
    return NextResponse.json({ error: "投得太快了，歇一会儿再来" }, { status: 429 });
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式有误" }, { status: 400 });
  }

  const b = data as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const author = typeof b.author === "string" ? b.author.trim() : "";
  const synopsis = typeof b.synopsis === "string" ? b.synopsis.trim() : "";
  const genre = typeof b.genre === "string" ? b.genre : "其他";
  const themes = Array.isArray(b.themes)
    ? b.themes
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  if (!title || title.length > 60) {
    return NextResponse.json({ error: "书名必填，且不超过 60 字" }, { status: 400 });
  }
  if (!synopsis || synopsis.length > 300) {
    return NextResponse.json({ error: "简介必填，且不超过 300 字" }, { status: 400 });
  }
  if (author.length > 60) {
    return NextResponse.json({ error: "作者名过长" }, { status: 400 });
  }

  // 正版链接（选填）：补全协议、校验是否为 http(s) 链接。
  let sourceUrl: string | null = null;
  if (typeof b.sourceUrl === "string" && b.sourceUrl.trim()) {
    let u = b.sourceUrl.trim();
    if (u.length > 500) {
      return NextResponse.json({ error: "链接过长" }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
      sourceUrl = u;
    } catch {
      return NextResponse.json(
        { error: "正版链接格式不太对，检查一下或留空" },
        { status: 400 }
      );
    }
  }

  const safeGenre = (GENRES as readonly string[]).includes(genre) ? genre : "其他";

  // 重名检测：书名 + 作者都与库中已有的（含待审）相同，则直接提示已存在，不再进审核队列。
  const dup = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.title, title), eq(books.author, author)))
    .limit(1);
  if (dup.length > 0) {
    return NextResponse.json(
      { error: "这本书已经在书架上啦，不用再投～" },
      { status: 409 }
    );
  }

  // 投稿时顺手尝试抓封面（best-effort，失败无妨）。
  const coverUrl = await fetchCover(title, author);

  await db.insert(books).values({
    title,
    author,
    synopsis,
    genre: safeGenre,
    themes,
    coverUrl,
    sourceUrl,
    status: "pending",
  });

  return NextResponse.json({ ok: true, pending: true });
}
