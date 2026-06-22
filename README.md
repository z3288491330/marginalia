# 页边 / Marginalia

一处文学书籍的匿名讨论站。每本书有书名、简介、体裁、主题与封面，访客无需登录即可留下评论与回复。

> 调性、设计、产品决策见 [`CLAUDE.md`](./CLAUDE.md)。UI/交互沿用原型 [`marginalia.jsx`](./marginalia.jsx)。

## 技术栈

- **Next.js 16**（App Router）+ TypeScript + React 19
- **Drizzle ORM** + **Neon**（Serverless Postgres，免费档）
- 样式：原型的自定义 CSS（墨绿阅览室基调），字体 Fraunces / Newsreader

## 本地开发

1. 安装依赖：

   ```bash
   npm install
   ```

2. 配置数据库（Neon）：

   - 到 https://neon.tech 注册并新建一个免费项目；
   - 复制它给的连接串（带 `?sslmode=require` 的那条）；
   - 复制 `.env.example` 为 `.env.local`，把连接串填入 `DATABASE_URL`。

3. 建表 + 写入打底书目：

   ```bash
   npm run db:migrate   # 应用 drizzle/ 下的迁移到 Neon
   npm run db:seed      # 写入 7 本种子书与示例议论（仅在空库时）
   ```

4. 启动：

   ```bash
   npm run dev
   ```

   打开 http://localhost:3000 。

## 数据库脚本

| 命令 | 作用 |
| --- | --- |
| `npm run db:generate` | 改了 `lib/db/schema.ts` 后，生成新的 SQL 迁移文件到 `drizzle/` |
| `npm run db:migrate` | 把迁移应用到数据库 |
| `npm run db:push` | 开发期免迁移、直接把 schema 推到库（慎用于生产） |
| `npm run db:seed` | 写入打底书目（空库时） |

## 目录结构

```
app/
  layout.tsx              全站页眉/题记/页脚
  page.tsx                首页书架（服务端取数）
  book/[id]/page.tsx      书详情 + 议论（服务端取数）
  submit/page.tsx         投稿页（投稿先审后显）
  admin/login/page.tsx    管理员登录
  admin/page.tsx          管理后台（审稿 / 删书 / 删评论）
  api/books/route.ts              GET 列表 / POST 投稿(pending)
  api/books/[id]/route.ts         GET 单本
  api/books/[id]/comments/route.ts GET 议论 / POST 发表
  api/admin/login|logout/route.ts 管理员登录 / 登出
  api/admin/books/[id]/route.ts   PATCH 通过 / DELETE 驳回或删书
  api/admin/comments/[id]/route.ts DELETE 删评论
components/
  Shelf.tsx               书架 + 体裁/主题筛选
  Cover.tsx               封面（真实图片 / 主题色生成兜底）
  Comments.tsx            议论区 + 楼中楼回复
  AdminPanel.tsx          管理后台面板
lib/
  db/schema.ts            books / comments 表
  db/index.ts             Neon + Drizzle 客户端（惰性初始化）
  queries.ts              共享读查询
  taxonomy.ts             体裁、主题色映射
  cover.ts                Open Library 封面查找
  ratelimit.ts            评论/投稿冷却（占位，待接 Turnstile）
  format.ts               相对时间
scripts/seed.ts           打底书目种子
```

## 待办（详见 CLAUDE.md「开工待办」）

- [x] 1. 技术栈 + 部署骨架（本仓库）
- [x] 2. 投稿审核流（投稿写 `pending`，前台只显 `approved`）
- [x] 4. 管理后台（登录保护）：审稿、删评论、删书 —— 见下「管理后台」
- [x] 6. 打底书目：已精选约 68 本中外经典（共 75 本），主题色补到 32 个；`SEED_BOOKS` 加条目后 `npm run db:seed` 可幂等补充
- [~] 3. 防刷：服务端频率限制已落地（`rate_limits` 表，DB 原子限流，评论 4s/投稿 10s）；**剩 Cloudflare Turnstile** 待接（需站点密钥）
- [ ] 5. 封面服务：前置豆瓣源、加缓存（现有 Open Library + 生成兜底）

## 管理后台

- 访问 `/admin`（未登录会跳到 `/admin/login`）。
- 密码取自环境变量 `ADMIN_PASSWORD`。登录后用一个 httpOnly cookie 维持 30 天会话（cookie 存的是密码派生令牌，非明文）。
- 功能：待审投稿「通过上架 / 驳回删除」、已上架书目「删除」（连带其议论）、最近议论「删除」。
- ⚠️ 仓库 `.env.local` 里目前是临时密码，**上线前务必改成你自己的强密码**，并在部署平台（Vercel）的环境变量里设置 `ADMIN_PASSWORD`。

## 部署

推荐 **Vercel + Neon**：

1. 把仓库推到 GitHub，在 Vercel 导入；
2. 在 Vercel 项目的环境变量里设置 `DATABASE_URL`（Neon 连接串）；
3. 部署后用 `npm run db:migrate`（指向同一连接串）建表，再 `npm run db:seed`。

> Neon 免费档闲置会休眠但访问时秒级唤醒，且不像 Supabase 那样 90 天删库，省去心跳/备份那套。若日后改用 Supabase 免费档，务必补「心跳 + 定期 pg_dump 备份」（见 CLAUDE.md）。
