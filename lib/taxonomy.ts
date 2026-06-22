// 体裁（单选）与主题（多选、可自定义）。原型里的映射迁到这里，作为前后端共享的事实来源。
export const GENRES = ["小说", "诗歌", "戏剧", "散文", "随笔", "其他"] as const;
export type Genre = (typeof GENRES)[number];

// 主题 → 主题色（用于生成排版封面、书脊、标签）。按 CLAUDE.md 第 6 条补全。
export const THEME_COLORS: Record<string, string> = {
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
  记忆: "#4A5E6E",
  流亡: "#6E5A33",
  成长: "#4F6B3E",
  战争: "#7A3A33",
  信仰: "#445577",
  爱情: "#8A4A5A",
  时间: "#4A5A5A",
  命运: "#5E4A6E",
  乡愁: "#6E6A4A",
  身份认同: "#3A5E5E",
  历史: "#6B5A3E",
  家庭: "#7A5550",
  女性: "#8A5A6E",
  童年: "#5A7A6E",
  自然: "#3E6B4E",
  乡土: "#6B6A3E",
  理想: "#4A5E8A",
  苦难: "#6E4A4A",
  青春: "#4A7A7A",
  权力: "#7A4A4A",
  城市: "#55606E",
  美: "#8A6A8A",
};

export const ALL_THEMES = Object.keys(THEME_COLORS);
export const DEFAULT_SPINE = "#4A6B52";

export const spineOf = (themes?: string[] | null): string =>
  (themes && themes[0] && THEME_COLORS[themes[0]]) || DEFAULT_SPINE;
