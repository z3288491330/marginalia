import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, comments, type Comment } from "@/lib/db/schema";

export type BookListItem = {
  id: string;
  title: string;
  author: string;
  genre: string;
  themes: string[];
  synopsis: string;
  coverUrl: string | null;
  createdAt: Date;
  source: string;
  commentCount: number;
};

// 已上架书目 + 每本议论数（供首页书架与 GET /api/books 共用）。
// 按书名中文拼音 A→Z 排序（localeCompare zh 走 ICU，按拼音首字母、再次字母…比较），新书自动入列。
export async function getApprovedBooks(): Promise<BookListItem[]> {
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      genre: books.genre,
      themes: books.themes,
      synopsis: books.synopsis,
      coverUrl: books.coverUrl,
      createdAt: books.createdAt,
      source: books.source,
      commentCount: count(comments.id),
    })
    .from(books)
    .leftJoin(comments, eq(comments.bookId, books.id))
    .where(eq(books.status, "approved"))
    .groupBy(books.id);

  return rows.sort((a, b) =>
    a.title.localeCompare(b.title, "zh-Hans-CN-u-co-pinyin")
  );
}

export async function getApprovedBook(id: string) {
  const row = await db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.status, "approved")))
    .limit(1);
  return row[0] ?? null;
}

export async function getComments(bookId: string): Promise<Comment[]> {
  return db
    .select()
    .from(comments)
    .where(eq(comments.bookId, bookId))
    .orderBy(asc(comments.createdAt));
}

// ── 管理后台用 ──────────────────────────────────────────────

// 待审投稿（status='pending'），最新在前。
export async function getPendingBooks() {
  return db
    .select()
    .from(books)
    .where(eq(books.status, "pending"))
    .orderBy(desc(books.createdAt));
}

export type RecentComment = {
  id: string;
  nickname: string;
  body: string;
  replyTo: string | null;
  createdAt: Date;
  bookId: string;
  bookTitle: string;
};

// 最近议论（跨全部书），用于后台删评论。
export async function getRecentComments(limit = 50): Promise<RecentComment[]> {
  return db
    .select({
      id: comments.id,
      nickname: comments.nickname,
      body: comments.body,
      replyTo: comments.replyTo,
      createdAt: comments.createdAt,
      bookId: comments.bookId,
      bookTitle: books.title,
    })
    .from(comments)
    .innerJoin(books, eq(comments.bookId, books.id))
    .orderBy(desc(comments.createdAt))
    .limit(limit);
}

// 本月（中国时区每月 1 号 00:00 起至今）收到的投稿数（source='submission'，含待审+已通过，不含已驳回删除的）。
// 返回 { count, month }（month 为月份数字，用于展示）。
export async function getMonthlySubmissions(): Promise<{
  count: number;
  month: number;
}> {
  // 计算「中国时区本月 1 号 00:00」对应的 UTC 瞬间
  const chinaNow = new Date(Date.now() + 8 * 3600 * 1000);
  const y = chinaNow.getUTCFullYear();
  const m = chinaNow.getUTCMonth(); // 0-11
  const monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0) - 8 * 3600 * 1000);

  const rows = await db
    .select({ c: count() })
    .from(books)
    .where(
      and(eq(books.source, "submission"), gte(books.createdAt, monthStart))
    );
  return { count: Number(rows[0]?.c ?? 0), month: m + 1 };
}
