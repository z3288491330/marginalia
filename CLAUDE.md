@AGENTS.md

# 页边 / Marginalia — 项目交接文档

> 这份文档是从一段 claude.ai 对话里提炼出来的项目上下文，用于在 Claude Code 里继续开发。
> 放在项目根目录，Claude Code 每次会话都会自动读取它作为长期记忆。

## 一句话
一个**文学书籍的匿名讨论站**：每本书有书名、简介、体裁、主题和封面，访客无需登录即可留下评论与回复。调性轻松，不严肃。

## 当前状态
原型见 `marginalia.jsx`（仅作 UI/交互/设计的事实来源）。**部署版已搭好骨架**（截至 2026-06-22）：

- 技术栈：**Next.js 16 App Router + TS + React 19 + Drizzle ORM + Neon Postgres**（用户已选 Neon 免费版）。
- 已完成：脚手架、数据层（`lib/db/schema.ts`，迁移在 `drizzle/`）、API 路由（投稿写 `pending` 先审后显，前台只查 `approved`）、UI 全量迁移（真实路由：`/` 书架、`/book/[id]` 详情+楼中楼、`/submit` 投稿）、种子脚本 `scripts/seed.ts`、README。typecheck + lint 通过。开工待办第 2 项（审核流）已落地，第 6 项主题已补到 20 个。
- **数据库已接通并本地验证通过**（2026-06-22）：用户的 Neon 免费项目（region：AWS 新加坡，PG18）连接串已写入 `.env.local`（git 忽略）。已 `db:migrate` 建表 + `db:seed` 灌 7 本种子书 / 3 条议论；`npm run dev` 起站后首页 200、书详情 200、发评论写入成功，全链路 OK。
  - 两个 Windows 踩坑已绕过：① `drizzle-kit migrate` 用 Neon 会卡 websocket → 改成 `scripts/migrate.ts`（neon-http 驱动，HTTP）；② Next 遥测写 `AppData\Roaming` 触发 `EXDEV` 崩溃 → `.env.local` 里加了 `NEXT_TELEMETRY_DISABLED=1`。
- **管理后台已完成并验证（2026-06-22）**：`/admin`（未登录跳 `/admin/login`），密码取 `ADMIN_PASSWORD`（`.env.local` 现为临时密码 `marginalia-2026`，**上线前须改**），httpOnly cookie 存密码派生令牌。功能：待审投稿通过/驳回、删书（级联删评论）、删评论（级联删楼中楼）。审核流端到端测试通过（投稿→待审不可见→登录→通过→前台可见→删除）。代码见 `lib/auth.ts`、`app/admin/*`、`app/api/admin/*`、`components/AdminPanel.tsx`。
- **打底书目已扩充（2026-06-22）**：精选中外文学经典写入 `scripts/seed.ts`（已改为按书名幂等插入，可反复跑只补新书），库中现共 75 本（小说 51 / 戏剧 10 / 诗歌 6 / 随笔 5 / 散文 3），用到 29 个主题；`lib/taxonomy.ts` 主题色已补到 32 个。
- **服务端频率限制已落地（2026-06-22）**：`lib/ratelimit.ts` 改为数据库持久化（`rate_limits` 表 + Postgres 条件 upsert 原子限流，serverless 多实例可靠；IP 经 SHA-256 哈希不存明文）。评论 4s、投稿 10s 冷却，已测（连发第二条 429、隔时恢复 200）。**第 3 项剩 Turnstile 人机验证**——需用户的 Cloudflare 密钥，留到部署时接。
- **已上线（2026-06-22）🎉**：托管在 **Netlify** → https://marginalia-books.netlify.app （Vercel 因账号风控验证卡住，改用 Netlify）。GitHub 仓库 https://github.com/z3288491330/marginalia （public，main）。Netlify 已连 GitHub，**push 到 main 自动重新部署**。环境变量 `DATABASE_URL`、`ADMIN_PASSWORD` 在 Netlify 后台配置。线上已验证：首页/书详情/书目 API(115 本)/后台鉴权跳转/发评论写库 全部正常。
- **下一步（可选）**：第 3 防刷收尾（Turnstile，需 Cloudflare 站点密钥）、第 5 封面服务升级。日常加书：改 `scripts/seed.ts` 的 `SEED_BOOKS` 后本地 `npm run db:seed`（直连同一 Neon 库，幂等）。

完整开发/部署说明见 `README.md`。

---

## 核心理念 / 调性
- **不争对错，只留想法。** 这是一处让人放松心灵、随意讨论的地方，不是写书评打分的地方。
- 页眉题记（已定稿，勿改文案）：
  - 白话：**我们不争论对错，只留下你的想法——或许是初读时的印象，或许是你与一本书的故事。**
  - 词（右下角小字 + 落款）：**试问岭南应不好，却道：此心安处是吾乡。 ——苏轼《定风波》**

---

## 已敲定的产品决策
- **站名**：页边（英文 Marginalia）。
- **免登录**：任何人可浏览、评论、投稿。
- **评论身份**：可选填昵称，不填显示「佚名」。**不做账号、不做通知、不做「我的」页**——别人回复你，回到网站在帖子里看即可。
- **回复**：楼中楼，一层嵌套，回复会标注「回复 @某人」，回复的回复仍归入同一顶层楼。
- **投稿**：网友可投稿新书，但**先审后显**——投稿进入待审队列，管理员通过后才上架（防乱传）。
- **两个分类维度**（并存、可叠加筛选）：
  - 体裁：小说 / 诗歌 / 戏剧 / 散文 / 随笔 / 其他（单选）。
  - 主题：存在主义、虚无主义、荒诞、异化…（多选），**并支持用户自定义主题**。
- **封面**（优先级）：① 先尝试豆瓣源（注意：豆瓣已无官方开放 API，多半难接、且有 ToS 风险，作为锦上添花去试）→ ② Open Library 封面 API（covers.openlibrary.org，免费无 key，但以英文书为主，中文书常查不到）→ ③ 都没有就用**生成的排版封面**（主题色作底 + 印书名作者，永不失败）。
- **不做全站搜索**：刻意保留「闲逛偶遇一本读过的书就聊两句」的氛围；书目大到翻不动时再加轻量过滤。

---

## 设计规范（沿用原型，已在 marginalia.jsx 实现）
- **气质**：老式阅览室 / 墨绿基调，避开"米色纸张+衬线+赭红"那套套路。
- **配色**：ink `#1B1F1B` · paper `#EFEDE4` · bottle green `#1F3A2E`（页眉）· moss `#4A6B52` · brass `#A87C3D`（点缀/主行动）· sage `#6E7468`（元信息）。
- **字体**：Fraunces（标题/封面）· Newsreader（正文阅读）· 系统等宽（标签、时间、作者等元信息）。
- **签名元素**：① 书目封面用主题色生成的排版封面；② 楼中楼回复用黄铜色竖线分组。

---

## 数据模型（部署版建议）
- **books**：`{ id, title, author, genre, themes[], synopsis, coverUrl, status: 'pending' | 'approved', createdAt }`
- **comments**：`{ id, bookId, parentId(可空), replyTo(可空), nickname, body, createdAt }`
- 主题颜色映射、生成封面逻辑、体裁列表都在 `marginalia.jsx` 里，可直接迁移。
- （部署版实现：见 `lib/db/schema.ts`、`lib/taxonomy.ts`。）

---

## 开工待办（按此推进）
1. **选技术栈并搭好部署**：前端 Next.js/React + 数据库 Postgres（如 Supabase）+ 托管（Vercel 或 $5/月 VPS）。把原型的 `window.storage` 调用替换为真实后端 API。✅ **已完成**（Next.js 16 + Drizzle + Neon；见「当前状态」）。
   - **休眠对策（重要）**：Supabase 免费档在 **7 天无活动后会自动暂停**，暂停期间访客看到空白页，且**若一直暂停约 90 天会被永久删除、免费档无备份**。
     - 优先选 **always-on 的 $5/月 VPS**，从根上没有休眠问题。
     - **若使用 Supabase 免费档，则必须配两样**：① **心跳**——免费定时任务（GitHub Actions cron 或 UptimeRobot），每隔几天 ping 一次数据库/接口，重置不活跃计时器，使其永不暂停；② **定期备份**——定时 `pg_dump` 导出（如每周一次存到对象存储/本地），专门防那个 90 天删除。
     - **注**：已改用 Neon 免费档——闲置秒级唤醒、不像 Supabase 那样 90 天删库，暂不需上面那套对策。若日后换 Supabase 再补。
2. **投稿审核流**：投稿写入 `status='pending'`；前台只展示 `approved`；管理员后台可通过/驳回。✅ **前两步已完成**（投稿写 pending、前台只显 approved）；管理员通过/驳回属第 4 步管理后台。
3. **防刷**：服务器端评论频率限制 + 验证码（Cloudflare Turnstile，免费）。🔶 **频率限制已完成**（`lib/ratelimit.ts` 数据库持久化原子限流，评论 4s/投稿 10s 冷却）；**剩 Turnstile** 待接（需 Cloudflare 站点密钥，建议部署时一起配，加到投稿/评论表单 + 服务端校验）。
4. **管理后台**（需登录保护）：审稿、删评论、删书。✅ **已完成**（`/admin`，密码 `ADMIN_PASSWORD`，cookie 会话；见「当前状态」）。
5. **封面服务**：按上面的优先级实现，带生成封面兜底。（现有 `lib/cover.ts` Open Library + 生成兜底，待前置豆瓣 + 缓存。）
6. **精选打底书目**：先由 Claude 精选数百本文学经典/热门书（配简介、体裁、主题），并据此**补全主题列表**；其余靠投稿生长。容量无忧——几千本短文本在免费数据库里占用极小。✅ **已完成**（已精选约 68 本中外经典写入 `scripts/seed.ts`，库中共 75 本；主题色补到 32 个，见 `lib/taxonomy.ts`。日后想继续扩充，直接往 `SEED_BOOKS` 加条目再 `npm run db:seed` 即可，幂等不重复）。
7. （可选，若日后想要邮件提醒）发信用 Resend 之类的免费额度。

## 成本 / 托管参考
- 免费档：Vercel + Supabase 免费层 ≈ ¥0/月。**但必须配心跳 + 定期备份**，否则会休眠、甚至 90 天后被删（见开工待办第 1 条）。
- 稳定档：约 $5/月（¥35）的 VPS，全在线、不休眠，省去上面那套对策。**推荐**。
- 域名：约 ¥100/年（可选，初期也可用免费二级域名）。

---

## 文件清单
- `CLAUDE.md`：本文档。
- `marginalia.jsx`：可运行原型（画布版）。是 UI/交互/设计的事实来源；部署版已据此迁移。
- `AGENTS.md`：create-next-app 生成的 Next.js 规则（提醒此版 Next.js 有破坏性变更）。
- `README.md`：部署版的开发/部署说明与目录结构。
