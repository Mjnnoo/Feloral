import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { aiFeatures } from "@/data/home-v2";

export function AiAtelierV2() {
  return (
    <section className="luxury-container mt-28">
      <div className="dark-luxury luxury-noise overflow-hidden rounded-[2.6rem] border border-[#c99a42]/18 text-white shadow-[0_40px_120px_rgba(12,8,3,.32)]">
        <div className="grid lg:grid-cols-[.88fr_1.12fr]">
          <div className="relative min-h-[560px] border-b border-white/8 p-9 md:p-14 lg:border-b-0 lg:border-l">
            <span className="rounded-full border border-[#c99a42]/28 bg-[#c99a42]/10 px-5 py-2 text-sm font-black text-[#e6c37a]">
              Feloral AI Atelier
            </span>
            <h2 className="mt-9 font-display text-5xl font-black leading-[1.3] md:text-6xl">
              فروشگاهی که
              <span className="gold-text block">هم می‌فروشد، هم راهنمایی می‌کند.</span>
            </h2>
            <p className="mt-7 max-w-xl text-sm leading-8 text-[#f8ead5]/65">
              قابلیت‌های هوشمند فلورال از همین معماری جدا شده‌اند: اطلاعات محصول، قیمت رقبا، تست رژ لب و تجربه ویدیویی رایحه.
            </p>

            <Link
              href="/ai-beauty"
              className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-[#c99a42] px-7 py-4 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#dfb866]"
            >
              ورود به تجربه هوشمند
              <ArrowLeft size={18} />
            </Link>

            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#c99a42]/18 blur-[80px]" />
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 md:p-8">
            {aiFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.8rem] border border-white/10 bg-white/[.045] p-7 transition hover:border-[#c99a42]/35 hover:bg-white/[.07]">
                  <Icon className="mb-7 text-[#c99a42]" size={34} strokeWidth={1.45} />
                  <h3 className="text-lg font-black">{item.title}</h3>
                  <p className="mt-4 text-sm leading-8 text-[#f8ead5]/62">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
