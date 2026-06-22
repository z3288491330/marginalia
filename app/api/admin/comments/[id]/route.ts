import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { isAdmin } from "@/lib/auth";

// 删除议论。若删的是顶层楼，连同其楼中楼回复一并删除（parentId 无外键，需手动级联）。
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await db
    .delete(comments)
    .where(or(eq(comments.id, id), eq(comments.parentId, id)))
    .returning({ id: comments.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "找不到这条议论" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, deleted: deleted.length });
}
