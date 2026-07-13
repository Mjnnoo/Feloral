"use client";

import { useEffect, useState } from "react";
import { clearAdminSession, hasAdminToken } from "@/lib/cms-editor-access";

export default function AdminDashboardPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!hasAdminToken()) {
      window.location.replace("/admin/login?next=/admin");
      return;
    }
    setReady(true);
  }, []);

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒ ÙˆØ±ÙˆØ¯...</main>;

  return (
    <main className="min-h-screen bg-[#09090b] px-5 py-10 text-white">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.06] p-7 shadow-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.45em] text-amber-200/80">FELORAL ADMIN</p>
          <h1 className="text-3xl font-black tracking-[-0.04em]">Ù¾Ù†Ù„ Ù…Ø¯ÛŒØ±ÛŒØª ÙÙ„ÙˆØ±Ø§Ù„</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/60">Ù…Ø´ØªØ±ÛŒâ€ŒÙ‡Ø§ ÙÙ‚Ø· ØµÙØ­Ù‡ Ø§ØµÙ„ÛŒ Ø³Ø§ÛŒØª Ø±Ø§ Ù…ÛŒâ€ŒØ¨ÛŒÙ†Ù†Ø¯. ÙˆÛŒØ±Ø§ÛŒØ´Ú¯Ø± ÙÙ‚Ø· Ø§Ø² Ø§ÛŒÙ† Ø¨Ø®Ø´ Ùˆ Ø¨Ø¹Ø¯ Ø§Ø² ÙˆØ±ÙˆØ¯ Ù…Ø¯ÛŒØ± ÙØ¹Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <a href="/?editor=1&admin=1" className="rounded-[28px] border border-amber-200/25 bg-amber-200 px-6 py-6 text-black shadow-xl transition hover:bg-white">
            <span className="block text-xl font-black">Ø¨Ø§Ø² Ú©Ø±Ø¯Ù† ÙˆÛŒØ±Ø§ÛŒØ´Ú¯Ø± Ø³Ø§ÛŒØª</span>
            <span className="mt-3 block text-sm font-bold text-black/65">ØµÙØ­Ù‡ Ù…Ø´ØªØ±ÛŒ Ø¨Ø§ Ø§Ø¨Ø²Ø§Ø± ÙˆÛŒØ±Ø§ÛŒØ´ ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ù…Ø¯ÛŒØ± Ø¨Ø§Ø² Ù…ÛŒâ€ŒØ´ÙˆØ¯.</span>
          </a>
          <a href="/" className="rounded-[28px] border border-white/10 bg-white/[0.06] px-6 py-6 text-white transition hover:bg-white/[0.1]">
            <span className="block text-xl font-black">Ù…Ø´Ø§Ù‡Ø¯Ù‡ ØµÙØ­Ù‡ Ù…Ø´ØªØ±ÛŒ</span>
            <span className="mt-3 block text-sm font-bold text-white/55">Ø§ÛŒÙ† Ù‡Ù…Ø§Ù† ØµÙØ­Ù‡â€ŒØ§ÛŒ Ø§Ø³Øª Ú©Ù‡ Ú©Ø§Ø±Ø¨Ø±Ø§Ù† Ø¹Ø§Ø¯ÛŒ Ù…ÛŒâ€ŒØ¨ÛŒÙ†Ù†Ø¯.</span>
          </a>
          <button onClick={() => { clearAdminSession(); window.location.replace("/admin/login"); }} className="rounded-[28px] border border-red-400/25 bg-red-500/10 px-6 py-6 text-right text-red-100 transition hover:bg-red-500/20 md:col-span-2">
            <span className="block text-xl font-black">Ø®Ø±ÙˆØ¬ Ø§Ø² Ù¾Ù†Ù„ Ù…Ø¯ÛŒØ±ÛŒØª</span>
            <span className="mt-3 block text-sm font-bold text-red-100/70">Ø¨Ø¹Ø¯ Ø§Ø² Ø®Ø±ÙˆØ¬ØŒ ÙˆÛŒØ±Ø§ÛŒØ´Ú¯Ø± Ø³Ø§ÛŒØª Ø¯ÛŒÚ¯Ø± Ø¨Ø§Ø² Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.</span>
          </button>
        </div>
      </section>
    </main>
  );
}
