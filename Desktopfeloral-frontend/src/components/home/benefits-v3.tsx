import { benefits } from "@/data/home-v3";

export function BenefitsV3() {
  return (
    <section className="relative z-20 -mt-5">
      <div className="luxury-container">
        <div className="grid overflow-hidden rounded-xl bg-white shadow-[0_18px_55px_rgba(0,0,0,.10)] md:grid-cols-4">
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center justify-center gap-5 border-b border-black/7 px-7 py-6 text-center md:border-b-0 md:border-l">
                <Icon className="shrink-0 text-[#c99a42]" size={34} strokeWidth={1.55} />
                <div>
                  <h3 className="text-[17px] font-black">{item.title}</h3>
                  <p className="mt-2 text-xs text-black/50">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
