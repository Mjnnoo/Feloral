import { Play } from "lucide-react";
import { fragranceFilms } from "@/data/home-v3";

export function FragranceFilmsV3() {
  return (
    <section className="luxury-container mt-12">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-sm font-black text-[#b98732]">ویدیوهای رایحه</p>
          <h2 className="mt-2 text-[28px] font-black">تاپ‌های بویایی را حس کن، نه فقط بخوان</h2>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {fragranceFilms.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className={`relative min-h-[210px] overflow-hidden rounded-xl bg-gradient-to-br ${item.bg} p-6 text-white`}>
              <div className="absolute inset-0 bg-black/25" />
              <div className="relative z-10 flex min-h-[160px] flex-col justify-between">
                <button className="grid h-12 w-12 place-items-center rounded-full bg-[#d8ad5d] text-black">
                  <Play size={19} fill="currentColor" />
                </button>
                <div>
                  <Icon className="mb-3 text-[#d8ad5d]" size={24} strokeWidth={1.5} />
                  <h3 className="text-2xl font-black">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/65">{item.desc}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
