const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const headerPath = path.join(target, "src", "components", "layout", "site-header.tsx");
const cssPath = fs.existsSync(path.join(target, "src", "app", "globals.css"))
  ? path.join(target, "src", "app", "globals.css")
  : path.join(target, "app", "globals.css");

function openingTagName(raw) {
  const m = raw.match(/^<([A-Za-z][A-Za-z0-9_.:-]*)\b/);
  return m ? m[1] : null;
}

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

function findOpenTagAroundAttribute(text, attrIndex) {
  const start = text.lastIndexOf("<", attrIndex);
  if (start < 0) return null;

  const openEnd = text.indexOf(">", attrIndex);
  if (openEnd < 0) return null;

  const opening = text.slice(start, openEnd + 1);
  const tag = openingTagName(opening);
  if (!tag) return null;

  const close = findMatchingTag(text, openEnd + 1, tag);
  if (!close) return null;

  return { start, openEnd: openEnd + 1, end: close.end, tag };
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

function ensureLogoVariables(text) {
  if (/const\s+logoText\s*=/.test(text)) {
    text = text.replace(
      /const\s+logoText\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.text["']\s*,\s*["'][^"']*["']\s*\)\s*;/,
      'const logoText = getText(cms, "site.logo.text", "FELORAL");'
    );
  } else {
    const shipping = text.match(/const\s+shippingNotice\s*=[^;]+;\s*/);
    if (shipping && typeof shipping.index === "number") {
      const insertAt = shipping.index + shipping[0].length;
      text = text.slice(0, insertAt) + 'const logoText = getText(cms, "site.logo.text", "FELORAL");\n' + text.slice(insertAt);
    } else {
      const funcBody = text.indexOf("{", text.indexOf("function"));
      if (funcBody >= 0) {
        text = text.slice(0, funcBody + 1) + '\n  const logoText = getText(cms, "site.logo.text", "FELORAL");\n' + text.slice(funcBody + 1);
      }
    }
  }

  if (/const\s+logoSubtitle\s*=/.test(text)) {
    text = text.replace(
      /const\s+logoSubtitle\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.subtitle["']\s*,\s*["'][^"']*["']\s*\)\s*;/,
      'const logoSubtitle = getText(cms, "site.logo.subtitle", "Beauty • Care • Glow");'
    );
  } else {
    const logoTextLine = text.match(/const\s+logoText\s*=[^;]+;\s*/);
    if (logoTextLine && typeof logoTextLine.index === "number") {
      const insertAt = logoTextLine.index + logoTextLine[0].length;
      text = text.slice(0, insertAt) + 'const logoSubtitle = getText(cms, "site.logo.subtitle", "Beauty • Care • Glow");\n' + text.slice(insertAt);
    }
  }

  return text;
}

function removeMarkedCss(css) {
  const markers = [
    ["/* FELORAL_CLEAN_CENTER_LOGO_START */", "/* FELORAL_CLEAN_CENTER_LOGO_END */"]
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
  css = removeMarkedCss(css);

  const fix = `
/* FELORAL_CLEAN_CENTER_LOGO_START */

/* Clean centered brand: remove old perfume-store badge/circle look. */
[data-feloral-mainbar-clean-logo="v1"],
[data-feloral-mainbar-center-logo="v3"] {
  position: relative !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 24px !important;
  width: 100% !important;
  max-width: none !important;
  direction: ltr !important;
}

[data-feloral-header-logo="center"] {
  grid-column: 2 !important;
  justify-self: center !important;
  align-self: center !important;
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  right: auto !important;
  transform: translate(-50%, -50%) !important;
  z-index: 4 !important;
  text-align: center !important;
  direction: ltr !important;
  display: inline-flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
  min-width: 180px !important;
  text-decoration: none !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

[data-feloral-logo-text="true"] {
  display: block !important;
  color: #ffffff !important;
  font-size: clamp(24px, 2vw, 34px) !important;
  font-weight: 800 !important;
  letter-spacing: .36em !important;
  line-height: 1 !important;
  text-align: center !important;
  text-transform: uppercase !important;
}

[data-feloral-logo-subtitle="true"] {
  display: block !important;
  margin-top: 3px !important;
  color: rgba(255, 255, 255, .58) !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: .18em !important;
  line-height: 1 !important;
  text-align: center !important;
  text-transform: none !important;
  white-space: nowrap !important;
}

/* Hide any leftover perfume-store badge/circle if an old wrapper survived. */
[data-feloral-header-logo="center"] [data-feloral-old-logo-badge],
[data-feloral-header-logo="center"] [data-feloral-old-logo-circle],
[data-feloral-header-logo="center"] .perfume-store,
[data-feloral-header-logo="center"] .logo-badge,
[data-feloral-header-logo="center"] .logo-circle {
  display: none !important;
}

@media (max-width: 1180px) {
  [data-feloral-mainbar-clean-logo="v1"],
  [data-feloral-mainbar-center-logo="v3"] {
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
}

/* FELORAL_CLEAN_CENTER_LOGO_END */
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  console.log("CSS installed:", cssPath);
}

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let text = fs.readFileSync(headerPath, "utf8");
const backup = headerPath + ".bak-clean-center-logo";

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, "utf8");
}

text = ensureLogoVariables(text);

// Remove old subtitle text if it survived outside variables.
text = text
  .replace(/Perfume\s*Store/g, "Beauty • Care • Glow")
  .replace(/PERFUME\s*STORE/g, "Beauty • Care • Glow")
  .replace(/پرفیوم\s*استور/g, "Beauty • Care • Glow");

// Find and replace the whole logo block.
let logoBlock = null;
const attrIndex = text.indexOf('data-feloral-header-logo="center"');

if (attrIndex >= 0) {
  logoBlock = findOpenTagAroundAttribute(text, attrIndex);
}

if (!logoBlock) {
  const returnIndex = Math.max(text.indexOf("return"), 0);
  let logoIndex = text.indexOf("logoText", returnIndex);
  if (logoIndex < 0) logoIndex = text.indexOf("FELORAL", returnIndex);

  if (logoIndex >= 0) {
    const blocks = findBlocksContaining(text, [logoIndex], ["a", "Link", "div"]).filter((b) => b.length < 3000);
    if (blocks.length) logoBlock = blocks[0];
  }
}

if (!logoBlock) {
  console.error("Could not find logo block to replace.");
  process.exit(2);
}

const before = text.slice(0, logoBlock.start);
const indentMatch = before.match(/(^|\n)([ \t]*)$/);
const indent = indentMatch ? indentMatch[2] : "        ";

const logoReplacement = `${indent}<a data-feloral-header-logo="center" href="/" aria-label="Feloral home">
${indent}  <CmsEditMarker
${indent}    cmsKey="site.logo.text"
${indent}    sectionKey="site.header"
${indent}    label="نام برند"
${indent}    value={logoText}
${indent}  >
${indent}    <span data-feloral-logo-text="true">{logoText}</span>
${indent}  </CmsEditMarker>
${indent}  <CmsEditMarker
${indent}    cmsKey="site.logo.subtitle"
${indent}    sectionKey="site.header"
${indent}    label="متن زیر لوگو"
${indent}    value={logoSubtitle}
${indent}  >
${indent}    <span data-feloral-logo-subtitle="true">{logoSubtitle}</span>
${indent}  </CmsEditMarker>
${indent}</a>`;

text = text.slice(0, logoBlock.start) + logoReplacement + text.slice(logoBlock.end);

// Mark mainbar containing logo/nav/actions.
let mainbarMarked = false;
const markers = [
  text.indexOf('data-feloral-header-logo="center"'),
  text.indexOf('data-feloral-header-nav="right"'),
  text.indexOf('data-feloral-header-actions="left"')
].filter((i) => i >= 0);

if (markers.length >= 2) {
  const blocks = findBlocksContaining(text, markers, ["div", "section", "header"]);
  if (blocks.length) {
    text = addAttrToBlock(text, blocks[0], 'data-feloral-mainbar-clean-logo="v1"');
    mainbarMarked = true;
  }
}

if (!mainbarMarked) {
  text = text.replace('data-feloral-mainbar-center-logo="v2"', 'data-feloral-mainbar-center-logo="v3" data-feloral-mainbar-clean-logo="v1"');
  text = text.replace('data-feloral-mainbar-center-logo="v3"', 'data-feloral-mainbar-center-logo="v3" data-feloral-mainbar-clean-logo="v1"');
  text = text.replace('data-feloral-mainbar="v1"', 'data-feloral-mainbar="v1" data-feloral-mainbar-clean-logo="v1"');
}

fs.writeFileSync(headerPath, text, "utf8");
installCss();

console.log("Clean centered FELORAL logo installed.");
console.log("Removed old Perfume Store / circle logo block.");
console.log("Changed file:", headerPath);
console.log("Backup:", backup);
console.log("Subtitle: Beauty • Care • Glow");
process.exit(0);
