import { NextResponse } from "next/server";
import { getApprovedBook } from "@/lib/queries";

// 单本书详情（只返回已上架的）。
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = await getApprovedBook(id);
  if (!book) {
    return NextResponse.json({ error: "找不到这本书" }, { status: 404 });
  }
  return NextResponse.json(book);
}
