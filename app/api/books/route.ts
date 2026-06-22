import { NextResponse } from "next/server";
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
  const safeGenre = (GENRES as readonly string[]).includes(genre) ? genre : "其他";

  // 投稿时顺手尝试抓封面（best-effort，失败无妨）。
  const coverUrl = await fetchCover(title, author);

  await db.insert(books).values({
    title,
    author,
    synopsis,
    genre: safeGenre,
    themes,
    coverUrl,
    status: "pending",
  });

  return NextResponse.json({ ok: true, pending: true });
}
