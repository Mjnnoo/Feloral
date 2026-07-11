import { benefits } from "@/data/home-v2";

export function ServiceBarV2() {
  return (
    <section className="luxury-container -mt-12 relative z-20">
      <div className="grid overflow-hidden rounded-[2rem] border border-black/6 bg-[#fffaf3]/92 shadow-[0_30px_90px_rgba(31,23,14,.13)] backdrop-blur-2xl md:grid-cols-5">
        {benefits.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="border-b border-black/6 p-7 text-center md:border-b-0 md:border-l">
              <Icon className="mx-auto mb-4 text-[#c99a42]" size={31} strokeWidth={1.45} />
              <h3 className="text-base font-black">{item.title}</h3>
              <p className="mt-2 text-xs leading-6 text-black/45">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
