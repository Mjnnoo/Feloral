const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const headerPath = path.join(target, "src", "components", "layout", "site-header.tsx");

function findMatchingDiv(text, openEnd) {
  const tagRe = /<\/?div(?:\s[^<>]*?)?>/g;
  tagRe.lastIndex = openEnd;

  let depth = 1;

  while (true) {
    const m = tagRe.exec(text);
    if (!m) return null;

    const raw = m[0];

    if (raw.startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return {
          closeStart: m.index,
          end: tagRe.lastIndex
        };
      }
    } else if (!raw.endsWith("/>")) {
      depth += 1;
    }
  }
}

function findDivBlocksContaining(text, indexes) {
  const min = Math.min(...indexes);
  const max = Math.max(...indexes);
  const tagRe = /<div(?:\s[^<>]*?)?>/g;
  const blocks = [];

  while (true) {
    const m = tagRe.exec(text);
    if (!m) break;
    if (m.index > min) break;

    const close = findMatchingDiv(text, tagRe.lastIndex);
    if (!close) continue;

    if (m.index <= min && close.end >= max) {
      blocks.push({
        start: m.index,
        openEnd: tagRe.lastIndex,
        closeStart: close.closeStart,
        end: close.end,
        length: close.end - m.index
      });
    }
  }

  blocks.sort((a, b) => a.length - b.length);
  return blocks;
}

function cleanupOldCss(targetDir) {
  const candidates = [
    path.join(targetDir, "src", "app", "globals.css"),
    path.join(targetDir, "app", "globals.css")
  ];

  const cssPath = candidates.find((p) => fs.existsSync(p));
  if (!cssPath) return false;

  let css = fs.readFileSync(cssPath, "utf8");

  const markers = [
    ["/* FELORAL_TOPBAR_SWAP_FALLBACK_START */", "/* FELORAL_TOPBAR_SWAP_FALLBACK_END */"],
    ["/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_START */", "/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_END */"]
  ];

  for (const [start, end] of markers) {
    const re = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    css = css.replace(re, "");
  }

  fs.writeFileSync(cssPath, css.trimEnd() + "\n", "utf8");
  return true;
}

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let text = fs.readFileSync(headerPath, "utf8");

const shippingIndex = text.indexOf("site.top.shippingNotice");
const linksIndex = text.indexOf("topLinks.map");

if (shippingIndex < 0 || linksIndex < 0) {
  console.error("Could not find shippingNotice and topLinks.map inside site-header.tsx");
  process.exit(2);
}

const blocks = findDivBlocksContaining(text, [shippingIndex, linksIndex]);

if (!blocks.length) {
  console.error("Could not find a common div block containing topbar shipping and topLinks.");
  process.exit(3);
}

const block = blocks[0];

const indentMatch = text.slice(0, block.start).match(/(^|\n)([ \t]*)$/);
const indent = indentMatch ? indentMatch[2] : "        ";

const replacement = `${indent}<div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-2" dir="ltr">
${indent}  <div className="min-w-0 text-left" dir="rtl">
${indent}    <CmsEditMarker
${indent}      cmsKey="site.top.shippingNotice"
${indent}      sectionKey="site.header"
${indent}      label="اطلاعیه ارسال"
${indent}      value={shippingNotice}
${indent}    >
${indent}      <span className="text-white/75">{shippingNotice}</span>
${indent}    </CmsEditMarker>
${indent}  </div>

${indent}  <div className="flex items-center justify-end gap-5 text-right" dir="rtl">
${indent}    {topLinks.map((link) => (
${indent}      <a key={link.href} href={link.href} className="text-white/70 transition hover:text-white">
${indent}        {link.label}
${indent}      </a>
${indent}    ))}
${indent}  </div>
${indent}</div>`;

const backup = headerPath + ".bak-topbar-exact";
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, "utf8");
}

text = text.slice(0, block.start) + replacement + text.slice(block.end);
fs.writeFileSync(headerPath, text, "utf8");

cleanupOldCss(target);

console.log("Topbar exact left/right layout installed.");
console.log("Changed file:", headerPath);
console.log("Backup file:", backup);
console.log("Free shipping: left side");
console.log("Top links: right side");
process.exit(0);
