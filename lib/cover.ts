// 封面自动查找（Open Library，免费无 key）。英文书为主，中文书常查不到——
// 查不到就返回 null，由前端用主题色生成的排版封面兜底（见 Cover 组件）。
// 后续第 5 步可在此前置豆瓣源、加缓存。
export async function fetchCover(
  title: string,
  author?: string
): Promise<string | null> {
  try {
    const q = new URLSearchParams({
      title: title || "",
      limit: "1",
      fields: "cover_i",
    });
    if (author) q.set("author", author);
    const r = await fetch(`https://openlibrary.org/search.json?${q}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { docs?: { cover_i?: number }[] };
    const d = j.docs && j.docs[0];
    if (d && d.cover_i) {
      return `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`;
    }
  } catch {
    /* 离线 / 被墙 / 查不到 → 交给生成封面兜底 */
  }
  return null;
}
