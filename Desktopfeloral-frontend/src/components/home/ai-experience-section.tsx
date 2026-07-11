import { Camera, LineChart, Sparkles, Wand2 } from "lucide-react";

const items = [
  {
    title: "تولید هوشمند اطلاعات محصول",
    desc: "ادمین فقط چند مشخصه وارد می‌کند؛ هوش مصنوعی عنوان، توضیح، مزایا، تگ و متن سئو را پیشنهاد می‌دهد.",
    icon: Sparkles
  },
  {
    title: "مقایسه قیمت رقبا",
    desc: "وقتی مشتری روی محصول تمرکز کند، قیمت نمونه‌های مشابه از منابع معتبر backend نمایش داده می‌شود.",
    icon: LineChart
  },
  {
    title: "تست رژ لب با عکس یا دوربین",
    desc: "مشتری عکس می‌فرستد یا از دوربین استفاده می‌کند و رنگ رژ را روی لب خود پیش‌نمایش می‌بیند.",
    icon: Camera
  },
  {
    title: "راهنمای رایحه با ویدیو",
    desc: "برای نت‌های بویایی، به جای متن ساده، ویدیوهای کوتاه و احساسی نمایش داده می‌شود.",
    icon: Wand2
  }
];

export function AiExperienceSection() {
  return (
    <section className="luxury-container mt-20">
      <div className="overflow-hidden rounded-[2rem] bg-ink text-white shadow-luxury">
        <div className="grid lg:grid-cols-[.9fr_1.1fr]">
          <div className="dark-luxury p-10 lg:p-14">
            <span className="rounded-full border border-gold/25 bg-gold/10 px-5 py-2 text-sm font-bold text-gold">
              Feloral AI
            </span>
            <h2 className="mt-8 font-display text-4xl font-black leading-[1.45]">
              فروشگاه فقط محصول نشان نمی‌دهد؛
              <span className="gold-text block">تجربه می‌سازد.</span>
            </h2>
            <p className="mt-6 text-sm leading-8 text-champagne/70">
              ساختار فرانت از همین ابتدا برای قابلیت‌های هوشمند آماده شده تا بعداً بدون تخریب پروژه، AI را به محصول، قیمت، تصویر و ویدیو وصل کنیم.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 lg:p-8">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-white/10 bg-white/[.04] p-6">
                  <Icon className="mb-5 text-gold" size={30} strokeWidth={1.4} />
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-champagne/62">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
