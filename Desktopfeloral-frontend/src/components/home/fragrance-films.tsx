import { fragranceFilms } from "@/data/home-products";
import { Play } from "lucide-react";

export function FragranceFilms() {
  return (
    <section className="luxury-container mt-20">
      <div className="mb-8">
        <span className="text-sm font-bold text-gold">ویدیوهای رایحه</span>
        <h2 className="mt-2 font-display text-4xl font-black">تاپ‌های بویایی را حس کن، نه فقط بخوان</h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {fragranceFilms.map((film) => (
          <div key={film.title} className="group relative min-h-[300px] overflow-hidden rounded-[1.8rem] bg-ink shadow-sm">
            <video
              className="absolute inset-0 h-full w-full object-cover opacity-45 transition group-hover:scale-105 group-hover:opacity-65"
              src={film.video}
              muted
              loop
              playsInline
              poster=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="relative z-10 flex h-full min-h-[300px] flex-col justify-end p-7 text-white">
              <button className="mb-auto grid h-14 w-14 place-items-center rounded-full bg-gold text-black shadow-lg">
                <Play size={22} fill="currentColor" />
              </button>
              <h3 className="font-display text-3xl font-black">{film.title}</h3>
              <p className="mt-3 text-champagne/80">{film.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
