const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const headerPath = path.join(target, "src", "components", "layout", "site-header.tsx");
const cssPath = fs.existsSync(path.join(target, "src", "app", "globals.css"))
  ? path.join(target, "src", "app", "globals.css")
  : path.join(target, "app", "globals.css");

function findMatchingTag(text, openEnd, tagName) {
  const re = new RegExp(`</?${tagName}(?:\\s[^<>]*?)?>`, "g");
  re.lastIndex = openEnd;
  let depth = 1;

  while (true) {
    const m = re.exec(text);
    if (!m) return null;

    const raw = m[0];
    if (raw.startsWith("</")) {
      depth--;
      if (depth === 0) {
        return { closeStart: m.index, end: re.lastIndex };
      }
    } else if (!raw.endsWith("/>")) {
      depth++;
    }
  }
}

function getOpeningTagName(raw) {
  const m = raw.match(/^<([A-Za-z][A-Za-z0-9_.:-]*)\b/);
  return m ? m[1] : null;
}

function findAllElementBlocksContaining(text, indexes) {
  const min = Math.min(...indexes);
  const max = Math.max(...indexes);
  const tagRe = /<([A-Za-z][A-Za-z0-9_.:-]*)(?:\s[^<>]*?)?>/g;
  const blocks = [];

  while (true) {
    const m = tagRe.exec(text);
    if (!m) break;
    if (m.index > min) break;

    const raw = m[0];
    const tag = getOpeningTagName(raw);
    if (!tag || raw.startsWith("</") || raw.endsWith("/>")) continue;

    const close = findMatchingTag(text, tagRe.lastIndex, tag);
    if (!close) continue;

    if (m.index <= min && close.end >= max) {
      blocks.push({
        start: m.index,
        openEnd: tagRe.lastIndex,
        closeStart: close.closeStart,
        end: close.end,
        tag,
        length: close.end - m.index
      });
    }
  }

  blocks.sort((a, b) => a.length - b.length);
  return blocks;
}

function removeMarkedBlocks(css) {
  const markers = [
    ["/* FELORAL_TOPBAR_SWAP_FALLBACK_START */", "/* FELORAL_TOPBAR_SWAP_FALLBACK_END */"],
    ["/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_START */", "/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_END */"],
    ["/* FELORAL_FORCE_TOPBAR_LEFT_RIGHT_V3_START */", "/* FELORAL_FORCE_TOPBAR_LEFT_RIGHT_V3_END */"]
  ];

  for (const [start, end] of markers) {
    const re = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    css = css.replace(re, "");
  }

  return css;
}

function installCss() {
  if (!fs.existsSync(cssPath)) {
    console.error("globals.css not found:", cssPath);
    process.exit(6);
  }

  let css = fs.readFileSync(cssPath, "utf8");
  css = removeMarkedBlocks(css);

  const fix = `
/* FELORAL_FORCE_TOPBAR_LEFT_RIGHT_V3_START */
[data-feloral-topbar-exact="v3"] {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 24px !important;
  width: 100% !important;
  max-width: 80rem !important;
  margin-inline: auto !important;
  padding: 8px 24px !important;
  direction: ltr !important;
}

[data-feloral-topbar-side="shipping"] {
  grid-column: 1 !important;
  justify-self: start !important;
  text-align: left !important;
  direction: rtl !important;
  min-width: 0 !important;
}

[data-feloral-topbar-side="links"] {
  grid-column: 2 !important;
  justify-self: end !important;
  text-align: right !important;
  direction: rtl !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 20px !important;
  white-space: nowrap !important;
}

@media (max-width: 768px) {
  [data-feloral-topbar-exact="v3"] {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }

  [data-feloral-topbar-side="shipping"],
  [data-feloral-topbar-side="links"] {
    grid-column: 1 !important;
    justify-self: center !important;
    text-align: center !important;
    white-space: normal !important;
  }
}
/* FELORAL_FORCE_TOPBAR_LEFT_RIGHT_V3_END */
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  console.log("CSS installed:", cssPath);
}

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let text = fs.readFileSync(headerPath, "utf8");

const shippingNeedle = 'cmsKey="site.top.shippingNotice"';
const linksNeedle = "topLinks.map";

const shippingIndex = text.indexOf(shippingNeedle);
const linksIndex = text.indexOf(linksNeedle);

if (shippingIndex < 0) {
  console.error("Could not find:", shippingNeedle);
  process.exit(2);
}

if (linksIndex < 0) {
  console.error("Could not find:", linksNeedle);
  process.exit(3);
}

const blocks = findAllElementBlocksContaining(text, [shippingIndex, linksIndex])
  .filter((b) => b.tag === "div" || b.tag === "section");

if (!blocks.length) {
  console.error("Could not find a common JSX block containing shipping marker and topLinks.map.");
  process.exit(4);
}

const block = blocks[0];
const before = text.slice(0, block.start);
const indentMatch = before.match(/(^|\n)([ \t]*)$/);
const indent = indentMatch ? indentMatch[2] : "        ";

const replacement = `${indent}<div data-feloral-topbar-exact="v3" className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-6 px-6 py-2" dir="ltr">
${indent}  <div data-feloral-topbar-side="shipping" className="min-w-0 justify-self-start text-left" dir="rtl">
${indent}    <CmsEditMarker
${indent}      cmsKey="site.top.shippingNotice"
${indent}      sectionKey="site.header"
${indent}      label="اطلاعیه ارسال"
${indent}      value={shippingNotice}
${indent}    >
${indent}      <span className="text-white/75">{shippingNotice}</span>
${indent}    </CmsEditMarker>
${indent}  </div>
${indent}
${indent}  <div data-feloral-topbar-side="links" className="flex items-center justify-end gap-5 justify-self-end text-right" dir="rtl">
${indent}    {topLinks.map((link) => (
${indent}      <a key={link.href} href={link.href} className="text-white/70 transition hover:text-white">
${indent}        {link.label}
${indent}      </a>
${indent}    ))}
${indent}  </div>
${indent}</div>`;

const backup = headerPath + ".bak-force-topbar-v3";
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, "utf8");
}

text = text.slice(0, block.start) + replacement + text.slice(block.end);
fs.writeFileSync(headerPath, text, "utf8");

installCss();

console.log("Header patched:", headerPath);
console.log("Backup:", backup);
console.log("Installed marker: data-feloral-topbar-exact=\"v3\"");
console.log("Final: shipping left, top links right.");
process.exit(0);
