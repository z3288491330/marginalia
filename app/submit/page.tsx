"use client";

import { useState } from "react";
import Link from "next/link";
import { GENRES, ALL_THEMES } from "@/lib/taxonomy";

export default function SubmitPage() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState<string>("小说");
  const [picked, setPicked] = useState<string[]>([]);
  const [extraThemes, setExtraThemes] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const toggle = (t: string) =>
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const addCustom = () => {
    const t = customInput.trim();
    if (!t) return;
    if (![...ALL_THEMES, ...extraThemes].includes(t))
      setExtraThemes((e) => [...e, t]);
    setPicked((p) => (p.includes(t) ? p : [...p, t]));
    setCustomInput("");
  };

  const submit = async () => {
    if (!title.trim() || !synopsis.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          synopsis: synopsis.trim(),
          genre,
          themes: picked,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "提交失败，稍后再试");
        return;
      }
      setDone(true);
    } catch {
      setErr("网络不太顺，稍后再试");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mg-shell" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <main className="mg-main mg-fadein" style={{ maxWidth: 640 }}>
          <h1 className="mg-detail-title" style={{ marginBottom: 12 }}>
            投稿已收到
          </h1>
          <p className="mg-empty" style={{ padding: "0 0 22px" }}>
            谢谢你。新书会先经过一道人工审核，通过后就会出现在书架上——
            这是为了挡住乱传的东西，请稍候片刻。
          </p>
          <div className="mg-formrow">
            <Link href="/" className="mg-btn mg-btn-ghost">
              ← 回到书架
            </Link>
            <button
              className="mg-btn mg-btn-solid"
              onClick={() => {
                setTitle("");
                setAuthor("");
                setSynopsis("");
                setGenre("小说");
                setPicked([]);
                setExtraThemes([]);
                setCustomInput("");
                setDone(false);
              }}
            >
              再投一本
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="mg-shell" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <main className="mg-main mg-fadein" style={{ maxWidth: 640 }}>
        <Link href="/" className="mg-back">
          ← 取消
        </Link>
        <h1 className="mg-detail-title" style={{ marginBottom: 6 }}>
          投一本书
        </h1>
        <p className="mg-empty" style={{ padding: "0 0 22px" }}>
          书名、一句简介、体裁和它触及的主题。封面会自动去找——找不到也没关系，会用一张排版封面顶上。投稿会先经审核再上架。
        </p>

        <div
          className="mg-form"
          style={{ background: "transparent", padding: 0, border: "none" }}
        >
          <input
            className="mg-input"
            placeholder="书名"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="mg-input"
            placeholder="作者（可不填）"
            value={author}
            maxLength={60}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <textarea
            className="mg-area"
            rows={3}
            placeholder="一句话简介，让人想点进来"
            value={synopsis}
            maxLength={300}
            onChange={(e) => setSynopsis(e.target.value)}
          />

          <p className="mg-aside-h" style={{ margin: "8px 0 10px" }}>
            体裁
          </p>
          <div className="mg-chips">
            {GENRES.map((g) => (
              <button
                key={g}
                className={"mg-chip" + (genre === g ? " on" : "")}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>

          <p className="mg-aside-h" style={{ margin: "8px 0 10px" }}>
            主题（可多选，也可自定义）
          </p>
          <div className="mg-chips">
            {[...ALL_THEMES, ...extraThemes].map((t) => (
              <button
                key={t}
                className={"mg-chip" + (picked.includes(t) ? " on" : "")}
                onClick={() => toggle(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mg-formrow" style={{ marginTop: 4 }}>
            <input
              className="mg-input"
              style={{ marginBottom: 0, maxWidth: 240 }}
              placeholder="自定义主题，如「记忆」「流亡」"
              value={customInput}
              maxLength={12}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <button
              className="mg-btn mg-btn-ghost"
              onClick={addCustom}
              disabled={!customInput.trim()}
            >
              + 添加主题
            </button>
          </div>

          {err && <p className="mg-err" style={{ marginTop: 14 }}>{err}</p>}

          <div className="mg-formrow" style={{ marginTop: 8 }}>
            <Link href="/" className="mg-btn mg-btn-ghost">
              取消
            </Link>
            <button
              className="mg-btn mg-btn-solid"
              onClick={submit}
              disabled={busy || !title.trim() || !synopsis.trim()}
            >
              {busy ? "提交中…" : "放上书架"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
