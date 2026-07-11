import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Camera, Upload } from "lucide-react";

export default function AiBeautyPage() {
  return (
    <>
      <SiteHeader />
      <main className="luxury-container py-14">
        <section className="dark-luxury rounded-[2rem] p-10 text-white shadow-luxury">
          <span className="text-sm font-bold text-gold">AI Beauty Studio</span>
          <h1 className="mt-4 font-display text-5xl font-black leading-[1.35]">
            تست هوشمند رژ لب با عکس یا دوربین زنده
          </h1>
          <p className="mt-5 max-w-2xl leading-8 text-champagne/70">
            این صفحه فعلاً اسکلت UI است. در فاز بعد، پردازش لب و رنگ رژ را با مدل بینایی یا سرویس AI به آن وصل می‌کنیم.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <button className="rounded-[1.5rem] border border-gold/20 bg-white/5 p-8 text-right transition hover:bg-white/10">
              <Upload className="mb-5 text-gold" size={36} />
              <h2 className="text-xl font-bold">آپلود عکس</h2>
              <p className="mt-3 text-sm leading-7 text-champagne/65">مشتری عکس خودش را می‌فرستد و رنگ رژ روی لب شبیه‌سازی می‌شود.</p>
            </button>
            <button className="rounded-[1.5rem] border border-gold/20 bg-white/5 p-8 text-right transition hover:bg-white/10">
              <Camera className="mb-5 text-gold" size={36} />
              <h2 className="text-xl font-bold">حالت زنده</h2>
              <p className="mt-3 text-sm leading-7 text-champagne/65">بعداً با WebRTC دوربین باز می‌شود و پیش‌نمایش زنده نشان داده می‌شود.</p>
            </button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
