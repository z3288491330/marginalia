"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Cover from "./Cover";
import { GENRES, THEME_COLORS, DEFAULT_SPINE } from "@/lib/taxonomy";
import type { BookListItem } from "@/lib/queries";

export default function Shelf({ books }: { books: BookListItem[] }) {
  const [theme, setTheme] = useState("全部");
  const [genre, setGenre] = useState("全部");

  const { usedThemes, themeCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    books.forEach((b) =>
      (b.themes || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1))
    );
    const used = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return { usedThemes: used, themeCounts: counts };
  }, [books]);

  let shown = books;
  if (genre !== "全部") shown = shown.filter((b) => b.genre === genre);
  if (theme !== "全部")
    shown = shown.filter((b) => (b.themes || []).includes(theme));

  return (
    <div className="mg-shell">
      <aside className="mg-aside">
        <p className="mg-aside-h">主题</p>
        <ul className="mg-themes">
          <li>
            <button
              className={"mg-theme" + (theme === "全部" ? " on" : "")}
              onClick={() => setTheme("全部")}
            >
              <span
                className="dot"
                style={{ background: "var(--ink)", opacity: 0.35 }}
              />
              全部
              <span className="ct">{books.length}</span>
            </button>
          </li>
          {usedThemes.map((t) => (
            <li key={t}>
              <button
                className={"mg-theme" + (theme === t ? " on" : "")}
                onClick={() => setTheme(t)}
              >
                <span
                  className="dot"
                  style={{ background: THEME_COLORS[t] || DEFAULT_SPINE }}
                />
                {t}
                <span className="ct">{themeCounts[t]}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="mg-main mg-fadein" key={genre + "|" + theme}>
        <div className="mg-genrebar">
          {["全部", ...GENRES].map((g) => (
            <button
              key={g}
              className={"mg-chip" + (genre === g ? " on" : "")}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>

        <p className="mg-count">
          {genre === "全部" ? "全部体裁" : genre} ·{" "}
          {theme === "全部" ? "全部主题" : theme} · {shown.length} 本
        </p>

        {shown.length === 0 ? (
          <p className="mg-empty">
            这个筛选下还没有书。换个体裁或主题，或者{" "}
            <Link
              href="/submit"
              className="mg-back"
              style={{ margin: 0, color: "var(--brass)" }}
            >
              投一本进来 →
            </Link>
          </p>
        ) : (
          shown.map((b) => (
            <Link key={b.id} href={`/book/${b.id}`} className="mg-book">
              <Cover book={b} variant="thumb" />
              <div className="mg-book-body">
                <h3 className="mg-title">{b.title}</h3>
                <p className="mg-author">
                  {b.author || "佚名"}
                  {b.genre && (
                    <>
                      <span className="sep">·</span>
                      {b.genre}
                    </>
                  )}
                </p>
                <p className="mg-syn">{b.synopsis}</p>
                <div className="mg-pills">
                  {(b.themes || []).map((t) => (
                    <span
                      key={t}
                      className="mg-pill"
                      style={{ background: THEME_COLORS[t] || DEFAULT_SPINE }}
                    >
                      {t}
                    </span>
                  ))}
                  <span className="mg-disc">
                    {b.commentCount > 0
                      ? `${b.commentCount} 条议论`
                      : "尚无议论"}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
