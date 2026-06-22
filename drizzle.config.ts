import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js 用 .env.local；drizzle-kit / 种子脚本走 tsx，需显式加载。
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
