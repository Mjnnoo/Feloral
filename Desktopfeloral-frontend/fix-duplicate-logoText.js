const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const headerPath = path.join(target, "src", "components", "layout", "site-header.tsx");

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let text = fs.readFileSync(headerPath, "utf8");
const backup = headerPath + ".bak-fix-duplicate-logoText";

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, "utf8");
}

/*
  The function already has a prop named logoText:
  export function SiteHeader({ cms = null, logoText = "FELORAL", ... })

  So this line breaks compilation:
  const logoText = getText(...)

  Fix:
  - rename the CMS value to logoTitle
  - use the prop logoText as fallback
*/
text = text.replace(
  /const\s+logoText\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.text["']\s*,\s*["']FELORAL["']\s*\)\s*;/g,
  'const logoTitle = getText(cms, "site.logo.text", logoText || "FELORAL");'
);

// If an earlier patch inserted another duplicate with different spacing/default, catch that too.
text = text.replace(
  /const\s+logoText\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.text["']\s*,\s*[^;]+?\)\s*;/g,
  'const logoTitle = getText(cms, "site.logo.text", logoText || "FELORAL");'
);

// Update only the logo CMS marker usages to logoTitle.
text = text.replace(
  /(cmsKey="site\.logo\.text"[\s\S]{0,260}?value=\{)logoText(\})/g,
  "$1logoTitle$2"
);

text = text.replace(
  /(<span\s+data-feloral-logo-text="true">\{)logoText(\}<\/span>)/g,
  "$1logoTitle$2"
);

// If the logo replacement used a plain span without data attr, catch the nearby direct expression.
text = text.replace(
  /(<CmsEditMarker[\s\S]{0,260}?cmsKey="site\.logo\.text"[\s\S]{0,600}?>[\s\S]{0,120}?\{)logoText(\}[\s\S]{0,120}?<\/CmsEditMarker>)/g,
  "$1logoTitle$2"
);

// Ensure logoSubtitle default is correct.
if (text.includes("const logoSubtitle")) {
  text = text.replace(
    /const\s+logoSubtitle\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.subtitle["']\s*,\s*["'][^"']*["']\s*\)\s*;/g,
    'const logoSubtitle = getText(cms, "site.logo.subtitle", "Beauty • Care • Glow");'
  );
} else {
  const logoTitleLine = text.match(/const\s+logoTitle\s*=[^;]+;\s*/);
  if (logoTitleLine && typeof logoTitleLine.index === "number") {
    const at = logoTitleLine.index + logoTitleLine[0].length;
    text = text.slice(0, at) + 'const logoSubtitle = getText(cms, "site.logo.subtitle", "Beauty • Care • Glow");\n' + text.slice(at);
  }
}

fs.writeFileSync(headerPath, text, "utf8");

console.log("Fixed duplicate logoText declaration.");
console.log("Changed:", headerPath);
console.log("Backup:", backup);
console.log("Now logo CMS variable is logoTitle, while prop logoText remains untouched.");
process.exit(0);
