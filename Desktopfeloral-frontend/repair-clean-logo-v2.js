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

function findOpenBlockByAttribute(text, attribute) {
  const attrIndex = text.indexOf(attribute);
  if (attrIndex < 0) return null;

  const start = text.lastIndexOf("<", attrIndex);
  if (start < 0) return null;

  const openEndIndex = text.indexOf(">", attrIndex);
  if (openEndIndex < 0) return null;

  const opening = text.slice(start, openEndIndex + 1);
  const tag = openingTagName(opening);
  if (!tag) return null;

  const close = findMatchingTag(text, openEndIndex + 1, tag);
  if (!close) return null;

  return { start, openEnd: openEndIndex + 1, closeStart: close.closeStart, end: close.end, tag };
}

function allBlocks(text, allowedTags) {
  const tagRe = /<([A-Za-z][A-Za-z0-9_.:-]*)(?:\s[^<>]*?)?>/g;
  const blocks = [];

  while (true) {
    const m = tagRe.exec(text);
    if (!m) break;

    const raw = m[0];
    const tag = openingTagName(raw);
    if (!tag || raw.startsWith("</") || raw.endsWith("/>")) continue;
    if (allowedTags && !allowedTags.includes(tag)) continue;

    const close = findMatchingTag(text, tagRe.lastIndex, tag);
    if (!close) continue;

    const body = text.slice(m.index, close.end);
    blocks.push({
      start: m.index,
      openEnd: tagRe.lastIndex,
      closeStart: close.closeStart,
      end: close.end,
      tag,
      body,
      length: close.end - m.index
    });
  }

  return blocks;
}

function findBlocksContaining(text, indexes, allowedTags) {
  const min = Math.min(...indexes);
  const max = Math.max(...indexes);
  return allBlocks(text, allowedTags)
    .filter((b) => b.start <= min && b.end >= max)
    .sort((a, b) => a.length - b.length);
}

function addAttrToOpening(opening, attr) {
  const name = attr.split("=")[0];
  if (opening.includes(name)) return opening;

  const tag = openingTagName(opening);
  if (!tag) return opening;

  return opening.replace(new RegExp("^<" + tag), "<" + tag + " " + attr);
}

function addAttrToBlock(text, block, attr) {
  const opening = text.slice(block.start, block.openEnd);
  const updated = addAttrToOpening(opening, attr);
  return text.slice(0, block.start) + updated + text.slice(block.openEnd);
}

function removeBadLogoFragments(text) {
  // Remove the broken fragment left by the previous bad patch.
  text = text.replace(/\n\s*\}\s*<\/span>\s*\n\s*<\/CmsEditMarker>\s*\n\s*<\/a>\s*/g, "\n");

  // Remove old subtitle div that may have been left after a partial replacement.
  text = text.replace(
    /\n\s*<div[^>]*>\s*Beauty\s*•\s*Care\s*•\s*Glow\s*<\/div>\s*/g,
    "\n"
  );

  return text;
}

function ensureLogoVariables(text) {
  // Do not redeclare logoText; function already has logoText prop.
  text = text.replace(
    /const\s+logoText\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.text["']\s*,\s*[^;]+?\)\s*;/g,
    'const logoTitle = getText(cms, "site.logo.text", logoText || "FELORAL");'
  );

  if (!/const\s+logoTitle\s*=/.test(text)) {
    const anchor = text.match(/const\s+shippingNotice\s*=[^;]+;\s*/) || text.match(/const\s+cartLabel\s*=[^;]+;\s*/);
    if (!anchor || typeof anchor.index !== "number") {
      console.error("Could not find variable insertion point for logoTitle.");
      process.exit(3);
    }

    const at = anchor.index + anchor[0].length;
    text = text.slice(0, at) + 'const logoTitle = getText(cms, "site.logo.text", logoText || "FELORAL");\n' + text.slice(at);
  }

  if (/const\s+logoSubtitle\s*=/.test(text)) {
    text = text.replace(
      /const\s+logoSubtitle\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.subtitle["']\s*,\s*["'][^"']*["']\s*\)\s*;/g,
      'const logoSubtitle = getText(cms, "site.logo.subtitle", "Beauty • Care • Glow");'
    );
  } else {
    const line = text.match(/const\s+logoTitle\s*=[^;]+;\s*/);
    if (line && typeof line.index === "number") {
      const at = line.index + line[0].length;
      text = text.slice(0, at) + 'const logoSubtitle = getText(cms, "site.logo.subtitle", "Beauty • Care • Glow");\n' + text.slice(at);
    }
  }

  return text;
}

function findLogoBlock(text) {
  // First: exact marked block.
  let block = findOpenBlockByAttribute(text, 'data-feloral-header-logo="center"');
  if (block) return block;

  // Second: full link to home containing the old logo or Feloral.
  const candidates = allBlocks(text, ["a", "Link"]).filter((b) => {
    const body = b.body;
    const hasHrefHome = /href=["']\/["']/.test(body) || /href=\{["']\/["']\}/.test(body);
    const hasLogo = body.includes("FELORAL") || body.includes("logoText") || body.includes("logoTitle") || body.includes("Perfume Store") || body.includes("PERFUME STORE");
    const notNav = !body.includes("nav.map") && !body.includes("topLinks.map");
    return hasHrefHome && hasLogo && notNav;
  }).sort((a, b) => a.length - b.length);

  if (candidates.length) return candidates[0];

  return null;
}

function cleanLogoReplacement(indent) {
  return `${indent}<a data-feloral-header-logo="center" href="/" aria-label="Feloral home" style={{ color: accentColor }}>
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
${indent}</a>`;
}

function replaceLogo(text) {
  const block = findLogoBlock(text);

  if (!block) {
    console.error("Could not find logo block. Please send the first 140 lines of site-header.tsx.");
    process.exit(4);
  }

  const before = text.slice(0, block.start);
  const indentMatch = before.match(/(^|\n)([ \t]*)$/);
  const indent = indentMatch ? indentMatch[2] : "        ";

  return text.slice(0, block.start) + cleanLogoReplacement(indent) + text.slice(block.end);
}

function removeCssBlocks(css) {
  const markers = [
    ["/* FELORAL_CLEAN_CENTER_LOGO_START */", "/* FELORAL_CLEAN_CENTER_LOGO_END */"],
    ["/* FELORAL_CENTER_LOGO_HEADER_FIX_START */", "/* FELORAL_CENTER_LOGO_HEADER_FIX_END */"],
    ["/* FELORAL_REMOVE_OLD_CIRCLE_LOGO_RESTORE_COLOR_START */", "/* FELORAL_REMOVE_OLD_CIRCLE_LOGO_RESTORE_COLOR_END */"],
    ["/* FELORAL_REPAIR_CLEAN_LOGO_V2_START */", "/* FELORAL_REPAIR_CLEAN_LOGO_V2_END */"]
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
  css = removeCssBlocks(css);

  const fix = `
/* FELORAL_REPAIR_CLEAN_LOGO_V2_START */

[data-feloral-header-logo="center"] {
  position: absolute !important;
  left: 50% !important;
  top: 50% !important;
  right: auto !important;
  transform: translate(-50%, -50%) !important;
  z-index: 5 !important;

  display: inline-flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;

  gap: 4px !important;
  min-width: 180px !important;
  text-align: center !important;
  text-decoration: none !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  direction: ltr !important;
}

/* Logo color is restored to accentColor via inline style; no forced white. */
[data-feloral-logo-text="true"] {
  display: block !important;
  color: inherit !important;
  font-size: clamp(24px, 2vw, 34px) !important;
  font-weight: 800 !important;
  letter-spacing: .36em !important;
  line-height: 1 !important;
  text-align: center !important;
  text-transform: uppercase !important;
}

[data-feloral-logo-subtitle="true"] {
  display: block !important;
  margin-top: 4px !important;
  color: inherit !important;
  opacity: .62 !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: .18em !important;
  line-height: 1 !important;
  text-align: center !important;
  white-space: nowrap !important;
}

@media (max-width: 1180px) {
  [data-feloral-header-logo="center"] {
    position: static !important;
    transform: none !important;
    justify-self: center !important;
  }
}

/* FELORAL_REPAIR_CLEAN_LOGO_V2_END */
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
}

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

const safetyBackup = headerPath + ".bak-repair-clean-logo-v2-current";
if (!fs.existsSync(safetyBackup)) {
  fs.writeFileSync(safetyBackup, fs.readFileSync(headerPath, "utf8"), "utf8");
}

// Restore from the backup made before the previous broken patch if available.
const previousBackup = headerPath + ".bak-remove-old-circle-logo-restore-color";
let text;

if (fs.existsSync(previousBackup)) {
  text = fs.readFileSync(previousBackup, "utf8");
  console.log("Restored valid source from:", previousBackup);
} else {
  text = fs.readFileSync(headerPath, "utf8");
  console.log("Previous backup not found; repairing current source.");
}

text = removeBadLogoFragments(text);
text = ensureLogoVariables(text);
text = text.replace(/Perfume\s*Store/gi, "Beauty • Care • Glow");
text = text.replace(/پرفیوم\s*استور/g, "Beauty • Care • Glow");
text = replaceLogo(text);

// Mark common mainbar if possible, without changing existing layout.
const markers = [
  text.indexOf('data-feloral-header-logo="center"'),
  text.indexOf('data-feloral-header-nav="right"'),
  text.indexOf('data-feloral-header-actions="left"')
].filter((i) => i >= 0);

if (markers.length >= 2 && !text.includes('data-feloral-mainbar-clean-logo="v2"')) {
  const blocks = findBlocksContaining(text, markers, ["div", "section", "header"]);
  if (blocks.length) {
    text = addAttrToBlock(text, blocks[0], 'data-feloral-mainbar-clean-logo="v2"');
  }
}

fs.writeFileSync(headerPath, text, "utf8");
installCss();

console.log("Repair complete.");
console.log("Changed:", headerPath);
console.log("Safety backup:", safetyBackup);
console.log("Final logo: FELORAL + Beauty • Care • Glow, no circle, color inherited from accentColor.");
process.exit(0);
