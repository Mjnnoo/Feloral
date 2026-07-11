import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export function LuxuryHeroV2() {
  return (
    <section className="luxury-container pt-8">
      <div className="dark-luxury luxury-noise relative min-h-[660px] overflow-hidden rounded-[2.6rem] border border-[#c99a42]/24 shadow-[0_40px_110px_rgba(20,12,4,.25)]">
        <div className="absolute -top-24 left-[18%] h-80 w-80 rounded-full bg-[#c99a42]/25 blur-[90px]" />
        <div className="absolute bottom-[-160px] right-[6%] h-[420px] w-[420px] rounded-full bg-white/10 blur-[110px]" />

        <div className="relative z-10 grid min-h-[660px] lg:grid-cols-[1fr_.9fr]">
          <div className="flex items-center px-9 py-14 md:px-16 lg:px-20">
            <div className="max-w-2xl">
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#c99a42]/28 bg-[#c99a42]/10 px-5 py-2 text-sm font-bold text-[#e6c37a]">
                <Sparkles size={17} />
                کالکشن امضای فلورال
              </div>

              <h1 className="font-display text-[54px] font-black leading-[1.22] text-white md:text-[82px]">
                رایحه‌ای که
                <span className="gold-text block">قبل از تو حرف می‌زند.</span>
              </h1>

              <p className="mt-8 max-w-xl text-[17px] leading-9 text-[#f8ead5]/66">
                تجربه‌ای لوکس برای کشف عطر، مقایسه هوشمند قیمت و انتخاب زیبایی با کمک AI؛ طراحی‌شده برای خریدی مطمئن و خاص.
              </p>

              <div className="mt-11 flex flex-wrap gap-4">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-3 rounded-2xl bg-[#c99a42] px-7 py-4 text-sm font-black text-black shadow-[0_18px_45px_rgba(201,154,66,.25)] transition hover:-translate-y-0.5 hover:bg-[#dfb866]"
                >
                  مشاهده کالکشن
                  <ArrowLeft size={18} />
                </Link>
                <Link
                  href="/ai-beauty"
                  className="inline-flex items-center gap-3 rounded-2xl border border-white/14 bg-white/8 px-7 py-4 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-[#c99a42]/50 hover:bg-white/12"
                >
                  تجربه هوشمند زیبایی
                  <ArrowLeft size={18} />
                </Link>
              </div>
            </div>
          </div>

          <div className="relative hidden items-center justify-center lg:flex">
            <div className="absolute h-[520px] w-[520px] rounded-full border border-[#c99a42]/10 bg-[#c99a42]/5 blur-sm" />
            <div className="group relative h-[530px] w-[310px]">
              <div className="absolute left-1/2 top-2 h-28 w-28 -translate-x-1/2 rounded-t-[2rem] bg-gradient-to-b from-[#f6d78e] via-[#c99a42] to-[#6e4614] shadow-[0_30px_70px_rgba(201,154,66,.28)]" />
              <div className="bottle-shine absolute bottom-0 left-1/2 h-[430px] w-[270px] -translate-x-1/2 rounded-[3.2rem] border border-[#c99a42]/42 bg-gradient-to-b from-[#1c1711] via-[#050505] to-[#010101] shadow-[0_60px_140px_rgba(0,0,0,.75)]">
                <div className="absolute inset-x-10 top-28 grid h-48 place-items-center border border-[#c99a42]/38 bg-black/54">
                  <div className="text-center">
                    <div className="font-display text-3xl tracking-[.35em] text-[#d9af58]">FELORAL</div>
                    <div className="mt-4 text-[10px] tracking-[.32em] text-[#f8ead5]/42">EAU DE PARFUM</div>
                  </div>
                </div>
                <div className="absolute left-8 top-10 h-80 w-12 rounded-full bg-white/8 blur-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-9 right-1/2 z-20 flex translate-x-1/2 gap-2">
          <span className="h-2 w-9 rounded-full bg-[#c99a42]" />
          <span className="h-2 w-2 rounded-full bg-white/28" />
          <span className="h-2 w-2 rounded-full bg-white/28" />
          <span className="h-2 w-2 rounded-full bg-white/28" />
        </div>
      </div>
    </section>
  );
}
