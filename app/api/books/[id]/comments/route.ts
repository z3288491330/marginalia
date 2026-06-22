import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, comments } from "@/lib/db/schema";
import { getComments } from "@/lib/queries";
import { cooldown, rateKey } from "@/lib/ratelimit";

// 列出一本书下的全部议论（含回复），按时间升序；前端再分顶层/楼中楼。
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(await getComments(id));
}

// 发表议论或回复。回复时传 targetId（被回复的那条），服务端解析归属：
// 楼中楼一层嵌套——回复的回复仍归入同一顶层楼，replyTo 标注被回复者昵称。
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params;

  if (!(await cooldown(rateKey(req, "comment"), 4_000))) {
    return NextResponse.json({ error: "评论太快了，喝口茶再说" }, { status: 429 });
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式有误" }, { status: 400 });
  }
  const d = data as Record<string, unknown>;
  const body = typeof d.body === "string" ? d.body.trim() : "";
  const nickname =
    typeof d.nickname === "string" && d.nickname.trim()
      ? d.nickname.trim().slice(0, 24)
      : "佚名";
  const targetId = typeof d.targetId === "string" ? d.targetId : null;

  if (!body || body.length > 1200) {
    return NextResponse.json(
      { error: "议论必填，且不超过 1200 字" },
      { status: 400 }
    );
  }

  // 书必须存在且已上架，才能评论。
  const book = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.status, "approved")))
    .limit(1);
  if (book.length === 0) {
    return NextResponse.json({ error: "找不到这本书" }, { status: 404 });
  }

  let parentId: string | null = null;
  let replyTo: string | null = null;
  if (targetId) {
    const target = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, targetId), eq(comments.bookId, bookId)))
      .limit(1);
    if (target.length === 0) {
      return NextResponse.json({ error: "回复的对象不存在" }, { status: 400 });
    }
    parentId = target[0].parentId ?? target[0].id; // 归入顶层楼
    replyTo = target[0].nickname;
  }

  const inserted = await db
    .insert(comments)
    .values({ bookId, body, nickname, parentId, replyTo })
    .returning();

  return NextResponse.json(inserted[0]);
}
