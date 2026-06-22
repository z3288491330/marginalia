import Shelf from "@/components/Shelf";
import { getApprovedBooks } from "@/lib/queries";

// 论坛内容随时在变，始终取最新（不做静态缓存）。
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const books = await getApprovedBooks();
  return <Shelf books={books} />;
}
