این اسکریپت برای حالتی است که فقط یک ریپوی GitHub داری:

https://github.com/Mjnnoo/Feloral

کارش:
- ریشه C:\Users\MJN\Desktop\feloral را گیت می‌کند.
- هر دو پوشه زیر را داخل همان یک ریپو ذخیره می‌کند:
  - Desktopfeloral-frontend
  - Desktopfeloral-backend
- .git داخلی فرانت/بک‌اند را به backup تغییر نام می‌دهد تا nested repo نسازد.
- .env، node_modules، .next، dist، build را وارد گیت نمی‌کند.

اجرا:
powershell -ExecutionPolicy Bypass -File .\save-feloral-monorepo-to-github.ps1
