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

function ensureVariables(text) {
  // Keep the function prop logoText. Do NOT redeclare const logoText.
  text = text.replace(
    /const\s+logoText\s*=\s*getText\(\s*cms\s*,\s*["']site\.logo\.text["']\s*,\s*[^;]+?\)\s*;/g,
    'const logoTitle = getText(cms, "site.logo.text", logoText || "FELORAL");'
  );

  if (!/const\s+logoTitle\s*=/.test(text)) {
    const shippingLine = text.match(/const\s+shippingNotice\s*=[^;]+;\s*/);
    const cartLine = text.match(/const\s+cartLabel\s*=[^;]+;\s*/);
    const anchor = shippingLine || cartLine;

    if (anchor && typeof anchor.index === "number") {
      const at = anchor.index + anchor[0].length;
      text = text.slice(0, at) + 'const logoTitle = getText(cms, "site.logo.text", logoText || "FELORAL");\n' + text.slice(at);
    } else {
      console.error("Could not find variable insertion point for logoTitle.");
      process.exit(3);
    }
  }

  if (/const\s+logoSubtitle\s*=/.test(text)) {
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

  return text;
}

function blockLooksLikeOldLogo(block) {
  const b = block.body;

  if (b.includes("nav.map") || b.includes("topLinks.map")) return false;
  if (b.includes("site.search") || b.includes("cartLabel") || b.includes("loginLabel")) return false;
  if (b.includes('data-feloral-header-nav="right"') || b.includes('data-feloral-header-actions="left"')) return false;

  const hasHomeHref =
    /href=["']\/["']/.test(b) ||
    /href=\{["']\/["']\}/.test(b);

  const hasLogoText =
    b.includes("FELORAL") ||
    b.includes("logoText") ||
    b.includes("logoTitle") ||
    b.includes("site.logo.text") ||
    b.includes('data-feloral-logo-text="true"');

  const hasOldSubtitle =
    /Perfume\s*Store/i.test(b) ||
    /PERFUME\s*STORE/i.test(b) ||
    /پرفیوم\s*استور/.test(b) ||
    b.includes("site.logo.subtitle") ||
    b.includes("logoSubtitle") ||
    b.includes('data-feloral-logo-subtitle="true"');

  const hasCircle =
    b.includes("rounded-full") ||
    b.includes("logo-circle") ||
    b.includes("logo-badge") ||
    b.includes("h-10 w-10") ||
    b.includes("w-10 h-10") ||
    b.includes("h-12 w-12") ||
    b.includes("w-12 h-12");

  const markedAsLogo = b.includes('data-feloral-header-logo="center"');

  return markedAsLogo || (hasHomeHref && hasLogoText && (hasOldSubtitle || hasCircle));
}

function replaceLogoBlocks(text) {
  const candidates = allBlocks(text, ["a", "Link", "div"])
    .filter(blockLooksLikeOldLogo)
    // prefer complete link blocks; then larger blocks that include circle+text
    .sort((a, b) => {
      const aLink = (a.tag === "a" || a.tag === "Link") ? 0 : 1;
      const bLink = (b.tag === "a" || b.tag === "Link") ? 0 : 1;
      if (aLink !== bLink) return aLink - bLink;
      return a.length - b.length;
    });

  if (!candidates.length) {
    console.error("Could not find the old logo/circle block. Send the first 120 lines of site-header.tsx if this fails.");
    process.exit(4);
  }

  // Remove nested duplicates: keep blocks not contained by a smaller chosen candidate.
  const chosen = [];
  for (const c of candidates) {
    if (chosen.some(x => c.start >= x.start && c.end <= x.end)) continue;
    chosen.push(c);
  }

  // Only one visible centered logo should remain. First candidate becomes clean logo, other old logo candidates are removed.
  const first = chosen[0];
  const before = text.slice(0, first.start);
  const indentMatch = before.match(/(^|\n)([ \t]*)$/);
  const indent = indentMatch ? indentMatch[2] : "        ";

  const clean = `${indent}<a data-feloral-header-logo="center" href="/" aria-label="Feloral home" style={{ color: accentColor }}>
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

  const edits = chosen
    .map((c, idx) => ({ start: c.start, end: c.end, replacement: idx === 0 ? clean : "" }))
    .sort((a, b) => b.start - a.start);

  for (const edit of edits) {
    text = text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
  }

  return { text, count: chosen.length };
}

function removeCssMarkers(css) {
  const markers = [
    ["/* FELORAL_CLEAN_CENTER_LOGO_START */", "/* FELORAL_CLEAN_CENTER_LOGO_END */"],
    ["/* FELORAL_CENTER_LOGO_HEADER_FIX_START */", "/* FELORAL_CENTER_LOGO_HEADER_FIX_END */"],
    ["/* FELORAL_REMOVE_OLD_CIRCLE_LOGO_RESTORE_COLOR_START */", "/* FELORAL_REMOVE_OLD_CIRCLE_LOGO_RESTORE_COLOR_END */"]
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
  css = removeCssMarkers(css);

  const fix = `
/* FELORAL_REMOVE_OLD_CIRCLE_LOGO_RESTORE_COLOR_START */

/* Center logo: clean FELORAL only, no old circle/perfume-store badge. */
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

/* Do not force the logo to white anymore. It uses accentColor from the header. */
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
  color: rgba(255, 255, 255, .58) !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: .18em !important;
  line-height: 1 !important;
  text-align: center !important;
  white-space: nowrap !important;
}

/* Extra safety: hide old direct circle/badge only if it somehow survived inside the logo anchor. */
[data-feloral-header-logo="center"] > span:not([data-feloral-logo-text="true"]):not([data-feloral-logo-subtitle="true"]),
[data-feloral-header-logo="center"] .rounded-full,
[data-feloral-header-logo="center"] .logo-circle,
[data-feloral-header-logo="center"] .logo-badge {
  display: none !important;
}

@media (max-width: 1180px) {
  [data-feloral-header-logo="center"] {
    position: static !important;
    transform: none !important;
    justify-self: center !important;
  }
}

/* FELORAL_REMOVE_OLD_CIRCLE_LOGO_RESTORE_COLOR_END */
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
}

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let text = fs.readFileSync(headerPath, "utf8");
const backup = headerPath + ".bak-remove-old-circle-logo-restore-color";

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, "utf8");
}

text = ensureVariables(text);
const result = replaceLogoBlocks(text);
text = result.text;

fs.writeFileSync(headerPath, text, "utf8");
installCss();

console.log("Old circle/perfume-store logo removed/replaced.");
console.log("Logo color restored to accentColor/inherit, not forced white.");
console.log("Replaced/removed logo blocks:", result.count);
console.log("Changed:", headerPath);
console.log("Backup:", backup);
process.exit(0);
