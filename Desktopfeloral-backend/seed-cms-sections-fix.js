const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const sections = [
  { key: "site.header", type: "custom", status: "published", title: "هدر سایت", sortOrder: 1 },
  { key: "site.footer", type: "custom", status: "published", title: "فوتر سایت", sortOrder: 90 },
  { key: "home.hero", type: "hero", status: "published", title: "هیرو صفحه اصلی", sortOrder: 10 },
  { key: "home.benefits", type: "benefits", status: "published", title: "مزایای فروشگاه", sortOrder: 20 },
  { key: "home.products", type: "products", status: "published", title: "محصولات منتخب", sortOrder: 30 }
];

const contents = [
  ["site.header", "site.top.shippingNotice", "پیام بالای هدر", "ارسال رایگان برای خریدهای بالای ۱,۵۰۰,۰۰۰ تومان"],
  ["site.header", "site.header.cartLabel", "برچسب سبد خرید", "سبد خرید"],
  ["site.header", "site.header.loginLabel", "برچسب ورود", "ورود / ثبت‌نام"],
  ["site.header", "site.header.searchPlaceholder", "متن جستجو", "جستجوی محصول، برند یا دسته..."],
  ["site.header", "site.nav.home", "منوی خانه", "خانه"],
  ["site.header", "site.nav.brands", "منوی برندها", "برندها"],
  ["site.header", "site.nav.categories", "منوی دسته‌بندی‌ها", "دسته‌بندی‌ها"],
  ["site.header", "site.nav.offers", "منوی پیشنهاد ویژه", "پیشنهاد ویژه"],

  ["home.hero", "home.hero.eyebrow", "متن کوچک هیرو", "عطرهای اورجینال"],
  ["home.hero", "home.hero.title", "عنوان اصلی هیرو", "تجربه‌ای از لوکس بودن در هر لحظه"],
  ["home.hero", "home.hero.subtitle", "زیرعنوان هیرو", "معتبرترین برندهای دنیا با ضمانت اصالت کالا"],
  ["home.hero", "home.hero.cta", "دکمه هیرو", "مشاهده محصولات"],

  ["home.benefits", "home.benefits.item1.title", "مزیت ۱ - عنوان", "ضمانت اصالت کالا"],
  ["home.benefits", "home.benefits.item1.desc", "مزیت ۱ - توضیح", "تمام محصولات با ضمانت اصالت"],
  ["home.benefits", "home.benefits.item2.title", "مزیت ۲ - عنوان", "ارسال سریع"],
  ["home.benefits", "home.benefits.item2.desc", "مزیت ۲ - توضیح", "ارسال به سراسر کشور"],
  ["home.benefits", "home.benefits.item3.title", "مزیت ۳ - عنوان", "۷ روز ضمانت بازگشت"],
  ["home.benefits", "home.benefits.item3.desc", "مزیت ۳ - توضیح", "بازگشت کالا در صورت عدم رضایت"],
  ["home.benefits", "home.benefits.item4.title", "مزیت ۴ - عنوان", "پشتیبانی ۲۴/۷"],
  ["home.benefits", "home.benefits.item4.desc", "مزیت ۴ - توضیح", "پاسخگوی شما هستیم"],

  ["home.products", "home.products.title", "عنوان محصولات", "محصولات منتخب"],
  ["home.products", "home.products.viewAll", "لینک مشاهده همه", "مشاهده همه"],
  ["home.products", "home.sidebar.title", "عنوان دسته‌بندی‌ها", "دسته‌بندی‌ها"],
  ["home.products", "home.sidebar.category1.label", "دسته ۱", "عطر مردانه"],
  ["home.products", "home.sidebar.category2.label", "دسته ۲", "عطر زنانه"],
  ["home.products", "home.sidebar.category3.label", "دسته ۳", "عطر یونیسکس"],
  ["home.products", "home.sidebar.category4.label", "دسته ۴", "ست هدیه"],
  ["home.products", "home.sidebar.category5.label", "دسته ۵", "محصولات مراقبت بدن"],
  ["home.products", "home.sidebar.allCategories", "مشاهده همه دسته‌ها", "مشاهده همه دسته‌بندی‌ها"],

  ["site.footer", "site.footer.description", "توضیح فوتر", "فروشگاه لوکس عطر و زیبایی با تجربه هوشمند خرید، ضمانت اصالت و انتخاب حرفه‌ای رایحه."],
  ["site.footer", "site.footer.shop.title", "فوتر فروشگاه - عنوان", "فروشگاه"],
  ["site.footer", "site.footer.services.title", "فوتر خدمات - عنوان", "خدمات"],
  ["site.footer", "site.footer.newsletter.title", "فوتر خبرنامه - عنوان", "خبرنامه"],
  ["site.footer", "site.footer.newsletter.button", "فوتر خبرنامه - دکمه", "عضویت"]
];

async function main() {
  const sectionMap = new Map();

  for (const section of sections) {
    const saved = await prisma.homepageSection.upsert({
      where: { key: section.key },
      update: {
        type: section.type,
        status: section.status,
        title: section.title,
        sortOrder: section.sortOrder,
        isPublic: true,
        isEditable: true
      },
      create: {
        key: section.key,
        type: section.type,
        status: section.status,
        title: section.title,
        sortOrder: section.sortOrder,
        isPublic: true,
        isEditable: true
      }
    });

    sectionMap.set(section.key, saved);
  }

  for (const [sectionKey, key, title, plainText] of contents) {
    const section = sectionMap.get(sectionKey);

    await prisma.editableContent.upsert({
      where: { key },
      update: {
        title,
        plainText,
        type: "text",
        sectionId: section.id,
        isPublic: true,
        isEditable: true
      },
      create: {
        key,
        title,
        plainText,
        type: "text",
        sectionId: section.id,
        isPublic: true,
        isEditable: true
      }
    });
  }

  console.log("CMS sections and base editable contents are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
