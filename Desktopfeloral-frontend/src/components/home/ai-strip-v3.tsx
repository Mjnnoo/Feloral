import Link from "next/link";
import { aiFeatures } from "@/data/home-v3";

export function AiStripV3() {
  return (
    <section className="luxury-container mt-12">
      <div className="grid overflow-hidden rounded-2xl bg-[#070707] text-white lg:grid-cols-[1fr_1.5fr]">
        <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-l">
          <span className="rounded-full border border-[#c99a42]/40 px-4 py-1 text-xs font-bold text-[#d8ad5d]">Feloral AI</span>
          <h2 className="mt-5 text-3xl font-black leading-[1.45]">
            تجربه هوشمند،
            <span className="block text-[#d8ad5d]">اما با ظاهر لوکس.</span>
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/58">
            این بخش بعداً به تولید محتوا، قیمت رقبا، تست رژ لب و ویدیوهای رایحه وصل می‌شود.
          </p>
          <Link href="/ai-beauty" className="mt-6 inline-flex rounded-lg bg-[#d8ad5d] px-5 py-3 text-xs font-black text-black">
            ورود به AI Beauty
          </Link>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {aiFeatures.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/[.04] p-5">
                <Icon className="text-[#d8ad5d]" size={25} strokeWidth={1.5} />
                <h3 className="mt-4 text-sm font-black">{item.title}</h3>
                <p className="mt-2 text-xs leading-6 text-white/55">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
