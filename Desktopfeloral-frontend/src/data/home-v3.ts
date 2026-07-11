import {
  BadgeCheck,
  Box,
  Gift,
  Headphones,
  ShieldCheck,
  Truck,
  UserRound,
  UsersRound
} from "lucide-react";

export const nav = [
  { label: "خانه", href: "/" },
  { label: "برندها", href: "/brands" },
  { label: "دسته‌بندی‌ها", href: "/shop" },
  { label: "پیشنهاد ویژه", href: "/offers" }
];

export const topLinks = [
  { label: "درباره ما", href: "/about" },
  { label: "تماس با ما", href: "/contact" },
  { label: "راهنما", href: "/guide" }
];

export const benefits = [
  { title: "ضمانت اصالت کالا", desc: "تمام محصولات با ضمانت اصالت", icon: ShieldCheck },
  { title: "ارسال سریع", desc: "ارسال به سراسر کشور", icon: Truck },
  { title: "۷ روز ضمانت بازگشت", desc: "بازگشت کالا در صورت عدم رضایت", icon: Box },
  { title: "پشتیبانی ۲۴/۷", desc: "پاسخگوی شما هستیم", icon: Headphones }
];

export const sidebarCategories = [
  { label: "عطر مردانه", href: "/shop?category=men-perfume", icon: UserRound },
  { label: "عطر زنانه", href: "/shop?category=women-perfume", icon: UserRound },
  { label: "عطر یونیسکس", href: "/shop?category=unisex", icon: UsersRound },
  { label: "ست هدیه", href: "/shop?category=gift-set", icon: Gift },
  { label: "محصولات مراقبت بدن", href: "/shop?category=body-care", icon: BadgeCheck }
];

export const products = [
  {
    id: 1,
    name: "Dior Sauvage",
    type: "ادکلن مردانه",
    price: "۸,۶۵۰,۰۰۰",
    badge: "پرفروش",
    image: "/products/dior-sauvage.png"
  },
  {
    id: 2,
    name: "Chanel Coco Mademoiselle",
    type: "ادکلن زنانه",
    price: "۹,۹۰۰,۰۰۰",
    badge: "جدید",
    image: "/products/chanel-coco.png"
  },
  {
    id: 3,
    name: "Bleu de Chanel",
    type: "ادکلن مردانه",
    price: "۳,۶۵۰,۰۰۰",
    badge: "خاص",
    image: "/products/bleu-chanel.png"
  },
  {
    id: 4,
    name: "Paco Rabanne 1 Million",
    type: "ادکلن مردانه",
    price: "۶,۵۰۰,۰۰۰",
    badge: "لوکس",
    image: "/products/paco-rabanne.png"
  },
  {
    id: 5,
    name: "Burberry My Burberry Blush",
    type: "ادکلن زنانه",
    price: "۳,۳۹۰,۰۰۰",
    badge: "زنانه",
    image: "/products/burberry-blush.png"
  }
];
