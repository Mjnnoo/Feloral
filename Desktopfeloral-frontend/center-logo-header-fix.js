const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const headerPath = path.join(target, "src", "components", "layout", "site-header.tsx");
const cssPath = fs.existsSync(path.join(target, "src", "app", "globals.css"))
  ? path.join(target, "src", "app", "globals.css")
  : path.join(target, "app", "globals.css");

function findMatchingTag(text, openEnd, tagName) {
  const re = new RegExp("</?" + tagName + "(?:\\s[^<>]*?)?>", "g");
  re.lastIndex = openEnd;
  let depth = 1;

  while (true) {
    const m = re.exec(text);
    if (!m) return null;

    const raw = m[0];

    if (raw.startsWith("</")) {
      depth -= 1;
      if (depth === 0) return { closeStart: m.index, end: re.lastIndex };
    } else if (!raw.endsWith("/>")) {
      depth += 1;
    }
  }
}

function openingTagName(raw) {
  const m = raw.match(/^<([A-Za-z][A-Za-z0-9_.:-]*)\b/);
  return m ? m[1] : null;
}

function findBlocksContaining(text, indexes, allowedTags) {
  const min = Math.min(...indexes);
  const max = Math.max(...indexes);
  const tagRe = /<([A-Za-z][A-Za-z0-9_.:-]*)(?:\s[^<>]*?)?>/g;
  const blocks = [];

  while (true) {
    const m = tagRe.exec(text);
    if (!m) break;
    if (m.index > min) break;

    const raw = m[0];
    const tag = openingTagName(raw);

    if (!tag || raw.startsWith("</") || raw.endsWith("/>")) continue;

    const close = findMatchingTag(text, tagRe.lastIndex, tag);
    if (!close) continue;

    if (m.index <= min && close.end >= max && (!allowedTags || allowedTags.includes(tag))) {
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

function addAttrToOpening(opening, attr) {
  const attrName = attr.split("=")[0];

  if (opening.includes(attrName)) return opening;

  const tag = openingTagName(opening);
  if (!tag) return opening;

  return opening.replace(new RegExp("^<" + tag), "<" + tag + " " + attr);
}

function addAttrToBlock(text, block, attr) {
  const opening = text.slice(block.start, block.openEnd);
  const updated = addAttrToOpening(opening, attr);
  return text.slice(0, block.start) + updated + text.slice(block.openEnd);
}

function ensureLogoSubtitleVariable(text) {
  const subtitleDefault = '"Beauty • Care • Glow"';

  if (text.includes('"site.logo.subtitle"') || text.includes("'site.logo.subtitle'")) {
    text = text.replace(
      /getText\(\s*cms\s*,\s*["']site\.logo\.subtitle["']\s*,\s*["'][^"']*["']\s*\)/g,
      `getText(cms, "site.logo.subtitle", ${subtitleDefault})`
    );
    return text;
  }

  const logoTextLine = text.match(/const\s+logoText\s*=[^;]+;\s*/);

  if (logoTextLine && typeof logoTextLine.index === "number") {
    const insertAt = logoTextLine.index + logoTextLine[0].length;
    const insert = `const logoSubtitle = getText(cms, "site.logo.subtitle", ${subtitleDefault});\n`;
    return text.slice(0, insertAt) + insert + text.slice(insertAt);
  }

  const shippingLine = text.match(/const\s+shippingNotice\s*=[^;]+;\s*/);

  if (shippingLine && typeof shippingLine.index === "number") {
    const insertAt = shippingLine.index + shippingLine[0].length;
    const insert = `const logoSubtitle = getText(cms, "site.logo.subtitle", ${subtitleDefault});\n`;
    return text.slice(0, insertAt) + insert + text.slice(insertAt);
  }

  console.error("Could not find a place to insert logoSubtitle.");
  process.exit(4);
}

function replaceLogoSubtitleInBlock(blockText, indent) {
  if (blockText.includes("site.logo.subtitle") && blockText.includes("Beauty • Care • Glow")) {
    return blockText;
  }

  if (blockText.includes("site.logo.subtitle")) {
    return blockText.replace(
      /getText\(\s*cms\s*,\s*["']site\.logo\.subtitle["']\s*,\s*["'][^"']*["']\s*\)/g,
      'getText(cms, "site.logo.subtitle", "Beauty • Care • Glow")'
    );
  }

  const pMatch = blockText.match(/<p\b([^>]*)>([\s\S]*?)<\/p>/);

  if (pMatch) {
    const oldP = pMatch[0];
    const attrs = pMatch[1] || "";
    const newP =
`<CmsEditMarker
${indent}        cmsKey="site.logo.subtitle"
${indent}        sectionKey="site.header"
${indent}        label="زیرنویس لوگو"
${indent}        value={logoSubtitle}
${indent}      >
${indent}        <p data-feloral-logo-subtitle="true"${attrs}>{logoSubtitle}</p>
${indent}      </CmsEditMarker>`;

    return blockText.replace(oldP, newP);
  }

  const markerClose = blockText.indexOf("</CmsEditMarker>");
  if (markerClose >= 0) {
    const insertAt = markerClose + "</CmsEditMarker>".length;
    const insert =
`
${indent}      <CmsEditMarker
${indent}        cmsKey="site.logo.subtitle"
${indent}        sectionKey="site.header"
${indent}        label="زیرنویس لوگو"
${indent}        value={logoSubtitle}
${indent}      >
${indent}        <span data-feloral-logo-subtitle="true" className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
${indent}          {logoSubtitle}
${indent}        </span>
${indent}      </CmsEditMarker>`;

    return blockText.slice(0, insertAt) + insert + blockText.slice(insertAt);
  }

  const logoTextPos = blockText.indexOf("{logoText}");
  if (logoTextPos >= 0) {
    const after = logoTextPos + "{logoText}".length;
    const insert =
`
${indent}      <CmsEditMarker
${indent}        cmsKey="site.logo.subtitle"
${indent}        sectionKey="site.header"
${indent}        label="زیرنویس لوگو"
${indent}        value={logoSubtitle}
${indent}      >
${indent}        <span data-feloral-logo-subtitle="true" className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
${indent}          {logoSubtitle}
${indent}        </span>
${indent}      </CmsEditMarker>`;

    return blockText.slice(0, after) + insert + blockText.slice(after);
  }

  return blockText;
}

function removeMarkedCss(css) {
  const markers = [
    ["/* FELORAL_CENTER_LOGO_HEADER_FIX_START */", "/* FELORAL_CENTER_LOGO_HEADER_FIX_END */"]
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
    process.exit(5);
  }

  let css = fs.readFileSync(cssPath, "utf8");
  css = removeMarkedCss(css);

  const fix = `
/* FELORAL_CENTER_LOGO_HEADER_FIX_START */

/* Main header:
   left  = cart + login + search
   center = FELORAL logo
   right = home + brands + categories + special offer
*/
[data-feloral-mainbar-center-logo="v2"] {
  position: relative !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 24px !important;
  width: 100% !important;
  max-width: none !important;
  direction: ltr !important;
}

[data-feloral-header-actions="left"] {
  grid-column: 1 !important;
  justify-self: start !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 12px !important;
  min-width: 0 !important;
  direction: ltr !important;
}

[data-feloral-header-cart="left"] {
  order: 1 !important;
}

[data-feloral-header-login="left"] {
  order: 2 !important;
}

[data-feloral-header-search="left"] {
  order: 3 !important;
  min-width: 260px !important;
  max-width: 420px !important;
}

[data-feloral-header-logo="center"] {
  grid-column: 2 !important;
  justify-self: center !important;
  align-self: center !important;
  position: absolute !important;
  left: 50% !important;
  right: auto !important;
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 3 !important;
  text-align: center !important;
  direction: ltr !important;
}

[data-feloral-header-logo="center"] [data-feloral-logo-subtitle="true"] {
  display: block !important;
  margin-top: 4px !important;
  text-align: center !important;
  letter-spacing: .22em !important;
  white-space: nowrap !important;
}

[data-feloral-header-nav="right"] {
  grid-column: 3 !important;
  justify-self: end !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 22px !important;
  white-space: nowrap !important;
  direction: rtl !important;
}

@media (max-width: 1180px) {
  [data-feloral-mainbar-center-logo="v2"] {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  [data-feloral-header-logo="center"] {
    position: static !important;
    transform: none !important;
    grid-column: 1 !important;
    justify-self: center !important;
    order: 1 !important;
  }

  [data-feloral-header-nav="right"] {
    grid-column: 1 !important;
    justify-self: center !important;
    justify-content: center !important;
    order: 2 !important;
    flex-wrap: wrap !important;
  }

  [data-feloral-header-actions="left"] {
    grid-column: 1 !important;
    justify-self: center !important;
    justify-content: center !important;
    order: 3 !important;
    flex-wrap: wrap !important;
  }

  [data-feloral-header-search="left"] {
    min-width: min(100%, 280px) !important;
    max-width: 100% !important;
  }
}

/* FELORAL_CENTER_LOGO_HEADER_FIX_END */
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  console.log("CSS installed:", cssPath);
}

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let text = fs.readFileSync(headerPath, "utf8");
const backup = headerPath + ".bak-center-logo-header-fix";

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, "utf8");
}

text = ensureLogoSubtitleVariable(text);

// Find logo block in rendered JSX: the smallest useful block containing logoText after return.
let logoSearchStart = Math.max(text.indexOf("return"), 0);
let logoUsageIndex = text.indexOf("logoText", logoSearchStart);
if (logoUsageIndex < 0) logoUsageIndex = text.indexOf("FELORAL", logoSearchStart);

if (logoUsageIndex < 0) {
  console.error("Could not find logo usage in site-header.tsx.");
  process.exit(2);
}

let logoBlocks = findBlocksContaining(text, [logoUsageIndex], ["a", "Link", "div"]);
logoBlocks = logoBlocks.filter((b) => b.length < 2500);

if (!logoBlocks.length) {
  console.error("Could not find logo block.");
  process.exit(3);
}

let logoBlock = logoBlocks[0];
text = addAttrToBlock(text, logoBlock, 'data-feloral-header-logo="center"');

// Re-find logo block after attr insertion.
let logoAttrIndex = text.indexOf('data-feloral-header-logo="center"');
logoBlocks = findBlocksContaining(text, [logoAttrIndex], ["a", "Link", "div"]);
logoBlock = logoBlocks[0];

const logoIndentMatch = text.slice(0, logoBlock.start).match(/(^|\n)([ \t]*)$/);
const logoIndent = logoIndentMatch ? logoIndentMatch[2] : "      ";
let logoBlockText = text.slice(logoBlock.start, logoBlock.end);
logoBlockText = replaceLogoSubtitleInBlock(logoBlockText, logoIndent);

text = text.slice(0, logoBlock.start) + logoBlockText + text.slice(logoBlock.end);

// Mark mainbar containing logo, nav, and actions.
const indexes = [
  text.indexOf('data-feloral-header-logo="center"'),
  text.indexOf('data-feloral-header-nav="right"'),
  text.indexOf('data-feloral-header-actions="left"')
].filter((i) => i >= 0);

if (indexes.length >= 2) {
  const mainBlocks = findBlocksContaining(text, indexes, ["div", "section", "header"]);
  if (mainBlocks.length) {
    text = addAttrToBlock(text, mainBlocks[0], 'data-feloral-mainbar-center-logo="v2"');
  }
}

// If previous mainbar exists but new attr didn't land, add it there.
if (!text.includes('data-feloral-mainbar-center-logo="v2"') && text.includes('data-feloral-mainbar="v1"')) {
  text = text.replace('data-feloral-mainbar="v1"', 'data-feloral-mainbar="v1" data-feloral-mainbar-center-logo="v2"');
}

fs.writeFileSync(headerPath, text, "utf8");
installCss();

console.log("Header center logo fix installed.");
console.log("Changed file:", headerPath);
console.log("Backup:", backup);
console.log("Expected:");
console.log("- FELORAL centered.");
console.log("- Subtitle: Beauty • Care • Glow.");
console.log("- Left: cart, login, search.");
console.log("- Right: main navigation.");
process.exit(0);
