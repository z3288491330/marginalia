"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!password) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "登录失败");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setErr("网络不太顺，稍后再试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mg-shell" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <main className="mg-main mg-fadein" style={{ maxWidth: 420 }}>
        <h1 className="mg-detail-title" style={{ marginBottom: 18 }}>
          管理后台
        </h1>
        <div className="mg-form">
          <input
            className="mg-input"
            type="password"
            placeholder="管理员密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            autoFocus
          />
          {err && <p className="mg-err">{err}</p>}
          <div className="mg-formrow">
            <button
              className="mg-btn mg-btn-solid"
              onClick={submit}
              disabled={busy || !password}
            >
              {busy ? "登录中…" : "登录"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
