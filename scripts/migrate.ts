// 用 neon-http 驱动应用迁移（走 HTTP，绕开 drizzle-kit + Neon 的 websocket 问题）。
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { neon } = await import("@neondatabase/serverless");
  const { migrate } = await import("drizzle-orm/neon-http/migrator");

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 未设置（.env.local）。");

  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("迁移已应用。");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
