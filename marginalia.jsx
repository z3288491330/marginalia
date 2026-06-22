import { useState, useEffect, useRef } from "react";

// ── Storage helpers (shared = visible to all users of this artifact) ──────────
async function loadBooks() {
  try {
    const r = await window.storage.get("forum:books", true);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function saveBooks(books) {
  try {
    await window.storage.set("forum:books", JSON.stringify(books), true);
  } catch (e) {
    console.error("saveBooks failed", e);
  }
}
async function loadComments(bookId) {
  try {
    const r = await window.storage.get(`forum:comments:${bookId}`, true);
    return r ? JSON.parse(r.value) : [];
  } catch {
    return [];
  }
}
async function saveComments(bookId, comments) {
  try {
    await window.storage.set(
      `forum:comments:${bookId}`,
      JSON.stringify(comments),
      true
    );
  } catch (e) {
    console.error("saveComments failed", e);
  }
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── Auto cover lookup (Open Library, free, no key) ───────────────────────────
// English-centric, so many Chinese titles won't resolve — the generated cover
// is the fallback. The sandbox may also block external requests; that's caught.
async function fetchCover(title, author) {
  try {
    const q = new URLSearchParams({
      title: title || "",
      limit: "1",
      fields: "cover_i",
    });
    if (author) q.set("author", author);
    const r = await fetch(`https://openlibrary.org/search.json?${q}`);
    const j = await r.json();
    const d = j.docs && j.docs[0];
    if (d && d.cover_i)
      return `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`;
  } catch {
    /* offline / blocked / not found → fall back to generated cover */
  }
  return null;
}

// ── Taxonomies ───────────────────────────────────────────────────────────────
const GENRES = ["小说", "诗歌", "戏剧", "散文", "随笔", "其他"];

const THEME_COLORS = {
  存在主义: "#2E5E5A",
  虚无主义: "#465A78",
  荒诞: "#A87C3D",
  异化: "#6E4A5E",
  自由意志: "#3E6B4A",
  现代主义: "#7A5A33",
  孤独: "#566270",
  死亡: "#5A4A4A",
  宗教与信仰: "#5A5577",
  革命: "#8A4A3A",
};
const ALL_THEMES = Object.keys(THEME_COLORS);
const DEFAULT_SPINE = "#4A6B52";
const spineOf = (themes) =>
  (themes && themes[0] && THEME_COLORS[themes[0]]) || DEFAULT_SPINE;

// ── Seed data (written once, when the shelf is empty) ─────────────────────────
const SEED_BOOKS = [
  {
    title: "局外人",
    author: "阿尔贝·加缪",
    genre: "小说",
    themes: ["荒诞", "存在主义"],
    synopsis:
      "默尔索在母亲葬礼上没有流泪，又在烈日下开枪杀了人。他对世界的疏离与坦率，最终成了一桩比凶案更难被原谅的罪。",
  },
  {
    title: "西西弗神话",
    author: "阿尔贝·加缪",
    genre: "随笔",
    themes: ["荒诞", "自由意志"],
    synopsis:
      "既然生活没有先天的意义，人为何还要活下去？加缪从那个永远推石上山的神祇身上，找到了反抗与幸福的可能。",
  },
  {
    title: "地下室手记",
    author: "陀思妥耶夫斯基",
    genre: "小说",
    themes: ["虚无主义", "存在主义"],
    synopsis:
      "一个躲在地下室里的小公务员，用尖刻的独白对抗理性与进步的承诺，把人心里最不体面的角落翻了出来。",
  },
  {
    title: "恶心",
    author: "让-保罗·萨特",
    genre: "小说",
    themes: ["存在主义", "异化"],
    synopsis:
      "洛根丁渐渐被一种说不清的恶心攫住——当事物褪去名字与用途，赤裸的存在本身令人晕眩。",
  },
  {
    title: "审判",
    author: "弗朗茨·卡夫卡",
    genre: "小说",
    themes: ["荒诞", "异化"],
    synopsis:
      "约瑟夫·K在某个清晨毫无缘由地被捕，却始终查不到自己的罪名。一场永远开不到正题的审判，吞掉了他的一生。",
  },
  {
    title: "查拉图斯特拉如是说",
    author: "弗里德里希·尼采",
    genre: "随笔",
    themes: ["虚无主义", "自由意志"],
    synopsis:
      "先知查拉图斯特拉下山，宣告旧神已死，呼唤人去成为能为自己立法的“超人”。一部用诗写成的哲学。",
  },
  {
    title: "等待戈多",
    author: "塞缪尔·贝克特",
    genre: "戏剧",
    themes: ["荒诞", "孤独"],
    synopsis:
      "两个人在荒路边等一个永远不来的戈多。什么都没发生，两次——而这恰恰是全部的重量。",
  },
];

const GENRE_BY_TITLE = SEED_BOOKS.reduce((m, b) => ((m[b.title] = b.genre), m), {});

const SEED_COMMENTS = {
  局外人: [
    { nickname: "佚名", body: "他不是冷漠，是拒绝表演情感。这一点到今天依然刺人。" },
  ],
  地下室手记: [
    { nickname: "老周", body: "前半部分像在被人骂，后半部分才发现他骂的是自己。" },
    { nickname: "佚名", body: "“二二得四是死亡的开始。”——这句话我记了很多年。" },
  ],
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap');

* { box-sizing: border-box; }
.mg-root {
  --ink:#1B1F1B; --paper:#EFEDE4; --paper2:#E7E4D8;
  --bottle:#1F3A2E; --bottle2:#274A39; --moss:#4A6B52;
  --brass:#A87C3D; --sage:#6E7468; --line:rgba(27,31,27,.14);
  font-family:'Newsreader',Georgia,serif; color:var(--ink);
  background:var(--paper); min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
.mono { font-family:ui-monospace,'SF Mono',Menlo,monospace; }

.mg-header {
  background:var(--bottle); color:var(--paper);
  padding:22px clamp(16px,5vw,56px) 26px;
  display:flex; flex-direction:column; gap:18px;
  border-bottom:3px solid var(--brass);
}
.mg-header-top { display:flex; align-items:flex-end; justify-content:space-between;
  gap:16px; flex-wrap:wrap; }
.mg-brand { display:flex; flex-direction:column; gap:3px; }
.mg-word { font-family:'Fraunces',serif; font-weight:600; font-size:30px;
  letter-spacing:.06em; line-height:1; }
.mg-word small { font-size:13px; font-weight:500; letter-spacing:.32em;
  opacity:.6; margin-left:8px; }

.mg-epigraph { max-width:560px; }
.mg-epi-line { font-family:'Newsreader',serif; font-size:15.5px; line-height:1.72;
  color:#E7EAE0; margin:0; }
.mg-epi-poem { font-family:'Newsreader',serif; font-style:italic; font-size:13px;
  line-height:1.5; color:#C4CFBA; text-align:right; margin:11px 0 0; }
.mg-epi-attr { font-family:ui-monospace,monospace; font-size:10.5px; letter-spacing:.08em;
  color:rgba(196,207,186,.66); text-align:right; margin:4px 0 0; }
@media(max-width:560px){
  .mg-epi-line { font-size:15px; }
  .mg-epi-poem, .mg-epi-attr { text-align:left; }
}

.mg-btn {
  font-family:ui-monospace,monospace; font-size:12.5px; letter-spacing:.08em;
  border:1px solid var(--brass); color:var(--paper); background:transparent;
  padding:9px 16px; border-radius:2px; cursor:pointer; transition:.18s;
  white-space:nowrap;
}
.mg-btn:hover { background:var(--brass); color:#1B1F1B; }
.mg-btn-solid { background:var(--brass); color:#1B1F1B; border-color:var(--brass); }
.mg-btn-solid:hover { background:#946b30; border-color:#946b30; color:#fff; }
.mg-btn-ghost { border-color:var(--line); color:var(--ink); }
.mg-btn-ghost:hover { background:var(--paper2); color:var(--ink); }

.mg-shell { max-width:1060px; margin:0 auto; padding:0 clamp(16px,5vw,56px);
  display:grid; grid-template-columns:200px 1fr; gap:clamp(20px,4vw,52px); }
@media(max-width:760px){ .mg-shell{ grid-template-columns:1fr; gap:0; } }

.mg-aside { padding-top:34px; }
@media(max-width:760px){ .mg-aside{ padding:18px 0 4px; } }
.mg-aside-h { font-family:ui-monospace,monospace; font-size:11px;
  letter-spacing:.22em; color:var(--sage); margin:0 0 14px; }
.mg-themes { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:1px; }
@media(max-width:760px){ .mg-themes{ flex-direction:row; flex-wrap:nowrap;
  overflow-x:auto; gap:8px; padding-bottom:6px; } }
.mg-theme { display:flex; align-items:center; gap:9px; padding:6px 4px;
  font-size:16px; color:var(--ink); cursor:pointer; background:none; border:none;
  text-align:left; width:100%; transition:.15s; border-radius:2px; white-space:nowrap; }
.mg-theme:hover { color:var(--brass); }
.mg-theme.on { color:var(--brass); font-style:italic; }
.mg-theme .dot { width:9px; height:9px; border-radius:1px; flex:none; opacity:.85; }
.mg-theme .ct { margin-left:auto; font-family:ui-monospace,monospace;
  font-size:11px; color:var(--sage); }
@media(max-width:760px){ .mg-theme{ width:auto; padding:6px 11px;
  border:1px solid var(--line); border-radius:999px; }
  .mg-theme.on{ border-color:var(--brass); } .mg-theme .ct{ display:none; } }

.mg-main { padding:34px 0 80px; min-width:0; }
.mg-count { font-family:ui-monospace,monospace; font-size:11px;
  letter-spacing:.18em; color:var(--sage); margin:0 0 18px; }

.mg-genrebar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }

/* book covers */
.mg-cover { flex:none; border-radius:2px; overflow:hidden; position:relative;
  box-shadow:0 1px 3px rgba(27,31,27,.2), 0 7px 18px rgba(27,31,27,.09); }
.mg-cover-thumb { width:60px; height:90px; }
.mg-cover-large { width:128px; height:192px; }
@media(max-width:560px){ .mg-cover-large{ width:108px; height:162px; } }
.mg-cover-img { width:100%; height:100%; object-fit:cover; display:block; }
.mg-cover-gen { width:100%; height:100%; display:flex; flex-direction:column;
  justify-content:space-between; box-shadow:inset 0 0 0 1px rgba(255,255,255,.15); }
.mg-cover-thumb .mg-cover-gen { padding:8px 7px; }
.mg-cover-large .mg-cover-gen { padding:16px 14px; }
.mg-cover-title { font-family:'Fraunces',serif; font-weight:600; color:var(--paper);
  line-height:1.16; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden; }
.mg-cover-thumb .mg-cover-title { font-size:10px; -webkit-line-clamp:5; }
.mg-cover-large .mg-cover-title { font-size:20px; -webkit-line-clamp:6; }
.mg-cover-author { font-family:ui-monospace,monospace; letter-spacing:.02em;
  color:rgba(255,255,255,.72); }
.mg-cover-large .mg-cover-author { font-size:10.5px; }

.mg-book { display:flex; gap:15px; align-items:flex-start; width:100%; text-align:left;
  background:transparent; border:none; cursor:pointer; padding:16px 6px;
  border-bottom:1px solid var(--line); border-radius:3px; transition:.16s; }
.mg-book:hover { background:rgba(31,58,46,.05); }
.mg-book-body { flex:1; min-width:0; }
.mg-title { font-family:'Fraunces',serif; font-weight:600; font-size:21px;
  line-height:1.2; margin:0 0 3px; }
.mg-author { font-family:ui-monospace,monospace; font-size:11.5px;
  letter-spacing:.04em; color:var(--sage); margin:0 0 9px; }
.mg-author .sep { opacity:.5; margin:0 6px; }
.mg-syn { font-size:15.5px; line-height:1.55; color:#3a3f39; margin:0 0 11px; }
.mg-pills { display:flex; flex-wrap:wrap; gap:7px; align-items:center; }
.mg-pill { font-family:ui-monospace,monospace; font-size:11px; letter-spacing:.04em;
  padding:2px 8px; border-radius:999px; color:#fff; }
.mg-disc { font-family:ui-monospace,monospace; font-size:11px; color:var(--sage);
  margin-left:auto; }

/* detail */
.mg-back { font-family:ui-monospace,monospace; font-size:12px; letter-spacing:.06em;
  color:var(--sage); background:none; border:none; cursor:pointer; padding:0;
  margin-bottom:22px; }
.mg-back:hover { color:var(--brass); }
.mg-detail-head { display:flex; gap:26px; margin-bottom:32px; align-items:flex-start; }
@media(max-width:560px){ .mg-detail-head{ flex-direction:column; gap:18px; } }
.mg-detail-body { flex:1; min-width:0; }
.mg-detail-title { font-family:'Fraunces',serif; font-weight:600;
  font-size:clamp(28px,5vw,38px); line-height:1.1; margin:0 0 6px; }
.mg-detail-syn { font-size:18px; line-height:1.6; color:#33372f; margin:14px 0 0;
  max-width:60ch; }

.mg-dh { font-family:ui-monospace,monospace; font-size:11px; letter-spacing:.2em;
  color:var(--sage); border-top:1px solid var(--line); padding-top:22px; margin:0 0 20px; }

.mg-comment { padding:0 0 20px; margin-bottom:20px; border-bottom:1px solid var(--line); }
.mg-comment:last-of-type { border-bottom:none; }
.mg-cmeta { display:flex; align-items:baseline; gap:10px; margin-bottom:6px; flex-wrap:wrap; }
.mg-cnick { font-family:'Fraunces',serif; font-weight:500; font-size:15px; }
.mg-cnick.anon { color:var(--sage); font-style:italic; font-weight:400; }
.mg-ctime { font-family:ui-monospace,monospace; font-size:11px; color:var(--sage); }
.mg-cbody { font-size:16.5px; line-height:1.65; color:#2c302a; margin:0; white-space:pre-wrap; }

.mg-cact { margin-top:7px; }
.mg-reply-btn { font-family:ui-monospace,monospace; font-size:11px; letter-spacing:.06em;
  color:var(--sage); background:none; border:none; cursor:pointer; padding:0; transition:.15s; }
.mg-reply-btn:hover { color:var(--brass); }
.mg-replies { margin-top:16px; padding-left:18px;
  border-left:2px solid rgba(168,124,61,.32); display:flex; flex-direction:column; gap:16px; }
.mg-replyto { font-family:ui-monospace,monospace; font-size:10.5px; color:var(--moss);
  letter-spacing:.03em; }
.mg-replybox { margin-top:11px; background:var(--paper2); border:1px solid var(--line);
  border-radius:4px; padding:13px; }
.mg-replybox .mg-area { background:var(--paper); }

.mg-empty { font-style:italic; color:var(--sage); font-size:16px; line-height:1.6;
  padding:8px 0 26px; }

.mg-form { margin-top:8px; background:var(--paper2); border-radius:4px;
  padding:18px; border:1px solid var(--line); }
.mg-input, .mg-area {
  width:100%; font-family:'Newsreader',serif; font-size:16px; color:var(--ink);
  background:var(--paper); border:1px solid var(--line); border-radius:3px;
  padding:10px 12px; margin-bottom:10px; resize:vertical; }
.mg-input:focus, .mg-area:focus { outline:none; border-color:var(--moss); }
.mg-input::placeholder, .mg-area::placeholder { color:#9aa094; }
.mg-formrow { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.mg-nick { max-width:200px; margin-bottom:0; }
.mg-hint { font-family:ui-monospace,monospace; font-size:11px; color:var(--sage);
  margin-left:auto; }

.mg-foot { text-align:center; font-family:ui-monospace,monospace; font-size:11px;
  letter-spacing:.1em; color:var(--sage); padding:30px 0 40px; }

.mg-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
.mg-chip { font-family:ui-monospace,monospace; font-size:12px; padding:6px 12px;
  border-radius:999px; border:1px solid var(--line); background:var(--paper);
  cursor:pointer; transition:.15s; color:var(--ink); }
.mg-chip:hover { border-color:var(--moss); }
.mg-chip.on { background:var(--bottle); color:var(--paper); border-color:var(--bottle); }

.mg-fadein { animation:mgf .5s ease both; }
@keyframes mgf { from{ opacity:0; transform:translateY(6px);} to{ opacity:1; transform:none;} }
@media(prefers-reduced-motion:reduce){ .mg-fadein{ animation:none; } }
`;

function Cover({ book, variant }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [book.coverUrl]);
  const color = spineOf(book.themes);
  const showImg = book.coverUrl && !failed;
  return (
    <div className={`mg-cover mg-cover-${variant}`}>
      {showImg ? (
        <img
          className="mg-cover-img"
          src={book.coverUrl}
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

export default function App() {
  const [books, setBooks] = useState(null);
  const [view, setView] = useState("list"); // list | detail | new
  const [theme, setTheme] = useState("全部");
  const [genre, setGenre] = useState("全部");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    (async () => {
      let b = await loadBooks();
      if (!b) {
        b = SEED_BOOKS.map((x) => ({
          ...x,
          id: uid(),
          coverUrl: null,
          createdAt: Date.now(),
        }));
        await saveBooks(b);
        for (const bk of b) {
          const seeds = SEED_COMMENTS[bk.title];
          if (seeds)
            await saveComments(
              bk.id,
              seeds.map((s) => ({ ...s, id: uid(), createdAt: Date.now() }))
            );
        }
      } else {
        // backfill genre for books saved before this field existed
        let changed = false;
        b = b.map((x) =>
          x.genre
            ? x
            : ((changed = true), { ...x, genre: GENRE_BY_TITLE[x.title] || "其他" })
        );
        if (changed) await saveBooks(b);
      }
      setBooks(b);
    })();
  }, []);

  const themeCounts = {};
  (books || []).forEach((b) =>
    (b.themes || []).forEach((t) => (themeCounts[t] = (themeCounts[t] || 0) + 1))
  );
  const usedThemes = Object.keys(themeCounts).sort(
    (a, b) => themeCounts[b] - themeCounts[a]
  );

  let shown = books || [];
  if (genre !== "全部") shown = shown.filter((b) => b.genre === genre);
  if (theme !== "全部")
    shown = shown.filter((b) => (b.themes || []).includes(theme));

  const openBook = (books || []).find((b) => b.id === openId);

  const addBook = async (data) => {
    const nb = { ...data, id: uid(), coverUrl: null, createdAt: Date.now() };
    const next = [nb, ...(books || [])];
    setBooks(next);
    await saveBooks(next);
    setOpenId(nb.id);
    setView("detail");
    // try to auto-fetch a real cover in the background
    const url = await fetchCover(nb.title, nb.author);
    if (url) {
      setBooks((cur) => {
        const updated = cur.map((b) =>
          b.id === nb.id ? { ...b, coverUrl: url } : b
        );
        saveBooks(updated);
        return updated;
      });
    }
  };

  return (
    <div className="mg-root">
      <style>{STYLES}</style>

      <header className="mg-header">
        <div className="mg-header-top">
          <div
            className="mg-brand"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setView("list");
              setOpenId(null);
            }}
          >
            <div className="mg-word">
              页边<small>MARGINALIA</small>
            </div>
          </div>
          <button className="mg-btn" onClick={() => setView("new")}>
            + 投一本书
          </button>
        </div>
        <div className="mg-epigraph">
          <p className="mg-epi-line">
            我们不争论对错，只留下你的想法——或许是初读时的印象，或许是你与一本书的故事。
          </p>
          <p className="mg-epi-poem">试问岭南应不好，却道：此心安处是吾乡。</p>
          <p className="mg-epi-attr">——苏轼《定风波》</p>
        </div>
      </header>

      {!books ? (
        <div className="mg-foot" style={{ paddingTop: 80 }}>
          正在打开书架……
        </div>
      ) : view === "new" ? (
        <NewBook onCancel={() => setView("list")} onSubmit={addBook} />
      ) : view === "detail" && openBook ? (
        <Detail
          book={openBook}
          onBack={() => {
            setView("list");
            setOpenId(null);
          }}
        />
      ) : (
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
                  <span className="ct">{(books || []).length}</span>
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
                <button
                  className="mg-back"
                  style={{ margin: 0, color: "var(--brass)" }}
                  onClick={() => setView("new")}
                >
                  投一本进来 →
                </button>
              </p>
            ) : (
              shown.map((b) => (
                <BookRow
                  key={b.id}
                  book={b}
                  onOpen={() => {
                    setOpenId(b.id);
                    setView("detail");
                  }}
                />
              ))
            )}
          </main>
        </div>
      )}

      <div className="mg-foot">无需登录 · 请友善讨论 · 所有议论公开可见</div>
    </div>
  );
}

function BookRow({ book, onOpen }) {
  const [n, setN] = useState(null);
  useEffect(() => {
    loadComments(book.id).then((c) => setN(c.length));
  }, [book.id]);
  return (
    <button className="mg-book" onClick={onOpen}>
      <Cover book={book} variant="thumb" />
      <div className="mg-book-body">
        <h3 className="mg-title">{book.title}</h3>
        <p className="mg-author">
          {book.author || "佚名"}
          {book.genre && (
            <>
              <span className="sep">·</span>
              {book.genre}
            </>
          )}
        </p>
        <p className="mg-syn">{book.synopsis}</p>
        <div className="mg-pills">
          {(book.themes || []).map((t) => (
            <span
              key={t}
              className="mg-pill"
              style={{ background: THEME_COLORS[t] || DEFAULT_SPINE }}
            >
              {t}
            </span>
          ))}
          <span className="mg-disc">
            {n === null ? "" : n > 0 ? `${n} 条议论` : "尚无议论"}
          </span>
        </div>
      </div>
    </button>
  );
}

function Detail({ book, onBack }) {
  const [comments, setComments] = useState(null);
  const [body, setBody] = useState("");
  const [nick, setNick] = useState("");
  const [openReplyFor, setOpenReplyFor] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyNick, setReplyNick] = useState("");
  const [busy, setBusy] = useState(false);
  const lastPost = useRef(0);

  useEffect(() => {
    loadComments(book.id).then(setComments);
  }, [book.id]);

  const postComment = async (rawText, rawNick, parentId, replyTo) => {
    const text = (rawText || "").trim();
    if (!text || text.length > 1200) return false;
    if (Date.now() - lastPost.current < 4000) return false; // light cooldown
    setBusy(true);
    const c = {
      id: uid(),
      nickname: (rawNick || "").trim() || "佚名",
      body: text,
      createdAt: Date.now(),
      parentId: parentId || null,
      replyTo: replyTo || null,
    };
    const next = [...(comments || []), c];
    setComments(next);
    await saveComments(book.id, next);
    lastPost.current = Date.now();
    setBusy(false);
    return true;
  };

  const postTop = async () => {
    if (await postComment(body, nick, null, null)) setBody("");
  };

  const startReply = (item) => {
    setOpenReplyFor(item.id);
    setReplyBody("");
    setReplyNick("");
  };

  const postReply = async () => {
    const target = (comments || []).find((x) => x.id === openReplyFor);
    if (!target) return;
    const ok = await postComment(
      replyBody,
      replyNick,
      target.parentId || target.id,
      target.nickname
    );
    if (ok) {
      setOpenReplyFor(null);
      setReplyBody("");
      setReplyNick("");
    }
  };

  const replyBox = (targetNick) => (
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
        <button className="mg-btn mg-btn-ghost" onClick={() => setOpenReplyFor(null)}>
          取消
        </button>
        <button
          className="mg-btn mg-btn-solid"
          onClick={postReply}
          disabled={busy || !replyBody.trim()}
          style={{ opacity: busy || !replyBody.trim() ? 0.5 : 1 }}
        >
          回复
        </button>
      </div>
    </div>
  );

  const renderNode = (c, isReply) => (
    <div key={c.id}>
      <div className="mg-cmeta">
        <span className={"mg-cnick" + (c.nickname === "佚名" ? " anon" : "")}>
          {c.nickname}
        </span>
        {c.replyTo && <span className="mg-replyto">回复 @{c.replyTo}</span>}
        <span className="mg-ctime">{timeAgo(c.createdAt)}</span>
      </div>
      <p className="mg-cbody" style={isReply ? { fontSize: "15.5px" } : undefined}>
        {c.body}
      </p>
      <div className="mg-cact">
        <button className="mg-reply-btn" onClick={() => startReply(c)}>
          ↳ 回复
        </button>
      </div>
      {openReplyFor === c.id && replyBox(c.nickname)}
    </div>
  );

  const topLevel = (comments || []).filter((c) => !c.parentId);

  return (
    <div className="mg-shell" style={{ gridTemplateColumns: "1fr" }}>
      <main className="mg-main mg-fadein" style={{ maxWidth: 760 }}>
        <button className="mg-back" onClick={onBack}>
          ← 回到书架
        </button>

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

        <p className="mg-dh">议论 · {comments ? comments.length : 0}</p>

        {comments === null ? (
          <p className="mg-empty">正在翻看……</p>
        ) : topLevel.length === 0 ? (
          <p className="mg-empty">还没有人在这本书旁写下字句。成为第一个。</p>
        ) : (
          topLevel.map((c) => {
            const replies = comments
              .filter((x) => x.parentId === c.id)
              .sort((a, b) => a.createdAt - b.createdAt);
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
              style={{
                opacity: busy || !body.trim() ? 0.5 : 1,
                cursor: busy || !body.trim() ? "default" : "pointer",
              }}
            >
              留下议论
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function NewBook({ onCancel, onSubmit }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState("小说");
  const [picked, setPicked] = useState([]);
  const [extraThemes, setExtraThemes] = useState([]);
  const [customInput, setCustomInput] = useState("");

  const toggle = (t) =>
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const addCustom = () => {
    const t = customInput.trim();
    if (!t) return;
    if (![...ALL_THEMES, ...extraThemes].includes(t))
      setExtraThemes((e) => [...e, t]);
    setPicked((p) => (p.includes(t) ? p : [...p, t]));
    setCustomInput("");
  };

  const submit = () => {
    if (!title.trim() || !synopsis.trim()) return;
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      synopsis: synopsis.trim(),
      genre,
      themes: picked,
    });
  };

  return (
    <div className="mg-shell" style={{ gridTemplateColumns: "1fr" }}>
      <main className="mg-main mg-fadein" style={{ maxWidth: 640 }}>
        <button className="mg-back" onClick={onCancel}>
          ← 取消
        </button>
        <h1 className="mg-detail-title" style={{ marginBottom: 6 }}>
          投一本书
        </h1>
        <p className="mg-empty" style={{ padding: "0 0 22px" }}>
          书名、一句简介、体裁和它触及的主题。封面会自动去找——找不到也没关系，会用一张排版封面顶上。
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
              style={{ opacity: customInput.trim() ? 1 : 0.5 }}
            >
              + 添加主题
            </button>
          </div>

          <div className="mg-formrow" style={{ marginTop: 8 }}>
            <button className="mg-btn mg-btn-ghost" onClick={onCancel}>
              取消
            </button>
            <button
              className="mg-btn mg-btn-solid"
              onClick={submit}
              disabled={!title.trim() || !synopsis.trim()}
              style={{ opacity: !title.trim() || !synopsis.trim() ? 0.5 : 1 }}
            >
              放上书架
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
