import { ChevronLeft } from "lucide-react";
import { LuxuryButton } from "@/components/ui/luxury-button";

export function HeroSection() {
  return (
    <section className="luxury-container pt-8">
      <div className="dark-luxury relative min-h-[560px] overflow-hidden rounded-[2.2rem] border border-gold/20 shadow-luxury">
        <div className="absolute inset-0 opacity-55">
          <div className="absolute left-24 top-20 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute bottom-10 right-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="absolute inset-y-0 left-0 hidden w-1/2 lg:block">
          <div className="absolute left-20 top-24 h-[360px] w-[210px] rounded-[3rem] border border-gold/30 bg-gradient-to-b from-gold/70 via-black to-black shadow-[0_30px_120px_rgba(201,154,66,.26)]">
            <div className="mx-auto mt-10 h-20 w-20 rounded-t-3xl bg-gradient-to-b from-[#f5d48b] to-[#8a5c18]" />
            <div className="mx-auto mt-12 grid h-36 w-32 place-items-center border border-gold/30 bg-white/8 text-center">
              <span className="font-display text-2xl tracking-[.25em] text-gold">FELORAL</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-[560px] items-center">
          <div className="max-w-2xl px-10 py-16 lg:px-20">
            <span className="mb-7 inline-flex rounded-full border border-gold/25 bg-gold/10 px-5 py-2 text-sm font-medium text-gold">
              کالکشن امضای فلورال
            </span>
            <h1 className="font-display text-5xl font-black leading-[1.35] text-white md:text-7xl">
              تجربه‌ای از لوکس بودن،
              <span className="gold-text block">در هر لحظه</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-9 text-champagne/78">
              عطرها، میکاپ و زیبایی در فضایی طراحی‌شده برای کشف رایحه، مقایسه هوشمند و خریدی مطمئن.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <LuxuryButton href="/shop">مشاهده محصولات</LuxuryButton>
              <LuxuryButton href="/ai-beauty" variant="light">
                تجربه هوشمند زیبایی <ChevronLeft size={18} />
              </LuxuryButton>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-1/2 flex translate-x-1/2 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <span key={item} className={`h-2 rounded-full ${item === 1 ? "w-8 bg-gold" : "w-2 bg-white/40"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
