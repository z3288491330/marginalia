import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

// 书目。投稿先写入 status='pending'，管理员通过后变 'approved'，前台只展示 approved。
export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    author: text("author").notNull().default(""),
    genre: text("genre").notNull().default("其他"),
    themes: text("themes").array().notNull().default([]),
    synopsis: text("synopsis").notNull(),
    coverUrl: text("cover_url"),
    status: text("status", { enum: ["pending", "approved"] })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("books_status_idx").on(t.status)]
);

// 评论。楼中楼一层嵌套：顶层评论 parentId=null；回复挂在顶层评论上，
// replyTo 记录被回复者昵称（回复的回复仍归入同一顶层楼）。
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    replyTo: text("reply_to"),
    nickname: text("nickname").notNull().default("佚名"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("comments_book_idx").on(t.bookId)]
);

// 服务端频率限制：每个 (动作 + 哈希后的 IP) 记一行，存最近一次命中时间。
// serverless 多实例下内存不可靠，故落库。IP 经 SHA-256 哈希，不存明文，契合匿名调性。
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  lastHit: timestamp("last_hit", { withTimezone: true }).notNull().defaultNow(),
});

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
