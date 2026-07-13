"use client";

import { FormEvent, useEffect, useState } from "react";
import { getApiBaseUrl, hasAdminToken, setAdminSession } from "@/lib/cms-editor-access";

function extractToken(payload: any): string {
  return payload?.accessToken || payload?.access_token || payload?.token || payload?.jwt || payload?.data?.accessToken || payload?.data?.access_token || payload?.data?.token || "";
}

export default function AdminLoginPage() {
  const [mobile, setMobile] = useState("09121111111");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasAdminToken()) {
      const params = new URLSearchParams(window.location.search);
      window.location.replace(params.get("next") || "/admin");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "ÙˆØ±ÙˆØ¯ Ù†Ø§Ù…ÙˆÙÙ‚ Ø¨ÙˆØ¯.");
      const token = extractToken(payload);
      if (!token) throw new Error("ØªÙˆÚ©Ù† ÙˆØ±ÙˆØ¯ Ø§Ø² Ø¨Ú©â€ŒØ§Ù†Ø¯ Ø¯Ø±ÛŒØ§ÙØª Ù†Ø´Ø¯.");
      setAdminSession(token);
      const params = new URLSearchParams(window.location.search);
      window.location.replace(params.get("next") || "/admin");
    } catch (err: any) {
      setError(err?.message || "Ø®Ø·Ø§ Ø¯Ø± ÙˆØ±ÙˆØ¯ Ø¨Ù‡ Ù¾Ù†Ù„ Ù…Ø¯ÛŒØ±ÛŒØª.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-5 py-10 text-white">
      <section className="mx-auto flex min-h-[80vh] w-full max-w-[460px] items-center justify-center">
        <form onSubmit={submit} className="w-full rounded-[32px] border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.45em] text-amber-200/80">FELORAL ADMIN</p>
            <h1 className="text-3xl font-black tracking-[-0.04em]">ÙˆØ±ÙˆØ¯ Ø¨Ù‡ Ù¾Ù†Ù„ Ù…Ø¯ÛŒØ±ÛŒØª</h1>
            <p className="mt-3 text-sm leading-7 text-white/55">ØµÙØ­Ù‡ ÙˆÛŒØ±Ø§ÛŒØ´ Ø³Ø§ÛŒØª Ø§Ø² ØµÙØ­Ù‡ Ù…Ø´ØªØ±ÛŒ Ø¬Ø¯Ø§ Ø´Ø¯Ù‡ Ùˆ ÙÙ‚Ø· Ø¨Ø¹Ø¯ Ø§Ø² ÙˆØ±ÙˆØ¯ Ù…Ø¯ÛŒØ± ÙØ¹Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.</p>
          </div>
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-bold text-white/75">Ù…ÙˆØ¨Ø§ÛŒÙ„ Ù…Ø¯ÛŒØ±</span>
            <input value={mobile} onChange={(event) => setMobile(event.target.value)} dir="ltr" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-left text-white outline-none transition focus:border-amber-200/70" placeholder="09121111111" autoComplete="username" />
          </label>
          <label className="mb-6 block">
            <span className="mb-2 block text-sm font-bold text-white/75">Ø±Ù…Ø² Ø¹Ø¨ÙˆØ±</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" type="password" className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-left text-white outline-none transition focus:border-amber-200/70" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" autoComplete="current-password" />
          </label>
          {error ? <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-7 text-red-100">{error}</div> : null}
          <button disabled={busy} className="w-full rounded-2xl bg-amber-200 px-5 py-4 text-sm font-black text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Ø¯Ø± Ø­Ø§Ù„ ÙˆØ±ÙˆØ¯..." : "ÙˆØ±ÙˆØ¯ Ø¨Ù‡ Ù…Ø¯ÛŒØ±ÛŒØª"}</button>
        </form>
      </section>
    </main>
  );
}
