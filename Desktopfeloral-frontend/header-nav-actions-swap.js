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

function indentAt(text, index) {
  const before = text.slice(0, index);
  const m = before.match(/(^|\n)([ \t]*)$/);
  return m ? m[2] : "";
}

function replaceOpeningTagAttr(opening, attr) {
  const tag = openingTagName(opening);
  if (!tag) return opening;
  if (opening.includes(attr.split("=")[0])) return opening;
  return opening.replace(new RegExp("^<" + tag), "<" + tag + " " + attr);
}

function addDataAttrToBlock(text, block, attr) {
  const opening = text.slice(block.start, block.openEnd);
  const updatedOpening = replaceOpeningTagAttr(opening, attr);
  return text.slice(0, block.start) + updatedOpening + text.slice(block.openEnd);
}

function removeMarkedCss(css) {
  const markers = [
    ["/* FELORAL_HEADER_NAV_ACTIONS_SWAP_START */", "/* FELORAL_HEADER_NAV_ACTIONS_SWAP_END */"]
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
/* FELORAL_HEADER_NAV_ACTIONS_SWAP_START */

/* Final header arrangement:
   Left: cart + login + search box
   Right: home + brands + categories + special offer
*/
[data-feloral-mainbar="v1"] {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 24px !important;
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
  direction: rtl !important;
}

[data-feloral-header-nav="right"] {
  grid-column: 2 !important;
  justify-self: end !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 22px !important;
  white-space: nowrap !important;
  direction: rtl !important;
}

/* Search box must stay with cart/login on the left */
[data-feloral-header-search="left"] {
  order: 3 !important;
  min-width: 260px !important;
  max-width: 420px !important;
}

[data-feloral-header-login="left"] {
  order: 2 !important;
}

[data-feloral-header-cart="left"] {
  order: 1 !important;
}

@media (max-width: 920px) {
  [data-feloral-mainbar="v1"] {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  [data-feloral-header-actions="left"],
  [data-feloral-header-nav="right"] {
    grid-column: 1 !important;
    justify-self: stretch !important;
    justify-content: center !important;
    flex-wrap: wrap !important;
  }

  [data-feloral-header-search="left"] {
    min-width: min(100%, 280px) !important;
    max-width: 100% !important;
  }
}

/* FELORAL_HEADER_NAV_ACTIONS_SWAP_END */
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  console.log("CSS installed:", cssPath);
}

if (!fs.existsSync(headerPath)) {
  console.error("site-header.tsx not found:", headerPath);
  process.exit(1);
}

let text = fs.readFileSync(headerPath, "utf8");
const backup = headerPath + ".bak-header-nav-actions-swap";
if (!fs.existsSync(backup)) fs.writeFileSync(backup, text, "utf8");

// Case 1: a row already contains both nav.map and search/cart/login.
// Replace that row with an explicit two-side row.
const navIndex = text.indexOf("nav.map");
const searchIndex = text.indexOf("site.search");
const cartIndex = text.indexOf("/cart");
const loginIndex = Math.max(text.indexOf("/login"), text.indexOf("/auth"), text.indexOf("ورود"));

if (navIndex < 0) {
  console.error("Could not find nav.map in site-header.tsx");
  process.exit(2);
}

// Mark the nav block.
let navBlocks = findBlocksContaining(text, [navIndex], ["nav", "div"]);
if (navBlocks.length) {
  const navBlock = navBlocks[0];
  text = addDataAttrToBlock(text, navBlock, 'data-feloral-header-nav="right"');
}

// Recalculate after changing text.
const recalculatedNavIndex = text.indexOf("nav.map");
const recalculatedSearchIndex = text.indexOf("site.search");
const recalculatedCartIndex = text.indexOf("/cart");
const recalculatedLoginIndex = Math.max(text.indexOf("/login"), text.indexOf("/auth"), text.indexOf("ورود"));

// Mark search block if found.
if (recalculatedSearchIndex >= 0) {
  const searchBlocks = findBlocksContaining(text, [recalculatedSearchIndex], ["div", "form"]);
  if (searchBlocks.length) {
    text = addDataAttrToBlock(text, searchBlocks[0], 'data-feloral-header-search="left"');
  }
}

// Mark cart link if found.
if (recalculatedCartIndex >= 0) {
  const cartBlocks = findBlocksContaining(text, [recalculatedCartIndex], ["a", "Link", "button"]);
  if (cartBlocks.length) {
    text = addDataAttrToBlock(text, cartBlocks[0], 'data-feloral-header-cart="left"');
  }
}

// Mark login link if found.
if (recalculatedLoginIndex >= 0) {
  const loginBlocks = findBlocksContaining(text, [recalculatedLoginIndex], ["a", "Link", "button"]);
  if (loginBlocks.length) {
    text = addDataAttrToBlock(text, loginBlocks[0], 'data-feloral-header-login="left"');
  }
}

// Find a common block containing the action markers.
const actionMarkers = [
  text.indexOf('data-feloral-header-search="left"'),
  text.indexOf('data-feloral-header-cart="left"'),
  text.indexOf('data-feloral-header-login="left"')
].filter((i) => i >= 0);

if (actionMarkers.length >= 2) {
  const actionBlocks = findBlocksContaining(text, actionMarkers, ["div", "section"]);
  if (actionBlocks.length) {
    text = addDataAttrToBlock(text, actionBlocks[0], 'data-feloral-header-actions="left"');
  }
}

// Find the main bar common block containing nav and actions.
const mainMarkers = [
  text.indexOf('data-feloral-header-nav="right"'),
  text.indexOf('data-feloral-header-actions="left"')
].filter((i) => i >= 0);

if (mainMarkers.length === 2) {
  const mainBlocks = findBlocksContaining(text, mainMarkers, ["div", "section"]);
  if (mainBlocks.length) {
    text = addDataAttrToBlock(text, mainBlocks[0], 'data-feloral-mainbar="v1"');
  }
}

// If nav and actions are in separate header rows, move nav into the mainbar by CSS only won't work.
// In that case we at least mark all wrappers and CSS will pull their content right/left if they are common.
// If no common mainbar was found, print a clear error.
if (!text.includes('data-feloral-mainbar="v1"')) {
  // Try to mark the nearest header child container that contains both all source terms.
  const indices = [text.indexOf("nav.map")];
  if (text.indexOf("/cart") >= 0) indices.push(text.indexOf("/cart"));
  if (text.indexOf("site.search") >= 0) indices.push(text.indexOf("site.search"));
  const headerBlocks = findBlocksContaining(text, indices, ["header", "div", "section"]);
  if (headerBlocks.length) {
    text = addDataAttrToBlock(text, headerBlocks[0], 'data-feloral-mainbar="v1"');
  }
}

fs.writeFileSync(headerPath, text, "utf8");
installCss();

console.log("Header marked for nav/actions swap.");
console.log("Changed file:", headerPath);
console.log("Backup:", backup);
console.log("Expected:");
console.log("- Left: cart + login + search");
console.log("- Right: home + brands + categories + special offer");
process.exit(0);
