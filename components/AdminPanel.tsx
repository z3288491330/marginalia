"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cover from "./Cover";
import { timeAgo } from "@/lib/format";
import { THEME_COLORS, DEFAULT_SPINE } from "@/lib/taxonomy";
import type { Book } from "@/lib/db/schema";
import type { BookListItem, RecentComment } from "@/lib/queries";

export default function AdminPanel({
  pending,
  approved,
  recentComments,
}: {
  pending: Book[];
  approved: BookListItem[];
  recentComments: RecentComment[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [coverInputs, setCoverInputs] = useState<Record<string, string>>({});

  const act = async (key: string, run: () => Promise<Response>) => {
    setBusyId(key);
    setErr("");
    try {
      const res = await run();
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "操作失败");
        return;
      }
      router.refresh();
    } catch {
      setErr("网络不太顺，稍后再试");
    } finally {
      setBusyId(null);
    }
  };

  const approve = (id: string) =>
    act("a:" + id, () =>
      fetch(`/api/admin/books/${id}`, { method: "PATCH" })
    );

  const deleteBook = (id: string, label: string) => {
    if (!confirm(`确定删除《${label}》？其下所有议论也会一并删除。`)) return;
    act("d:" + id, () => fetch(`/api/admin/books/${id}`, { method: "DELETE" }));
  };

  const deleteComment = (id: string) => {
    if (!confirm("确定删除这条议论？若是顶层楼，其回复也会删除。")) return;
    act("c:" + id, () =>
      fetch(`/api/admin/comments/${id}`, { method: "DELETE" })
    );
  };

  const logout = () =>
    act("logout", async () => {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) {
        router.push("/admin/login");
        router.refresh();
      }
      return res;
    });

  const setCover = (id: string) => {
    const url = (coverInputs[id] || "").trim();
    if (!url) return;
    act("cover:" + id, () =>
      fetch(`/api/admin/books/${id}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
    ).then(() => setCoverInputs((m) => ({ ...m, [id]: "" })));
  };

  const clearCover = (id: string) => {
    if (!confirm("清除这本书的封面、改回生成封面？")) return;
    act("cover:" + id, () =>
      fetch(`/api/admin/books/${id}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "" }),
      })
    );
  };

  const uploadCover = (id: string, file: File | undefined) => {
    if (!file) return;
    act("cover:" + id, () =>
      fetch(`/api/admin/books/${id}/cover`, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      })
    );
  };

  // 手动设封面控件：粘贴图片地址 → 服务器下载自存。
  const coverControl = (id: string, hasCover: boolean) => (
    <div className="mg-formrow" style={{ marginTop: 8, gap: 8 }}>
      <input
        className="mg-input"
        style={{ marginBottom: 0, maxWidth: 280, fontSize: 13 }}
        placeholder="封面图片地址（粘贴后点设封面）"
        value={coverInputs[id] || ""}
        onChange={(e) =>
          setCoverInputs((m) => ({ ...m, [id]: e.target.value }))
        }
      />
      <button
        className="mg-btn mg-btn-ghost"
        onClick={() => setCover(id)}
        disabled={busyId === "cover:" + id || !(coverInputs[id] || "").trim()}
      >
        设封面
      </button>
      <label
        className="mg-btn mg-btn-ghost"
        style={{ cursor: "pointer" }}
      >
        上传图片
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          disabled={busyId === "cover:" + id}
          onChange={(e) => uploadCover(id, e.target.files?.[0])}
        />
      </label>
      {hasCover && (
        <button
          className="mg-reply-btn"
          onClick={() => clearCover(id)}
          disabled={busyId === "cover:" + id}
        >
          清除封面
        </button>
      )}
    </div>
  );

  const Pills = ({ themes }: { themes: string[] | null }) => (
    <div className="mg-pills" style={{ marginTop: 6 }}>
      {(themes || []).map((t) => (
        <span
          key={t}
          className="mg-pill"
          style={{ background: THEME_COLORS[t] || DEFAULT_SPINE }}
        >
          {t}
        </span>
      ))}
    </div>
  );

  return (
    <main className="mg-main mg-fadein" style={{ maxWidth: 820 }}>
      <div className="mg-formrow" style={{ marginBottom: 18 }}>
        <h1 className="mg-detail-title" style={{ margin: 0 }}>
          管理后台
        </h1>
        <button
          className="mg-btn mg-btn-ghost"
          style={{ marginLeft: "auto" }}
          onClick={logout}
          disabled={busyId === "logout"}
        >
          登出
        </button>
      </div>

      {err && <p className="mg-err">{err}</p>}

      {/* 待审投稿 */}
      <p className="mg-dh" style={{ borderTop: "none", paddingTop: 0 }}>
        待审投稿 · {pending.length}
      </p>
      {pending.length === 0 ? (
        <p className="mg-empty">没有待审的投稿。</p>
      ) : (
        pending.map((b) => (
          <div className="mg-book" key={b.id} style={{ cursor: "default" }}>
            <Cover book={b} variant="thumb" />
            <div className="mg-book-body">
              <h3 className="mg-title">{b.title}</h3>
              <p className="mg-author">
                {b.author || "佚名"}
                <span className="sep">·</span>
                {b.genre}
                <span className="sep">·</span>
                {timeAgo(b.createdAt)}
              </p>
              <p className="mg-syn">{b.synopsis}</p>
              <Pills themes={b.themes} />
              <div className="mg-formrow" style={{ marginTop: 10 }}>
                <button
                  className="mg-btn mg-btn-solid"
                  onClick={() => approve(b.id)}
                  disabled={busyId === "a:" + b.id}
                >
                  通过上架
                </button>
                <button
                  className="mg-btn mg-btn-ghost"
                  onClick={() => deleteBook(b.id, b.title)}
                  disabled={busyId === "d:" + b.id}
                >
                  驳回删除
                </button>
              </div>
              {coverControl(b.id, !!b.coverUrl)}
            </div>
          </div>
        ))
      )}

      {/* 已上架书目 */}
      <p className="mg-dh">已上架 · {approved.length}</p>
      {approved.length === 0 ? (
        <p className="mg-empty">书架还是空的。</p>
      ) : (
        approved.map((b) => (
          <div className="mg-book" key={b.id} style={{ cursor: "default" }}>
            <Cover book={b} variant="thumb" />
            <div className="mg-book-body">
              <h3 className="mg-title">
                <Link href={`/book/${b.id}`}>{b.title}</Link>
              </h3>
              <p className="mg-author">
                {b.author || "佚名"}
                <span className="sep">·</span>
                {b.genre}
                <span className="sep">·</span>
                {b.commentCount} 条议论
              </p>
              <div className="mg-formrow" style={{ marginTop: 8 }}>
                <button
                  className="mg-btn mg-btn-ghost"
                  onClick={() => deleteBook(b.id, b.title)}
                  disabled={busyId === "d:" + b.id}
                >
                  删除
                </button>
              </div>
              {coverControl(b.id, !!b.coverUrl)}
            </div>
          </div>
        ))
      )}

      {/* 最近议论 */}
      <p className="mg-dh">最近议论 · {recentComments.length}</p>
      {recentComments.length === 0 ? (
        <p className="mg-empty">还没有议论。</p>
      ) : (
        recentComments.map((c) => (
          <div className="mg-comment" key={c.id}>
            <div className="mg-cmeta">
              <span className={"mg-cnick" + (c.nickname === "佚名" ? " anon" : "")}>
                {c.nickname}
              </span>
              {c.replyTo && <span className="mg-replyto">回复 @{c.replyTo}</span>}
              <span className="mg-ctime">{timeAgo(c.createdAt)}</span>
              <Link
                href={`/book/${c.bookId}`}
                className="mg-ctime"
                style={{ marginLeft: 4 }}
              >
                《{c.bookTitle}》
              </Link>
            </div>
            <p className="mg-cbody">{c.body}</p>
            <div className="mg-cact">
              <button
                className="mg-reply-btn"
                onClick={() => deleteComment(c.id)}
                disabled={busyId === "c:" + c.id}
              >
                删除
              </button>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
