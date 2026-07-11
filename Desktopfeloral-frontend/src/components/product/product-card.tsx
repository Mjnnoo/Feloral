import { Heart, ShoppingBag } from "lucide-react";

type Props = {
  name: string;
  brand: string;
  price: string;
  badge?: string;
};

export function ProductCard({ name, brand, price, badge }: Props) {
  return (
    <article className="group relative overflow-hidden rounded-[1.6rem] border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-luxury">
      <button className="absolute left-5 top-5 z-10 rounded-full border border-black/10 bg-white p-2 transition hover:border-gold hover:text-gold">
        <Heart size={18} />
      </button>

      {badge && (
        <span className="absolute right-5 top-5 z-10 rounded-full bg-ink px-3 py-1 text-xs font-bold text-gold">
          {badge}
        </span>
      )}

      <div className="grid h-64 place-items-center rounded-[1.2rem] bg-gradient-to-b from-champagne to-white">
        <div className="h-44 w-24 rounded-[2rem] border border-black/10 bg-gradient-to-b from-white via-[#e9d9c0] to-[#1a1a1a] shadow-xl transition group-hover:scale-105" />
      </div>

      <div className="mt-5 text-center">
        <h3 className="font-semibold text-ink">{name}</h3>
        <p className="mt-1 text-sm text-muted">{brand}</p>
        <p className="mt-4 font-bold">{price} تومان</p>
      </div>

      <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-gold hover:text-black">
        افزودن به سبد خرید
        <ShoppingBag size={18} />
      </button>
    </article>
  );
}
