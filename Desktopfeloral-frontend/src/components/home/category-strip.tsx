import Link from "next/link";
import { luxuryCategories } from "@/lib/constants/navigation";

export function CategoryStrip() {
  return (
    <section className="luxury-container mt-16">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {luxuryCategories.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-[1.6rem] border border-black/5 bg-white/70 p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-gold/35 hover:bg-white hover:shadow-luxury"
          >
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-champagne text-2xl text-gold transition group-hover:bg-gold group-hover:text-black">
              {item.icon}
            </div>
            <h3 className="font-bold">{item.title}</h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
