import {
  BadgeCheck,
  Bot,
  Camera,
  Gem,
  Gift,
  Headphones,
  Leaf,
  LineChart,
  PackageCheck,
  Sparkles,
  Truck
} from "lucide-react";

export const navItems = [
  { label: "خانه", href: "/" },
  { label: "عطرها", href: "/shop?category=perfume" },
  { label: "میکاپ", href: "/shop?category=makeup" },
  { label: "مراقبت پوست", href: "/shop?category=skin-care" },
  { label: "برندها", href: "/brands" },
  { label: "مجله فلورال", href: "/magazine" }
];

export const benefits = [
  { title: "ضمانت اصالت", desc: "تضمین اصالت کالا", icon: BadgeCheck },
  { title: "ارسال سریع", desc: "ارسال به سراسر ایران", icon: Truck },
  { title: "بسته‌بندی خاص", desc: "مناسب هدیه و تجربه لوکس", icon: Gift },
  { title: "بازگشت کالا", desc: "طبق شرایط مرجوعی", icon: PackageCheck },
  { title: "پشتیبانی", desc: "همراه شما در خرید", icon: Headphones }
];

export const collections = [
  {
    title: "عطرهای زنانه",
    eyebrow: "Feminine Signature",
    desc: "لطیف، ماندگار و به‌یادماندنی",
    href: "/shop?category=women-perfume",
    tone: "from-[#f7d8ca] via-[#f8efe8] to-[#d7a761]"
  },
  {
    title: "عطرهای مردانه",
    eyebrow: "Masculine Icons",
    desc: "تلخ، عمیق و کاریزماتیک",
    href: "/shop?category=men-perfume",
    tone: "from-[#111] via-[#27231e] to-[#b68233]"
  },
  {
    title: "نیش و خاص",
    eyebrow: "Niche Selection",
    desc: "رایحه‌هایی برای امضای شخصی",
    href: "/shop?category=niche",
    tone: "from-[#241409] via-[#0b0b0b] to-[#ddbd76]"
  },
  {
    title: "میکاپ هوشمند",
    eyebrow: "AI Beauty",
    desc: "تجربه رنگ و زیبایی با هوش مصنوعی",
    href: "/ai-beauty",
    tone: "from-[#2d0c16] via-[#111] to-[#c99a42]"
  }
];

export const products = [
  {
    id: 1,
    name: "Dior Sauvage Elixir",
    brand: "Dior",
    family: "چوبی · ادویه‌ای",
    price: "۱۲,۹۰۰,۰۰۰",
    oldPrice: "۱۴,۲۰۰,۰۰۰",
    badge: "پرفروش",
    color: "from-[#050505] via-[#202328] to-[#39506a]"
  },
  {
    id: 2,
    name: "Chanel Coco Mademoiselle",
    brand: "Chanel",
    family: "گلی · مرکباتی",
    price: "۱۰,۸۰۰,۰۰۰",
    oldPrice: null,
    badge: "زنانه",
    color: "from-[#fff1ea] via-[#f8d7c9] to-[#c88974]"
  },
  {
    id: 3,
    name: "YSL Libre Intense",
    brand: "Yves Saint Laurent",
    family: "شرقی · وانیلی",
    price: "۹,۹۰۰,۰۰۰",
    oldPrice: "۱۰,۶۰۰,۰۰۰",
    badge: "خاص",
    color: "from-[#2d1606] via-[#c9802d] to-[#f0d59b]"
  },
  {
    id: 4,
    name: "Tom Ford Noir Extreme",
    brand: "Tom Ford",
    family: "گرم · شبانه",
    price: "۱۵,۴۰۰,۰۰۰",
    oldPrice: null,
    badge: "لوکس",
    color: "from-[#030303] via-[#17120c] to-[#b9893d]"
  }
];

export const aiFeatures = [
  {
    title: "تکمیل هوشمند اطلاعات محصول",
    desc: "عنوان، توضیح، مزایا، تگ و متن سئو برای محصول با کمک AI تولید می‌شود.",
    icon: Bot
  },
  {
    title: "مقایسه قیمت رقبا",
    desc: "وقتی مشتری روی محصول تمرکز می‌کند، نمونه قیمت‌های معتبر بازار نمایش داده می‌شود.",
    icon: LineChart
  },
  {
    title: "تست رژ لب با عکس یا لایو",
    desc: "مشتری عکس می‌فرستد یا دوربین را باز می‌کند و رنگ رژ را روی لب خودش می‌بیند.",
    icon: Camera
  },
  {
    title: "راهنمای ویدیویی رایحه",
    desc: "نت‌های بویایی با ویدیو، حس و mood معرفی می‌شوند نه فقط متن ساده.",
    icon: Sparkles
  }
];

export const fragranceFilms = [
  {
    title: "نت‌های چوبی",
    desc: "عمیق، ماندگار، بالغ",
    icon: Leaf,
    gradient: "from-[#0a0a0a] via-[#1a130c] to-[#7d5523]"
  },
  {
    title: "نت‌های گلی",
    desc: "لطیف، رمانتیک، زنانه",
    icon: Gem,
    gradient: "from-[#17070d] via-[#33131d] to-[#c89a8c]"
  },
  {
    title: "نت‌های شرقی",
    desc: "گرم، اغواگر، شبانه",
    icon: Sparkles,
    gradient: "from-[#080808] via-[#261407] to-[#d19a37]"
  }
];
