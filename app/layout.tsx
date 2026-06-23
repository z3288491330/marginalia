import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "页边 / Marginalia",
  description:
    "一处文学书籍的匿名讨论站。我们不争论对错，只留下你的想法——或许是初读时的印象，或许是你与一本书的故事。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh">
      <body>
        <div className="mg-root">
          <header className="mg-header">
            <div className="mg-header-top">
              <Link href="/" className="mg-brand" style={{ cursor: "pointer" }}>
                <div className="mg-word">
                  页边<small>MARGINALIA</small>
                </div>
              </Link>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="mailto:zhe99778@outlook.com?subject=%E9%A1%B5%E8%BE%B9%E7%BD%91%E7%AB%99%E5%BB%BA%E8%AE%AE"
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12.5,
                    letterSpacing: ".06em",
                    color: "#C4CFBA",
                  }}
                >
                  ✉ 提建议
                </a>
                <Link href="/submit" className="mg-btn">
                  + 投一本书
                </Link>
              </div>
            </div>
            <div className="mg-epigraph">
              <p className="mg-epi-line">
                我们不争论对错，只留下你的想法——或许是初读时的印象，或许是你与一本书的故事。
              </p>
              <p className="mg-epi-poem">
                试问岭南应不好，却道：此心安处是吾乡。
              </p>
              <p className="mg-epi-attr">——苏轼《定风波》</p>
            </div>
          </header>

          {children}

          <div className="mg-foot">
            无需登录 · 请友善讨论 · 所有议论公开可见
            <br />
            对页边有建议？欢迎来信{" "}
            <a
              href="mailto:zhe99778@outlook.com?subject=%E9%A1%B5%E8%BE%B9%E7%BD%91%E7%AB%99%E5%BB%BA%E8%AE%AE"
              style={{ color: "var(--brass)" }}
            >
              zhe99778@outlook.com
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
