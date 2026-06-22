import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { isAdmin } from "@/lib/auth";

// 通过投稿：status → approved。
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const { id } = await params;
  const updated = await db
    .update(books)
    .set({ status: "approved" })
    .where(eq(books.id, id))
    .returning({ id: books.id });
  if (updated.length === 0) {
    return NextResponse.json({ error: "找不到这本书" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

// 驳回投稿 / 删除书（评论随 onDelete cascade 一并删除）。
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await db
    .delete(books)
    .where(eq(books.id, id))
    .returning({ id: books.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "找不到这本书" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
