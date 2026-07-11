import { Heart, ShoppingBag } from "lucide-react";

type Props = {
  name: string;
  brand: string;
  family: string;
  price: string;
  oldPrice?: string | null;
  badge: string;
  color: string;
};

export function LuxuryProductCard({
  name,
  brand,
  family,
  price,
  oldPrice,
  badge,
  color
}: Props) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-black/6 bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(36,26,15,.16)]">
      <div className={`relative grid h-[300px] place-items-center overflow-hidden rounded-b-[2rem] bg-gradient-to-br ${color}`}>
        <div className="absolute inset-0 bg-black/10" />
        <button className="absolute left-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/22 bg-white/14 text-white backdrop-blur transition hover:bg-white hover:text-black">
          <Heart size={18} />
        </button>
        <span className="absolute right-5 top-5 z-10 rounded-full bg-black/58 px-4 py-2 text-xs font-black text-[#e6c37a] backdrop-blur">
          {badge}
        </span>

        <div className="group relative h-[210px] w-[118px]">
          <div className="absolute left-1/2 top-0 h-14 w-14 -translate-x-1/2 rounded-t-2xl bg-gradient-to-b from-[#f1d17f] to-[#8a5f1f]" />
          <div className="bottle-shine absolute bottom-0 left-1/2 h-[178px] w-[112px] -translate-x-1/2 rounded-[1.65rem] border border-white/25 bg-black/62 shadow-[0_28px_70px_rgba(0,0,0,.45)]">
            <div className="absolute inset-x-5 top-16 grid h-16 place-items-center border border-[#c99a42]/35 bg-black/50">
              <span className="text-[10px] font-bold tracking-[.28em] text-[#d9af58]">FELORAL</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[#b98732]">{brand}</p>
            <h3 className="mt-2 min-h-[48px] text-lg font-black leading-6 text-black">{name}</h3>
            <p className="mt-2 text-sm text-black/45">{family}</p>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            {oldPrice ? <p className="text-xs text-black/35 line-through">{oldPrice} تومان</p> : null}
            <p className="mt-1 text-lg font-black">{price} تومان</p>
          </div>

          <button className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white transition hover:bg-[#c99a42] hover:text-black">
            <ShoppingBag size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
