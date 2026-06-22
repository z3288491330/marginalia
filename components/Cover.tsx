"use client";

import { useState } from "react";
import { spineOf } from "@/lib/taxonomy";

type Props = {
  book: { title: string; author?: string | null; themes?: string[] | null; coverUrl?: string | null };
  variant: "thumb" | "large";
};

// 封面：有真实封面就显示图片（加载失败自动回退），否则用主题色生成排版封面。
export default function Cover({ book, variant }: Props) {
  const [failed, setFailed] = useState(false);
  // 封面 URL 变了就重置失败状态（渲染期调整，React 推荐写法，避免 effect）。
  const [lastUrl, setLastUrl] = useState(book.coverUrl);
  if (book.coverUrl !== lastUrl) {
    setLastUrl(book.coverUrl);
    setFailed(false);
  }
  const color = spineOf(book.themes);
  const showImg = book.coverUrl && !failed;
  return (
    <div className={`mg-cover mg-cover-${variant}`}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="mg-cover-img"
          src={book.coverUrl as string}
          alt={book.title}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="mg-cover-gen" style={{ background: color }}>
          <span className="mg-cover-title">{book.title}</span>
          {variant === "large" && book.author && (
            <span className="mg-cover-author">{book.author}</span>
          )}
        </div>
      )}
    </div>
  );
}
