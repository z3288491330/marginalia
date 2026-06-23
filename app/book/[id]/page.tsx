import Link from "next/link";
import { notFound } from "next/navigation";
import Cover from "@/components/Cover";
import Comments from "@/components/Comments";
import { getApprovedBook, getComments } from "@/lib/queries";
import { THEME_COLORS, DEFAULT_SPINE } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await getApprovedBook(id);
  if (!book) notFound();

  const comments = await getComments(id);

  return (
    <div className="mg-shell" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <main className="mg-main mg-fadein" style={{ maxWidth: 760 }}>
        <Link href="/" className="mg-back">
          ← 回到书架
        </Link>

        <div className="mg-detail-head">
          <Cover book={book} variant="large" />
          <div className="mg-detail-body">
            <h1 className="mg-detail-title">{book.title}</h1>
            <p className="mg-author">
              {book.author || "佚名"}
              {book.genre && (
                <>
                  <span className="sep">·</span>
                  {book.genre}
                </>
              )}
            </p>
            <div className="mg-pills" style={{ marginTop: 10 }}>
              {(book.themes || []).map((t) => (
                <span
                  key={t}
                  className="mg-pill"
                  style={{ background: THEME_COLORS[t] || DEFAULT_SPINE }}
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="mg-detail-syn">{book.synopsis}</p>
          </div>
        </div>

        <Comments bookId={book.id} comments={comments} />
      </main>
    </div>
  );
}
