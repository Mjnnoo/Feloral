import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function EditorialJournalV2() {
  return (
    <section className="luxury-container mt-28">
      <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
        <div className="relative min-h-[430px] overflow-hidden rounded-[2.4rem] bg-[#fffaf3] p-10 shadow-sm">
          <span className="text-sm font-black text-[#b98732]">مجله فلورال</span>
          <h2 className="mt-7 max-w-xl font-display text-5xl font-black leading-[1.35]">
            چطور رایحه مناسب فصلت را انتخاب کنی؟
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-8 text-black/52">
            راهنمای کوتاه، کاربردی و لوکس برای انتخاب رایحه براساس فصل، استایل و شخصیت.
          </p>
          <Link href="/magazine" className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-black px-7 py-4 text-sm font-black text-white transition hover:bg-[#c99a42] hover:text-black">
            مطالعه مجله
            <ArrowLeft size={18} />
          </Link>

          <div className="absolute bottom-10 left-12 hidden h-44 w-32 rounded-[2rem] border border-black/8 bg-gradient-to-b from-[#f6e4cf] to-[#c99a42]/30 shadow-xl md:block" />
        </div>

        <div className="dark-luxury luxury-noise relative min-h-[430px] overflow-hidden rounded-[2.4rem] p-10 text-white shadow-[0_32px_95px_rgba(24,16,9,.25)]">
          <span className="text-sm font-black text-[#e6c37a]">کالکشن شبانه</span>
          <h2 className="mt-7 max-w-xl font-display text-5xl font-black leading-[1.35]">
            عطرهایی برای امضای شخصی تو
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-8 text-[#f8ead5]/62">
            رایحه‌های عمیق، گرم و ماندگار برای لحظه‌هایی که باید به یاد بمانند.
          </p>
          <Link href="/shop?collection=night" className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-[#c99a42] px-7 py-4 text-sm font-black text-black transition hover:bg-[#dfb866]">
            کشف کالکشن
            <ArrowLeft size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
