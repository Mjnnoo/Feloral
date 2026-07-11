import { Play } from "lucide-react";
import { fragranceFilms } from "@/data/home-v2";

export function FragranceCinemaV2() {
  return (
    <section className="luxury-container mt-28">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="text-sm font-black text-[#b98732]">Fragrance Cinema</span>
          <h2 className="mt-3 font-display text-5xl font-black leading-tight">رایحه را حس کن، نه فقط بخوان</h2>
        </div>
        <p className="max-w-lg text-sm leading-7 text-black/48">
          برای تاپ‌های بویایی، فلورال می‌تواند ویدیوهای کوتاه و احساسی پخش کند؛ مناسب معرفی نت‌ها، mood و سبک رایحه.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {fragranceFilms.map((film) => {
          const Icon = film.icon;
          return (
            <article key={film.title} className={`group relative min-h-[360px] overflow-hidden rounded-[2.2rem] bg-gradient-to-br ${film.gradient} p-8 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_32px_100px_rgba(20,12,4,.24)]`}>
              <div className="absolute inset-0 bg-black/28 transition group-hover:bg-black/16" />
              <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              <div className="relative z-10 flex min-h-[300px] flex-col">
                <button className="mb-auto grid h-16 w-16 place-items-center rounded-full bg-[#c99a42] text-black shadow-[0_18px_45px_rgba(201,154,66,.28)] transition group-hover:scale-105">
                  <Play size={23} fill="currentColor" />
                </button>

                <Icon className="mb-6 text-[#e6c37a]" size={30} strokeWidth={1.45} />
                <h3 className="font-display text-4xl font-black">{film.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#f8ead5]/70">{film.desc}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
