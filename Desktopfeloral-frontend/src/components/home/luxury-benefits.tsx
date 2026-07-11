import { BadgeCheck, Gift, Headphones, PackageCheck, Truck } from "lucide-react";

const benefits = [
  { title: "ضمانت اصالت کالا", subtitle: "تمام محصولات با تضمین اصالت", icon: BadgeCheck },
  { title: "ارسال سریع", subtitle: "ارسال به سراسر ایران", icon: Truck },
  { title: "بسته‌بندی لوکس", subtitle: "تجربه‌ای خاص از لحظه بازکردن", icon: Gift },
  { title: "۷ روز بازگشت", subtitle: "طبق شرایط مرجوعی", icon: PackageCheck },
  { title: "پشتیبانی ۲۴/۷", subtitle: "همیشه همراه شما", icon: Headphones }
];

export function LuxuryBenefits() {
  return (
    <section className="luxury-container -mt-10 relative z-20">
      <div className="luxury-glass grid overflow-hidden rounded-[1.8rem] md:grid-cols-5">
        {benefits.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="border-b border-black/5 p-7 text-center md:border-b-0 md:border-l">
              <Icon className="mx-auto mb-4 text-gold" size={32} strokeWidth={1.4} />
              <h3 className="font-bold">{item.title}</h3>
              <p className="mt-2 text-xs leading-6 text-muted">{item.subtitle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
