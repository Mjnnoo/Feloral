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

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">در حال بررسی ورود...</main>;

  return (
    <main className="min-h-screen bg-[#09090b] px-5 py-10 text-white">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.06] p-7 shadow-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.45em] text-amber-200/80">FELORAL ADMIN</p>
          <h1 className="text-3xl font-black tracking-[-0.04em]">پنل مدیریت فلورال</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/60">مشتری‌ها فقط صفحه اصلی سایت را می‌بینند. ویرایشگر فقط از این بخش و بعد از ورود مدیر فعال می‌شود.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <a href="/?editor=1&admin=1" className="rounded-[28px] border border-amber-200/25 bg-amber-200 px-6 py-6 text-black shadow-xl transition hover:bg-white">
            <span className="block text-xl font-black">باز کردن ویرایشگر سایت</span>
            <span className="mt-3 block text-sm font-bold text-black/65">صفحه مشتری با ابزار ویرایش فقط برای مدیر باز می‌شود.</span>
          </a>
          <a href="/" className="rounded-[28px] border border-white/10 bg-white/[0.06] px-6 py-6 text-white transition hover:bg-white/[0.1]">
            <span className="block text-xl font-black">مشاهده صفحه مشتری</span>
            <span className="mt-3 block text-sm font-bold text-white/55">
  این همان صفحه‌ای است که کاربران عادی می‌بینند.
</span>
          </a>
          <button onClick={() => { clearAdminSession(); window.location.replace("/admin/login"); }} className="rounded-[28px] border border-red-400/25 bg-red-500/10 px-6 py-6 text-right text-red-100 transition hover:bg-red-500/20 md:col-span-2">
            <span className="block text-xl font-black">خروج از پنل مدیریت</span>
            <span className="mt-3 block text-sm font-bold text-red-100/70">
  بعد از خروج، ویرایشگر سایت دیگر باز نمی‌شود.
</span>
          </button>
        </div>
      </section>
    </main>
  );
}
