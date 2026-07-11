Feloral topbar left/right fix

Target layout:
- Left side: ارسال رایگان برای خریدهای بالای ۱,۵۰۰,۰۰۰ تومان
- Right side: درباره ما / تماس با ما / راهنما

Run:
powershell -ExecutionPolicy Bypass -File .\install-topbar-left-right-fix.ps1

Then:
cd C:\Users\MJN\Desktop\feloral\Desktopfeloral-frontend
npx next dev --webpack -p 3005
