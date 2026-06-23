import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { isAdmin } from "@/lib/auth";
import { storeCoverFromUrl, removeStoredCover } from "@/lib/cover";

// 后台手动设/清封面：POST { url }。url 为空=清除（改回生成封面）；
// 否则服务器下载该图片自存（避免防盗链/被墙），再写入 coverUrl。
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const { id } = await params;

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式有误" }, { status: 400 });
  }
  const url = typeof (data as { url?: unknown }).url === "string"
    ? (data as { url: string }).url.trim()
    : "";

  const row = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.id, id))
    .limit(1);
  if (row.length === 0) {
    return NextResponse.json({ error: "找不到这本书" }, { status: 404 });
  }

  // 清除封面
  if (!url) {
    await db.update(books).set({ coverUrl: null }).where(eq(books.id, id));
    await removeStoredCover(id);
    return NextResponse.json({ ok: true, cleared: true });
  }

  const stored = await storeCoverFromUrl(id, url);
  if (!stored) {
    return NextResponse.json(
      { error: "这个图片地址下载不了（可能防盗链/被拦/不是图片），换个地址试试" },
      { status: 400 }
    );
  }
  await db.update(books).set({ coverUrl: stored }).where(eq(books.id, id));
  return NextResponse.json({ ok: true, coverUrl: stored });
}
