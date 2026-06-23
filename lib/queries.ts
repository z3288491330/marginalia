import { and, asc, count, desc, eq } from "drizzle-orm";
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
