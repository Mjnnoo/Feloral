const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const headerPath = path.join(target, "src", "components", "layout", "site-header.tsx");
const cssPath = fs.existsSync(path.join(target, "src", "app", "globals.css"))
  ? path.join(target, "src", "app", "globals.css")
  : path.join(target, "app", "globals.css");

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let header = fs.readFileSync(headerPath, "utf8");
const backup = headerPath + ".bak-shipping-color-only";

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, header, "utf8");
}

/*
  Keep shipping accentColor.
  Remove accentColor from top links.
*/
header = header.replace(
  /<div data-feloral-topbar-side="links" dir="rtl" style=\{\{ color: accentColor \}\}>/g,
  '<div data-feloral-topbar-side="links" dir="rtl">'
);

header = header.replace(
  /<a href=\{link\.href\} className="text-\[13px\] font-semibold transition">/g,
  '<a href={link.href} className="text-[13px] font-semibold text-white/70 transition hover:text-white">'
);

fs.writeFileSync(headerPath, header, "utf8");

if (!fs.existsSync(cssPath)) {
  console.error("globals.css not found:", cssPath);
  process.exit(2);
}

let css = fs.readFileSync(cssPath, "utf8");
const start = "/* FELORAL_TOPBAR_SHIPPING_COLOR_ONLY_START */";
const end = "/* FELORAL_TOPBAR_SHIPPING_COLOR_ONLY_END */";
const re = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
css = css.replace(re, "");

const fix = `
${start}
/* Only the shipping notice keeps accentColor.
   Header top links return to their normal white/gray style. */
[data-feloral-topbar-side="links"] {
  color: rgba(255, 255, 255, 0.7) !important;
}

[data-feloral-topbar-side="links"] a {
  color: rgba(255, 255, 255, 0.7) !important;
}

[data-feloral-topbar-side="links"] a:hover {
  color: #ffffff !important;
  opacity: 1 !important;
}
${end}
`;

fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");

console.log("Done: only shipping notice keeps accent color; top links are normal white/gray.");
console.log("Changed:", headerPath);
console.log("Backup:", backup);
console.log("CSS:", cssPath);
process.exit(0);
