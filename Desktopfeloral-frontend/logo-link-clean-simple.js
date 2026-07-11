const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const file = path.join(target, "src", "components", "layout", "site-header.tsx");
const cssFile = path.join(target, "src", "app", "globals.css");

if (!fs.existsSync(file)) throw new Error("site-header.tsx not found");
let s = fs.readFileSync(file, "utf8");
const backup = file + ".bak-logo-link-clean-simple";
if (!fs.existsSync(backup)) fs.writeFileSync(backup, s, "utf8");

// Fix possible duplicate logoText const
s = s.replace(/const\s+logoText\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.text["']\s*,\s*[^;]+?\)\s*;/g,
  'const logoTitle = getText(cms, "site.logo.text", logoText || "FELORAL");');

if (!/const\s+logoTitle\s*=/.test(s)) {
  const m = s.match(/const\s+shippingNotice\s*=[^;]+;\s*/);
  if (!m || typeof m.index !== "number") throw new Error("Could not insert logoTitle");
  s = s.slice(0, m.index + m[0].length) + 'const logoTitle = getText(cms, "site.logo.text", logoText || "FELORAL");\n' + s.slice(m.index + m[0].length);
}

s = s.replace(/const\s+logoSubtitleRaw\s*=[^;]+;\s*const\s+logoSubtitle\s*=[^;]+;\s*/g, "");
s = s.replace(/const\s+logoSubtitle\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.subtitle["']\s*,\s*["'][^"']*["']\s*\)\s*;/g, "");

const mt = s.match(/const\s+logoTitle\s*=[^;]+;\s*/);
if (!mt || typeof mt.index !== "number") throw new Error("logoTitle missing");
s = s.slice(0, mt.index + mt[0].length) +
  'const logoSubtitleRaw = getText(cms, "site.logo.subtitle", "Beauty • Care • Glow");\n' +
  'const logoSubtitle = /perfume\\s*store/i.test(logoSubtitleRaw) || /پرفیوم\\s*استور/.test(logoSubtitleRaw) ? "Beauty • Care • Glow" : logoSubtitleRaw;\n' +
  s.slice(mt.index + mt[0].length);

// Find the outer Next Link logo block, not inner <a>.
let start = s.indexOf('<Link href="/" className="text-center"');
if (start < 0) start = s.indexOf("<Link href='/' className=\"text-center\"");
if (start < 0) {
  // fallback: first home Link before nav.map
  const navPos = s.indexOf("nav.map");
  const searchArea = navPos > 0 ? s.slice(0, navPos) : s;
  start = searchArea.indexOf('<Link href="/"');
}
if (start < 0) throw new Error('Could not find the logo <Link href="/"> block');

const openEnd = s.indexOf(">", start) + 1;
let i = openEnd, depth = 1;
const re = /<\/?Link(?:\s[^<>]*?)?>/g;
re.lastIndex = openEnd;
let end = -1;
while (true) {
  const m = re.exec(s);
  if (!m) break;
  if (m[0].startsWith("</")) depth--;
  else if (!m[0].endsWith("/>")) depth++;
  if (depth === 0) { end = re.lastIndex; break; }
}
if (end < 0) throw new Error("Could not find closing </Link> for logo");

const indent = (s.slice(0, start).match(/(^|\n)([ \t]*)$/) || ["", "", "        "])[2];

const clean =
`${indent}<Link data-feloral-header-logo="center" href="/" aria-label="Feloral home" style={{ color: accentColor }}>
${indent}  <CmsEditMarker
${indent}    cmsKey="site.logo.text"
${indent}    sectionKey="site.header"
${indent}    label="نام برند"
${indent}    value={logoTitle}
${indent}  >
${indent}    <span data-feloral-logo-text="true">{logoTitle}</span>
${indent}  </CmsEditMarker>
${indent}  <CmsEditMarker
${indent}    cmsKey="site.logo.subtitle"
${indent}    sectionKey="site.header"
${indent}    label="متن زیر لوگو"
${indent}    value={logoSubtitle}
${indent}  >
${indent}    <span data-feloral-logo-subtitle="true">{logoSubtitle}</span>
${indent}  </CmsEditMarker>
${indent}</Link>`;

s = s.slice(0, start) + clean + s.slice(end);
fs.writeFileSync(file, s, "utf8");

// CSS: clean logo, no circle, no forced white
if (fs.existsSync(cssFile)) {
  let css = fs.readFileSync(cssFile, "utf8");
  const startMark = "/* FELORAL_LOGO_LINK_CLEAN_SIMPLE_START */";
  const endMark = "/* FELORAL_LOGO_LINK_CLEAN_SIMPLE_END */";
  css = css.replace(new RegExp(startMark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + endMark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  css += `\n\n${startMark}
[data-feloral-header-logo="center"]{
  position:absolute!important;left:50%!important;top:50%!important;right:auto!important;
  transform:translate(-50%,-50%)!important;z-index:5!important;
  display:inline-flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;
  gap:4px!important;min-width:180px!important;text-align:center!important;text-decoration:none!important;
  background:transparent!important;border:0!important;box-shadow:none!important;direction:ltr!important;
}
[data-feloral-logo-text="true"]{
  display:block!important;color:inherit!important;font-size:clamp(24px,2vw,34px)!important;
  font-weight:800!important;letter-spacing:.36em!important;line-height:1!important;text-align:center!important;text-transform:uppercase!important;
}
[data-feloral-logo-subtitle="true"]{
  display:block!important;margin-top:4px!important;color:inherit!important;opacity:.62!important;font-size:10px!important;
  font-weight:700!important;letter-spacing:.18em!important;line-height:1!important;text-align:center!important;white-space:nowrap!important;
}
@media (max-width:1180px){[data-feloral-header-logo="center"]{position:static!important;transform:none!important;justify-self:center!important;}}
${endMark}\n`;
  fs.writeFileSync(cssFile, css, "utf8");
}

console.log("OK: replaced old circle logo Link with clean FELORAL Link. No nested <a>.");
console.log("Backup:", backup);
