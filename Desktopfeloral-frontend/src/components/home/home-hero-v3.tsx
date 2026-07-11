import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HomeHeroV3() {
  return (
    <section className="bg-[#070707] pb-0">
      <div className="luxury-container">
        <div className="relative min-h-[352px] overflow-hidden rounded-2xl border border-white/12 bg-[#090909] ref-hero-shadow">
          <img
            src="/products/hero-perfume.png"
            alt="Feloral perfume hero"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/82 via-black/34 to-black/8" />

          <button className="absolute right-6 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-white transition hover:bg-white/10">
            <ChevronRight size={32} strokeWidth={1.6} />
          </button>
          <button className="absolute left-6 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-white transition hover:bg-white/10">
            <ChevronLeft size={32} strokeWidth={1.6} />
          </button>

          <div className="relative z-10 flex min-h-[352px] items-center justify-end px-16 text-right">
            <div className="max-w-[560px]">
              <p className="text-[18px] font-extrabold text-[#d6a84f]">عطرهای اورجینال</p>
              <h1 className="mt-4 text-[46px] font-black leading-[1.34] tracking-[-.02em] text-white">
                تجربه‌ای از لوکس بودن
                <br />
                در هر لحظه
              </h1>
              <p className="mt-4 text-[19px] font-medium leading-9 text-white/88">
                معتبرترین برندهای دنیا
                <br />
                با ضمانت اصالت کالا
              </p>
              <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#d6a84f] px-7 py-3 text-sm font-extrabold text-black transition hover:bg-[#efc977]">
                مشاهده محصولات
                <ChevronLeft size={18} />
              </Link>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            <span className="h-2 w-2 rounded-full bg-[#d6a84f]" />
            <span className="h-2 w-2 rounded-full bg-white/55" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
          </div>
        </div>
      </div>
    </section>
  );
}
