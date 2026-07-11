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

function getOpeningTagName(raw) {
  const m = raw.match(/^<([A-Za-z][A-Za-z0-9_.:-]*)\b/);
  return m ? m[1] : null;
}

function findBlocksContaining(text, indexes) {
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
      blocks.push({ start: m.index, openEnd: tagRe.lastIndex, closeStart: close.closeStart, end: close.end, tag, length: close.end - m.index });
    }
  }

  blocks.sort((a, b) => a.length - b.length);
  return blocks;
}

function ensureTopLinkKeyMap(text) {
  if (text.includes("const topLinkKeyMap")) return text;
  const marker = "const navKeyMap";
  const index = text.indexOf(marker);
  if (index < 0) {
    console.error("Could not find navKeyMap to insert topLinkKeyMap.");
    process.exit(5);
  }
  const insert = `const topLinkKeyMap: Record<string, string> = {
  "/about": "site.top.about",
  "/contact": "site.top.contact",
  "/guide": "site.top.guide"
};

`;
  return text.slice(0, index) + insert + text.slice(index);
}

function removeMarkedCss(css) {
  const markers = [
    ["/* FELORAL_TOPBAR_SWAP_FALLBACK_START */", "/* FELORAL_TOPBAR_SWAP_FALLBACK_END */"],
    ["/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_START */", "/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_END */"],
    ["/* FELORAL_FORCE_TOPBAR_LEFT_RIGHT_V3_START */", "/* FELORAL_FORCE_TOPBAR_LEFT_RIGHT_V3_END */"],
    ["/* FELORAL_TOPBAR_EDGES_RESTORE_STYLE_START */", "/* FELORAL_TOPBAR_EDGES_RESTORE_STYLE_END */"],
    ["/* FELORAL_TOPBAR_FINAL_LEFT_EDITABLE_V4_START */", "/* FELORAL_TOPBAR_FINAL_LEFT_EDITABLE_V4_END */"],
    ["/* FELORAL_TOPBAR_SHIPPING_COLOR_ONLY_START */", "/* FELORAL_TOPBAR_SHIPPING_COLOR_ONLY_END */"],
    ["/* FELORAL_TOPBAR_FONT_TOOLBAR_V5_START */", "/* FELORAL_TOPBAR_FONT_TOOLBAR_V5_END */"]
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
/* FELORAL_TOPBAR_FONT_TOOLBAR_V5_START */

[data-feloral-topbar-exact="v5"] {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 24px !important;
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  padding-block: 8px !important;
  padding-inline: clamp(18px, 4vw, 72px) !important;
  direction: ltr !important;
}

[data-feloral-topbar-side="shipping"] {
  order: 1 !important;
  flex: 0 1 auto !important;
  margin: 0 auto 0 0 !important;
  text-align: left !important;
  direction: rtl !important;
  font-size: 13px;
  font-weight: 600;
}

[data-feloral-topbar-side="links"] {
  order: 2 !important;
  flex: 0 0 auto !important;
  margin: 0 0 0 auto !important;
  text-align: right !important;
  direction: rtl !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 22px !important;
  white-space: nowrap !important;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 600;
}

[data-feloral-topbar-exact="v5"] [data-cms-key] {
  display: inline-flex !important;
  align-items: center !important;
  max-width: max-content;
}

[data-feloral-topbar-exact="v5"] [data-cms-key] > *,
[data-feloral-topbar-exact="v5"] [data-cms-key] > * > *,
[data-feloral-topbar-exact="v5"] [data-cms-key] a,
[data-feloral-topbar-exact="v5"] [data-cms-key] span:not([data-feloral-topbar-shipping-icon="true"]) {
  font-family: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  color: inherit !important;
  line-height: inherit !important;
}

[data-feloral-topbar-side="links"] a {
  color: inherit !important;
  text-decoration: none !important;
}

[data-feloral-topbar-side="links"] a:hover {
  color: #ffffff !important;
}

[data-feloral-topbar-shipping-icon="true"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 22px !important;
  height: 22px !important;
  min-width: 22px !important;
  border-radius: 999px !important;
  border: 1px solid currentColor !important;
  color: inherit !important;
  flex: 0 0 auto !important;
  opacity: 1 !important;
}

[data-feloral-topbar-shipping-icon="true"] svg {
  display: block !important;
  width: 14px !important;
  height: 14px !important;
  stroke: currentColor !important;
  color: inherit !important;
  opacity: 1 !important;
}

.cms-editor-toolbar,
.cms-editor-floating-toolbar,
.cms-editor-mode-toolbar,
.cms-editor-debug-toolbar,
.cms-editor-statusbar,
.cms-editor-topbar,
.cms-editor-control-bar,
.cms-editor-toggle,
.cms-editor-floating,
.cms-debug-toolbar,
[data-cms-editor-toolbar],
[data-editor-toolbar],
[data-feloral-editor-toolbar] {
  position: fixed !important;
  top: auto !important;
  right: auto !important;
  bottom: 18px !important;
  left: 18px !important;
  z-index: 2147482500 !important;
}

@media (max-width: 768px) {
  [data-feloral-topbar-exact="v5"] {
    flex-direction: column !important;
    justify-content: center !important;
    gap: 8px !important;
    padding-inline: 14px !important;
  }
  [data-feloral-topbar-side="shipping"],
  [data-feloral-topbar-side="links"] {
    margin: 0 !important;
    text-align: center !important;
    white-space: normal !important;
  }
  [data-feloral-topbar-side="links"] {
    gap: 12px !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
  }
}

/* FELORAL_TOPBAR_FONT_TOOLBAR_V5_END */
`;
  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  console.log("CSS v5 installed:", cssPath);
}

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let text = fs.readFileSync(headerPath, "utf8");
text = ensureTopLinkKeyMap(text);
const shippingIndex = text.indexOf('cmsKey="site.top.shippingNotice"');
const linksIndex = text.indexOf("topLinks.map");
if (shippingIndex < 0 || linksIndex < 0) {
  console.error("Could not find shipping marker or topLinks.map.");
  process.exit(2);
}
const blocks = findBlocksContaining(text, [shippingIndex, linksIndex]).filter((b) => b.tag === "div" || b.tag === "section");
if (!blocks.length) {
  console.error("Could not find topbar common block.");
  process.exit(3);
}
const block = blocks[0];
const before = text.slice(0, block.start);
const indentMatch = before.match(/(^|\n)([ \t]*)$/);
const indent = indentMatch ? indentMatch[2] : "        ";

const replacement = `${indent}<div data-feloral-topbar-exact="v5" className="feloral-topbar-final" dir="ltr">
${indent}  <div data-feloral-topbar-side="shipping" dir="rtl" style={{ color: accentColor }}>
${indent}    <CmsEditMarker
${indent}      cmsKey="site.top.shippingNotice"
${indent}      sectionKey="site.header"
${indent}      label="اطلاعیه ارسال"
${indent}      value={shippingNotice}
${indent}    >
${indent}      <span className="inline-flex items-center gap-2 leading-none">
${indent}        <span data-feloral-topbar-shipping-icon="true" aria-hidden="true">
${indent}          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
${indent}            <path d="M3 7h11v9H3z" />
${indent}            <path d="M14 10h4l3 3v3h-7z" />
${indent}            <circle cx="7" cy="18" r="2" />
${indent}            <circle cx="17" cy="18" r="2" />
${indent}          </svg>
${indent}        </span>
${indent}        <span>{shippingNotice}</span>
${indent}      </span>
${indent}    </CmsEditMarker>
${indent}  </div>

${indent}  <div data-feloral-topbar-side="links" dir="rtl">
${indent}    {topLinks.map((link, index) => {
${indent}      const cmsKey = topLinkKeyMap[link.href] || \`site.top.link.\${index + 1}\`;
${indent}      const label = getText(cms, cmsKey, link.label);

${indent}      return (
${indent}        <CmsEditMarker
${indent}          key={link.href}
${indent}          cmsKey={cmsKey}
${indent}          sectionKey="site.header"
${indent}          label={\`لینک بالای هدر \${link.label}\`}
${indent}          value={label}
${indent}        >
${indent}          <a href={link.href} className="transition">
${indent}            {label}
${indent}          </a>
${indent}        </CmsEditMarker>
${indent}      );
${indent}    })}
${indent}  </div>
${indent}</div>`;

const backup = headerPath + ".bak-topbar-font-toolbar-v5";
if (!fs.existsSync(backup)) fs.writeFileSync(backup, text, "utf8");
text = text.slice(0, block.start) + replacement + text.slice(block.end);
fs.writeFileSync(headerPath, text, "utf8");
installCss();
console.log("Header v5 installed:", headerPath);
console.log("Backup:", backup);
process.exit(0);
