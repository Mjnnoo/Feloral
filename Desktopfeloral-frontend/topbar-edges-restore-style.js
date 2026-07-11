const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const headerPath = path.join(target, "src", "components", "layout", "site-header.tsx");
const cssPath = fs.existsSync(path.join(target, "src", "app", "globals.css"))
  ? path.join(target, "src", "app", "globals.css")
  : path.join(target, "app", "globals.css");

function findMatchingDiv(text, openStart) {
  const openEnd = text.indexOf(">", openStart) + 1;
  if (openEnd <= 0) return null;

  const re = /<\/?div(?:\s[^<>]*?)?>/g;
  re.lastIndex = openEnd;

  let depth = 1;

  while (true) {
    const m = re.exec(text);
    if (!m) return null;

    const raw = m[0];

    if (raw.startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return {
          openEnd,
          closeStart: m.index,
          end: re.lastIndex
        };
      }
    } else if (!raw.endsWith("/>")) {
      depth += 1;
    }
  }
}

function replaceShippingBlock() {
  if (!fs.existsSync(headerPath)) {
    console.error("site-header.tsx not found:", headerPath);
    process.exit(1);
  }

  let text = fs.readFileSync(headerPath, "utf8");

  const shippingStart = text.indexOf('<div data-feloral-topbar-side="shipping"');

  if (shippingStart < 0) {
    console.error('Could not find data-feloral-topbar-side="shipping". Install the force topbar v3 patch first.');
    process.exit(2);
  }

  const block = findMatchingDiv(text, shippingStart);
  if (!block) {
    console.error("Could not find closing div for shipping block.");
    process.exit(3);
  }

  const before = text.slice(0, shippingStart);
  const indentMatch = before.match(/(^|\n)([ \t]*)$/);
  const indent = indentMatch ? indentMatch[2] : "          ";

  const replacement = `${indent}<div data-feloral-topbar-side="shipping" className="min-w-0 justify-self-start text-left" dir="rtl">
${indent}  <CmsEditMarker
${indent}    cmsKey="site.top.shippingNotice"
${indent}    sectionKey="site.header"
${indent}    label="اطلاعیه ارسال"
${indent}    value={shippingNotice}
${indent}  >
${indent}    <span className="inline-flex items-center gap-2 text-[13px] font-semibold leading-none" style={{ color: accentColor }}>
${indent}      <span
${indent}        aria-hidden="true"
${indent}        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-black shadow-sm"
${indent}        style={{ backgroundColor: accentColor }}
${indent}      >
${indent}        ✦
${indent}      </span>
${indent}      <span>{shippingNotice}</span>
${indent}    </span>
${indent}  </CmsEditMarker>
${indent}</div>`;

  const backup = headerPath + ".bak-topbar-edges-style";
  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, text, "utf8");
  }

  text = text.slice(0, shippingStart) + replacement + text.slice(block.end);
  fs.writeFileSync(headerPath, text, "utf8");

  console.log("Shipping style/icon restored in:", headerPath);
  console.log("Backup:", backup);
}

function removeMarkedBlocks(css) {
  const markers = [
    ["/* FELORAL_TOPBAR_SWAP_FALLBACK_START */", "/* FELORAL_TOPBAR_SWAP_FALLBACK_END */"],
    ["/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_START */", "/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_END */"],
    ["/* FELORAL_FORCE_TOPBAR_LEFT_RIGHT_V3_START */", "/* FELORAL_FORCE_TOPBAR_LEFT_RIGHT_V3_END */"],
    ["/* FELORAL_TOPBAR_EDGES_RESTORE_STYLE_START */", "/* FELORAL_TOPBAR_EDGES_RESTORE_STYLE_END */"]
  ];

  for (const [start, end] of markers) {
    const re = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    css = css.replace(re, "");
  }

  return css;
}

function updateCss() {
  if (!fs.existsSync(cssPath)) {
    console.error("globals.css not found:", cssPath);
    process.exit(4);
  }

  let css = fs.readFileSync(cssPath, "utf8");
  css = removeMarkedBlocks(css);

  const fix = `
/* FELORAL_TOPBAR_EDGES_RESTORE_STYLE_START */

/* Topbar final layout:
   shipping notice goes to the far left edge,
   about/contact/guide links go to the far right edge.
*/
[data-feloral-topbar-exact="v3"] {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 24px !important;

  width: 100% !important;
  max-width: none !important;
  margin-inline: 0 !important;
  box-sizing: border-box !important;

  padding-block: 8px !important;
  padding-inline: clamp(16px, 2.4vw, 42px) !important;
  direction: ltr !important;
}

[data-feloral-topbar-side="shipping"] {
  grid-column: 1 !important;
  justify-self: start !important;
  align-self: center !important;
  margin: 0 !important;
  margin-inline-start: 0 !important;
  margin-inline-end: auto !important;
  text-align: left !important;
  direction: rtl !important;
  min-width: 0 !important;
}

[data-feloral-topbar-side="shipping"] [data-cms-key],
[data-feloral-topbar-side="shipping"] span {
  color: inherit;
}

[data-feloral-topbar-side="links"] {
  grid-column: 2 !important;
  justify-self: end !important;
  align-self: center !important;
  margin: 0 !important;
  margin-inline-start: auto !important;
  margin-inline-end: 0 !important;
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
    padding-inline: 14px !important;
  }

  [data-feloral-topbar-side="shipping"],
  [data-feloral-topbar-side="links"] {
    grid-column: 1 !important;
    justify-self: center !important;
    text-align: center !important;
    white-space: normal !important;
  }
}

/* FELORAL_TOPBAR_EDGES_RESTORE_STYLE_END */
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  console.log("Topbar edge CSS installed in:", cssPath);
}

replaceShippingBlock();
updateCss();

console.log("Done: shipping style/icon restored + both sides moved to page edges.");
process.exit(0);
