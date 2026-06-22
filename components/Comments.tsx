"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";

export type CommentDTO = {
  id: string;
  parentId: string | null;
  replyTo: string | null;
  nickname: string;
  body: string;
  createdAt: string | Date;
};

export default function Comments({
  bookId,
  comments,
}: {
  bookId: string;
  comments: CommentDTO[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openReplyFor, setOpenReplyFor] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyNick, setReplyNick] = useState("");

  const post = async (
    text: string,
    nickname: string,
    targetId: string | null
  ): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/books/${bookId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed, nickname, targetId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "出了点问题，稍后再试");
        return false;
      }
      router.refresh(); // 重新拉取服务端渲染的最新议论
      return true;
    } catch {
      setErr("网络不太顺，稍后再试");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const postTop = async () => {
    if (await post(body, nick, null)) setBody("");
  };

  const postReply = async () => {
    if (!openReplyFor) return;
    if (await post(replyBody, replyNick, openReplyFor)) {
      setOpenReplyFor(null);
      setReplyBody("");
      setReplyNick("");
    }
  };

  const replyBox = (targetNick: string) => (
    <div className="mg-replybox">
      <textarea
        className="mg-area"
        rows={2}
        placeholder={`回复 @${targetNick}……`}
        value={replyBody}
        maxLength={1200}
        onChange={(e) => setReplyBody(e.target.value)}
      />
      <div className="mg-formrow">
        <input
          className="mg-input mg-nick"
          placeholder="昵称（可不填）"
          value={replyNick}
          maxLength={24}
          onChange={(e) => setReplyNick(e.target.value)}
        />
        <button
          className="mg-btn mg-btn-ghost"
          onClick={() => setOpenReplyFor(null)}
        >
          取消
        </button>
        <button
          className="mg-btn mg-btn-solid"
          onClick={postReply}
          disabled={busy || !replyBody.trim()}
        >
          回复
        </button>
      </div>
    </div>
  );

  const renderNode = (c: CommentDTO, isReply: boolean) => (
    <div key={c.id}>
      <div className="mg-cmeta">
        <span className={"mg-cnick" + (c.nickname === "佚名" ? " anon" : "")}>
          {c.nickname}
        </span>
        {c.replyTo && <span className="mg-replyto">回复 @{c.replyTo}</span>}
        <span className="mg-ctime">{timeAgo(c.createdAt)}</span>
      </div>
      <p
        className="mg-cbody"
        style={isReply ? { fontSize: "15.5px" } : undefined}
      >
        {c.body}
      </p>
      <div className="mg-cact">
        <button className="mg-reply-btn" onClick={() => setOpenReplyFor(c.id)}>
          ↳ 回复
        </button>
      </div>
      {openReplyFor === c.id && replyBox(c.nickname)}
    </div>
  );

  const topLevel = comments.filter((c) => !c.parentId);

  return (
    <>
      <p className="mg-dh">议论 · {comments.length}</p>

      {topLevel.length === 0 ? (
        <p className="mg-empty">还没有人在这本书旁写下字句。成为第一个。</p>
      ) : (
        topLevel.map((c) => {
          const replies = comments.filter((x) => x.parentId === c.id);
          return (
            <div className="mg-comment" key={c.id}>
              {renderNode(c, false)}
              {replies.length > 0 && (
                <div className="mg-replies">
                  {replies.map((r) => renderNode(r, true))}
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="mg-form">
        <textarea
          className="mg-area"
          rows={3}
          placeholder="写下你的想法……"
          value={body}
          maxLength={1200}
          onChange={(e) => setBody(e.target.value)}
        />
        {err && <p className="mg-err">{err}</p>}
        <div className="mg-formrow">
          <input
            className="mg-input mg-nick"
            placeholder="昵称（可不填）"
            value={nick}
            maxLength={24}
            onChange={(e) => setNick(e.target.value)}
          />
          <span className="mg-hint">{body.length}/1200</span>
          <button
            className="mg-btn mg-btn-solid"
            onClick={postTop}
            disabled={busy || !body.trim()}
          >
            留下议论
          </button>
        </div>
      </div>
    </>
  );
}
