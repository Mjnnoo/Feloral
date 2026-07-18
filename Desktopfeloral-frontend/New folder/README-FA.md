# بسته نهایی ذخیره‌سازی امن CMS فلورال

این بسته وابستگی ویرایشگر CMS به `localStorage` و ورود دستی `access_token` را حذف می‌کند.
توکن‌های دسترسی و refresh فقط در کوکی‌های `httpOnly` باقی می‌مانند و مرورگر از مسیرهای BFF فرانت‌اند با بک‌اند ارتباط می‌گیرد.

## محل استخراج

محتویات ZIP را داخل ریشه فرانت‌اند استخراج و فایل‌های موجود را جایگزین کن:

```text
C:\Users\MJN\Desktop\feloral\Desktopfeloral-frontend
```

چون داخل ZIP پوشه `src` وجود دارد، پس از استخراج باید مسیرهایی مانند این ساخته شوند:

```text
Desktopfeloral-frontend\src\lib\admin-fetch.ts
Desktopfeloral-frontend\src\app\api\admin\cms\contents\route.ts
```

## فایل‌های جدید

```text
src/lib/admin-fetch.ts
src/lib/admin-cms-proxy.ts
src/app/api/admin/cms/contents/route.ts
src/app/api/admin/cms/contents/[key]/route.ts
src/app/api/admin/cms/media/upload/route.ts
```

## فایل‌های جایگزین‌شونده

```text
src/components/cms/cms-editor-provider.tsx
src/components/cms/cms-editor-sidebar.tsx
src/components/cms/cms-editor-state.ts
src/lib/cms-editor-access.ts
src/components/home/cms-home-hero.tsx
src/components/cms/hero-background-runtime.tsx
src/components/cms/hero-final-runtime.tsx
src/components/cms/hero-studio-runtime.tsx
```

## پیش‌نیازهای موجود در پروژه

فایل زیر باید همین سه ثابت را داشته باشد؛ طبق نسخه فعلی پروژه شما این بخش از قبل وجود دارد:

```text
src/lib/admin-session.ts
```

```ts
export const ADMIN_SESSION_COOKIE = "feloral_admin_session";
export const ADMIN_ACCESS_COOKIE = "feloral_admin_access";
export const ADMIN_REFRESH_COOKIE = "feloral_admin_refresh";
```

این مسیرهای احراز هویت که قبلاً ساخته شده‌اند نیز باید حفظ شوند:

```text
/api/admin/login
/api/admin/session
/api/admin/refresh
/api/admin/logout
```

متغیر زیر نیز باید در تنظیمات فرانت‌اند تعریف شده باشد:

```text
ADMIN_SESSION_SECRET
```

## تست ساخت

در پوشه فرانت‌اند اجرا کن:

```powershell
npm run build
```

در خروجی باید این مسیرها دیده شوند:

```text
/api/admin/cms/contents
/api/admin/cms/contents/[key]
/api/admin/cms/media/upload
```

## تست عملکرد

1. از پنل مدیریت خارج و دوباره وارد شو.
2. ویرایشگر سایت را باز کن.
3. متن هیروی شماره ۲ را تغییر بده و ذخیره کن.
4. صفحه را با `Ctrl + F5` تازه‌سازی کن.
5. متن باید پس از تازه‌سازی باقی بماند.
6. سپس یک تصویر هیرو را آپلود و ذخیره کن و دوباره تازه‌سازی را آزمایش کن.

دیگر هیچ فیلدی برای ورود دستی `Access Token` نباید در پنل ویرایشگر دیده شود.

## نتیجه امنیتی

- access token در `localStorage` ذخیره نمی‌شود.
- refresh token در اختیار JavaScript مرورگر قرار نمی‌گیرد.
- درخواست‌های CMS فقط از مسیرهای هم‌مبدأ فرانت‌اند عبور می‌کنند.
- درخواست‌های نامعتبر از مبدأ دیگر رد می‌شوند.
- در خطای `401`، refresh و تکرار درخواست به‌صورت خودکار انجام می‌شود.
- در نامعتبرشدن نشست، کوکی‌های مدیریت پاک می‌شوند.

## وضعیت بررسی

این بسته روی Next.js 16.2.10 با TypeScript و دستور `npm run build` آزمایش شده و بیلد با موفقیت تکمیل شده است.
پیام قدیمی `Dynamic server usage` مربوط به واکشی عمومی صفحه اصلی همچنان غیرمسدودکننده است و به این تغییرات مربوط نیست.
