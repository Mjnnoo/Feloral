import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { collections } from "@/data/home-v2";

export function SignatureCollections() {
  return (
    <section className="luxury-container mt-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="text-sm font-black text-[#b98732]">Curated Collections</span>
          <h2 className="mt-3 font-display text-5xl font-black leading-tight">کالکشن‌های منتخب</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-black/48">
          دسته‌بندی‌ها در فلورال شبیه قفسه خشک فروشگاه نیستند؛ هر کالکشن یک mood و تجربه دارد.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {collections.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={`group relative min-h-[340px] overflow-hidden rounded-[2rem] bg-gradient-to-br ${item.tone} p-7 text-white shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-[0_35px_90px_rgba(32,22,12,.22)]`}
          >
            <div className="absolute inset-0 bg-black/35 transition group-hover:bg-black/25" />
            <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-8 top-8 h-32 w-16 rounded-[2rem] border border-white/18 bg-black/35 shadow-2xl transition group-hover:scale-105">
              <div className="mx-auto mt-4 h-8 w-8 rounded-t-xl bg-[#c99a42]" />
              <div className="mx-auto mt-8 h-10 w-9 border border-[#c99a42]/45" />
            </div>

            <div className="relative z-10 flex min-h-[286px] flex-col justify-end">
              <span className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-[#f8ead5]/70">{item.eyebrow}</span>
              <h3 className="font-display text-4xl font-black">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/72">{item.desc}</p>
              <div className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#f1cf86]">
                ورود به کالکشن
                <ArrowLeft size={17} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
