const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";

const needles = {
  shipping: "ارسال رایگان",
  about: "درباره ما",
  contact: "تماس با ما",
  guide: "راهنما"
};

const exts = new Set([".tsx", ".jsx", ".ts", ".js"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".turbo", ".git", "dist", "build"].includes(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, out);
    } else if (exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }

  return out;
}

function hasAll(text) {
  return (
    text.includes(needles.shipping) &&
    text.includes(needles.about) &&
    text.includes(needles.contact) &&
    text.includes(needles.guide)
  );
}

function tagNameOf(matchText) {
  const m = matchText.match(/^<\/?([A-Za-z][A-Za-z0-9_.:-]*)\b/);
  return m ? m[1] : null;
}

function findMatchingClose(text, openEnd, tag) {
  const tagRe = /<\/?([A-Za-z][A-Za-z0-9_.:-]*)(?:\s[^<>]*?)?>/g;
  tagRe.lastIndex = openEnd;

  let depth = 1;

  while (true) {
    const m = tagRe.exec(text);
    if (!m) return null;

    const raw = m[0];
    const name = m[1];

    if (name !== tag) continue;

    if (raw.startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return {
          start: m.index,
          end: tagRe.lastIndex
        };
      }
    } else if (!raw.endsWith("/>")) {
      depth += 1;
    }
  }
}

function allBlocksContaining(text, requiredIndexes) {
  const minIndex = Math.min(...requiredIndexes);
  const maxIndex = Math.max(...requiredIndexes);

  const tagRe = /<([A-Za-z][A-Za-z0-9_.:-]*)(?:\s[^<>]*?)?>/g;
  const candidates = [];

  while (true) {
    const m = tagRe.exec(text);
    if (!m) break;

    const raw = m[0];
    const tag = tagNameOf(raw);

    if (!tag || raw.startsWith("</") || raw.endsWith("/>")) continue;
    if (m.index > minIndex) break;

    const close = findMatchingClose(text, tagRe.lastIndex, tag);
    if (!close) continue;

    const block = {
      start: m.index,
      openEnd: tagRe.lastIndex,
      closeStart: close.start,
      end: close.end,
      tag,
      length: close.end - m.index
    };

    if (block.start <= minIndex && block.end >= maxIndex) {
      candidates.push(block);
    }
  }

  candidates.sort((a, b) => a.length - b.length);
  return candidates;
}

function findSmallestBlockContaining(text, requiredIndexes) {
  return allBlocksContaining(text, requiredIndexes)[0] || null;
}

function removeOldAttrs(text) {
  return text.replace(/\sdata-feloral-topbar-position="(?:root|shipping|links)"/g, "");
}

function insertAttr(text, block, value) {
  const opening = text.slice(block.start, block.openEnd);

  if (opening.includes(`data-feloral-topbar-position="${value}"`)) return text;

  const insertAt = block.openEnd - 1;
  return text.slice(0, insertAt) + ` data-feloral-topbar-position="${value}"` + text.slice(insertAt);
}

function markBlocks(text) {
  text = removeOldAttrs(text);

  const shipIndex = text.indexOf(needles.shipping);
  const aboutIndex = text.indexOf(needles.about);
  const contactIndex = text.indexOf(needles.contact);
  const guideIndex = text.indexOf(needles.guide);

  if ([shipIndex, aboutIndex, contactIndex, guideIndex].some((x) => x < 0)) return null;

  const shipBlock = findSmallestBlockContaining(text, [shipIndex]);
  const linksBlock = findSmallestBlockContaining(text, [aboutIndex, contactIndex, guideIndex]);
  const parentBlocks = allBlocksContaining(text, [shipIndex, aboutIndex, contactIndex, guideIndex]);

  if (!shipBlock || !linksBlock || !parentBlocks.length) return null;

  const parentBlock = parentBlocks.find((b) => {
    const isDifferentFromShip = !(b.start === shipBlock.start && b.end === shipBlock.end);
    const isDifferentFromLinks = !(b.start === linksBlock.start && b.end === linksBlock.end);
    const containsBothChildren = b.start <= shipBlock.start && b.end >= shipBlock.end && b.start <= linksBlock.start && b.end >= linksBlock.end;
    return isDifferentFromShip && isDifferentFromLinks && containsBothChildren;
  }) || parentBlocks[0];

  if (
    parentBlock.start === shipBlock.start ||
    parentBlock.start === linksBlock.start ||
    linksBlock.start === shipBlock.start
  ) {
    return null;
  }

  const insertions = [
    { block: parentBlock, value: "root" },
    { block: shipBlock, value: "shipping" },
    { block: linksBlock, value: "links" }
  ].sort((a, b) => b.block.openEnd - a.block.openEnd);

  let output = text;
  for (const item of insertions) {
    output = insertAttr(output, item.block, item.value);
  }

  return {
    text: output,
    parentLength: parentBlock.length,
    shippingLength: shipBlock.length,
    linksLength: linksBlock.length
  };
}

function updateCss(targetDir) {
  const candidates = [
    path.join(targetDir, "src", "app", "globals.css"),
    path.join(targetDir, "app", "globals.css")
  ];

  const cssPath = candidates.find((p) => fs.existsSync(p));
  if (!cssPath) return false;

  let css = fs.readFileSync(cssPath, "utf8");

  const oldStart = "/* FELORAL_TOPBAR_SWAP_FALLBACK_START */";
  const oldEnd = "/* FELORAL_TOPBAR_SWAP_FALLBACK_END */";
  const oldRe = new RegExp(oldStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + oldEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  css = css.replace(oldRe, "");

  const start = "/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_START */";
  const end = "/* FELORAL_TOPBAR_LEFT_RIGHT_FIX_END */";
  const re = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  css = css.replace(re, "");

  const fix = `
${start}
/* Topbar exact layout:
   left: free-shipping message
   right: about/contact/guide links
*/
[data-feloral-topbar-position="root"] {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 24px !important;
  width: 100% !important;
  max-width: 100% !important;
  direction: ltr !important;
}

[data-feloral-topbar-position="shipping"] {
  order: 1 !important;
  margin-inline-start: 0 !important;
  margin-inline-end: auto !important;
  text-align: left !important;
  direction: rtl !important;
  white-space: nowrap !important;
}

[data-feloral-topbar-position="links"] {
  order: 2 !important;
  margin-inline-start: auto !important;
  margin-inline-end: 0 !important;
  text-align: right !important;
  direction: rtl !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 18px !important;
  white-space: nowrap !important;
}

@media (max-width: 768px) {
  [data-feloral-topbar-position="root"] {
    gap: 10px !important;
  }

  [data-feloral-topbar-position="shipping"],
  [data-feloral-topbar-position="links"] {
    white-space: normal !important;
    font-size: 11px !important;
  }

  [data-feloral-topbar-position="links"] {
    gap: 10px !important;
  }
}
${end}
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  return cssPath;
}

if (!fs.existsSync(target)) {
  console.error("Target folder not found:", target);
  process.exit(1);
}

const searchRoots = [path.join(target, "src"), path.join(target, "app")];
const files = [...new Set(searchRoots.flatMap((root) => walk(root)))];

const candidates = files.filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return hasAll(text);
});

if (!candidates.length) {
  console.error("No source file found with all topbar texts.");
  process.exit(2);
}

let changed = false;

for (const file of candidates) {
  const original = fs.readFileSync(file, "utf8");
  const marked = markBlocks(original);

  if (!marked) {
    console.log("Candidate found but block marking failed:", file);
    continue;
  }

  const backup = file + ".bak-topbar-left-right";
  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, original, "utf8");
  }

  fs.writeFileSync(file, marked.text, "utf8");

  console.log("Topbar blocks marked in:");
  console.log(file);
  console.log("Backup:");
  console.log(backup);
  console.log("Parent length:", marked.parentLength);
  console.log("Shipping length:", marked.shippingLength);
  console.log("Links length:", marked.linksLength);
  changed = true;
  break;
}

if (!changed) {
  console.error("Could not mark topbar blocks automatically.");
  process.exit(3);
}

const cssPath = updateCss(target);
if (!cssPath) {
  console.error("globals.css not found.");
  process.exit(4);
}

console.log("CSS left/right fix installed in:");
console.log(cssPath);
process.exit(0);
