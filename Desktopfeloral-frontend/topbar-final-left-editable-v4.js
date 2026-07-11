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

  const insert =
`const topLinkKeyMap: Record<string, string> = {
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
    ["/* FELORAL_TOPBAR_FINAL_LEFT_EDITABLE_V4_START */", "/* FELORAL_TOPBAR_FINAL_LEFT_EDITABLE_V4_END */"]
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
/* FELORAL_TOPBAR_FINAL_LEFT_EDITABLE_V4_START */

/* Final topbar:
   shipping message = far left
   about/contact/guide = far right
   all items use the same accent color
*/
[data-feloral-topbar-exact="v4"] {
  position: relative !important;
  left: 50% !important;
  right: 50% !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 24px !important;
  width: 100vw !important;
  max-width: 100vw !important;
  margin-left: -50vw !important;
  margin-right: -50vw !important;
  box-sizing: border-box !important;
  padding-block: 8px !important;
  padding-inline: clamp(18px, 4vw, 72px) !important;
  direction: ltr !important;
}

[data-feloral-topbar-side="shipping"] {
  grid-column: 1 !important;
  justify-self: start !important;
  align-self: center !important;
  margin: 0 !important;
  text-align: left !important;
  direction: rtl !important;
  min-width: 0 !important;
}

[data-feloral-topbar-side="links"] {
  grid-column: 2 !important;
  justify-self: end !important;
  align-self: center !important;
  margin: 0 !important;
  text-align: right !important;
  direction: rtl !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 22px !important;
  white-space: nowrap !important;
}

[data-feloral-topbar-side="links"] a {
  color: inherit !important;
  text-decoration: none !important;
}

[data-feloral-topbar-side="links"] a:hover {
  opacity: .78 !important;
}

[data-feloral-topbar-shipping-icon="true"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 999px !important;
  border: 1px solid currentColor !important;
  color: inherit !important;
  flex: 0 0 auto !important;
}

[data-feloral-topbar-shipping-icon="true"] svg {
  display: block !important;
  width: 14px !important;
  height: 14px !important;
  stroke: currentColor !important;
}

@media (max-width: 768px) {
  [data-feloral-topbar-exact="v4"] {
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    padding-inline: 14px !important;
  }

  [data-feloral-topbar-side="shipping"],
  [data-feloral-topbar-side="links"] {
    grid-column: 1 !important;
    justify-self: center !important;
    text-align: center !important;
    white-space: normal !important;
  }

  [data-feloral-topbar-side="links"] {
    gap: 12px !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
  }
}

/* FELORAL_TOPBAR_FINAL_LEFT_EDITABLE_V4_END */
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  console.log("CSS v4 installed:", cssPath);
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

const blocks = findBlocksContaining(text, [shippingIndex, linksIndex])
  .filter((b) => b.tag === "div" || b.tag === "section");

if (!blocks.length) {
  console.error("Could not find topbar common block.");
  process.exit(3);
}

const block = blocks[0];
const before = text.slice(0, block.start);
const indentMatch = before.match(/(^|\n)([ \t]*)$/);
const indent = indentMatch ? indentMatch[2] : "        ";

const replacement = `${indent}<div data-feloral-topbar-exact="v4" className="feloral-topbar-final" dir="ltr">
${indent}  <div data-feloral-topbar-side="shipping" dir="rtl" style={{ color: accentColor }}>
${indent}    <CmsEditMarker
${indent}      cmsKey="site.top.shippingNotice"
${indent}      sectionKey="site.header"
${indent}      label="اطلاعیه ارسال"
${indent}      value={shippingNotice}
${indent}    >
${indent}      <span className="inline-flex items-center gap-2 text-[13px] font-semibold leading-none">
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

${indent}  <div data-feloral-topbar-side="links" dir="rtl" style={{ color: accentColor }}>
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
${indent}          <a href={link.href} className="text-[13px] font-semibold transition">
${indent}            {label}
${indent}          </a>
${indent}        </CmsEditMarker>
${indent}      );
${indent}    })}
${indent}  </div>
${indent}</div>`;

const backup = headerPath + ".bak-final-left-editable-v4";
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, "utf8");
}

text = text.slice(0, block.start) + replacement + text.slice(block.end);
fs.writeFileSync(headerPath, text, "utf8");

installCss();

console.log("Header v4 installed:", headerPath);
console.log("Backup:", backup);
console.log("Final:");
console.log("- Shipping is editable and goes far left.");
console.log("- About/contact/guide are editable and stay far right.");
console.log("- All four items use accentColor.");
console.log("- Shipping icon is visible SVG truck.");
process.exit(0);
