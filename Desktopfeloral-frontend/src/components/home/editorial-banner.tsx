import { LuxuryButton } from "@/components/ui/luxury-button";

export function EditorialBanner() {
  return (
    <section className="luxury-container mt-20">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="dark-luxury min-h-[360px] overflow-hidden rounded-[2rem] p-10 text-white shadow-luxury">
          <span className="text-sm font-bold text-gold">کالکشن شبانه</span>
          <h2 className="mt-5 max-w-lg font-display text-5xl font-black leading-[1.35]">
            عطرهایی برای امضای شخصی تو
          </h2>
          <p className="mt-5 max-w-md leading-8 text-champagne/70">
            رایحه‌های عمیق، گرم و ماندگار برای لحظه‌هایی که باید به یاد بمانند.
          </p>
          <div className="mt-9">
            <LuxuryButton href="/shop?collection=night">کشف کالکشن</LuxuryButton>
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/5 bg-white p-9 shadow-sm">
          <span className="text-sm font-bold text-gold">مجله فلورال</span>
          <h3 className="mt-5 font-display text-4xl font-black leading-[1.4]">
            چطور رایحه مناسب فصلت را انتخاب کنی؟
          </h3>
          <p className="mt-5 leading-8 text-muted">
            راهنمای کوتاه، کاربردی و لوکس برای انتخاب رایحه براساس فصل، استایل و شخصیت.
          </p>
          <div className="mt-9">
            <LuxuryButton href="/magazine" variant="dark">مطالعه مجله</LuxuryButton>
          </div>
        </div>
      </div>
    </section>
  );
}
