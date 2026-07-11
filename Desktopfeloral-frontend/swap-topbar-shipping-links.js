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

function isOpeningTag(matchText) {
  return /^<([A-Za-z][A-Za-z0-9_.:-]*)\b/.test(matchText) && !matchText.startsWith("</") && !matchText.endsWith("/>");
}

function tagNameOf(matchText) {
  const m = matchText.match(/^<\/?([A-Za-z][A-Za-z0-9_.:-]*)\b/);
  return m ? m[1] : null;
}

function findMatchingClose(text, openStart, openEnd, tag) {
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

function findSmallestBlockContaining(text, requiredIndexes) {
  const minIndex = Math.min(...requiredIndexes);
  const maxIndex = Math.max(...requiredIndexes);

  const tagRe = /<([A-Za-z][A-Za-z0-9_.:-]*)(?:\s[^<>]*?)?>/g;
  const candidates = [];

  while (true) {
    const m = tagRe.exec(text);
    if (!m) break;

    const raw = m[0];
    const tag = tagNameOf(raw);

    if (!tag || !isOpeningTag(raw)) continue;
    if (m.index > minIndex) break;

    const close = findMatchingClose(text, m.index, tagRe.lastIndex, tag);
    if (!close) continue;

    const block = {
      start: m.index,
      end: close.end,
      tag,
      html: text.slice(m.index, close.end)
    };

    if (block.start <= minIndex && block.end >= maxIndex) {
      candidates.push(block);
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => (a.end - a.start) - (b.end - b.start));
  return candidates[0];
}

function hasAll(text) {
  return (
    text.includes(needles.shipping) &&
    text.includes(needles.about) &&
    text.includes(needles.contact) &&
    text.includes(needles.guide)
  );
}

function swapBlocks(text) {
  const shipIndex = text.indexOf(needles.shipping);
  const aboutIndex = text.indexOf(needles.about);
  const contactIndex = text.indexOf(needles.contact);
  const guideIndex = text.indexOf(needles.guide);

  if ([shipIndex, aboutIndex, contactIndex, guideIndex].some((x) => x < 0)) return null;

  const shipBlock = findSmallestBlockContaining(text, [shipIndex]);
  const linksBlock = findSmallestBlockContaining(text, [aboutIndex, contactIndex, guideIndex]);

  if (!shipBlock || !linksBlock) return null;

  const overlap = !(shipBlock.end <= linksBlock.start || linksBlock.end <= shipBlock.start);
  if (overlap) return null;

  const first = shipBlock.start < linksBlock.start ? shipBlock : linksBlock;
  const second = shipBlock.start < linksBlock.start ? linksBlock : shipBlock;

  const firstHtml = text.slice(first.start, first.end);
  const between = text.slice(first.end, second.start);
  const secondHtml = text.slice(second.start, second.end);

  const swapped =
    text.slice(0, first.start) +
    secondHtml +
    between +
    firstHtml +
    text.slice(second.end);

  return {
    swapped,
    shipTag: shipBlock.tag,
    linksTag: linksBlock.tag,
    shipLength: shipBlock.end - shipBlock.start,
    linksLength: linksBlock.end - linksBlock.start
  };
}

function appendCssFallback(targetDir) {
  const candidates = [
    path.join(targetDir, "src", "app", "globals.css"),
    path.join(targetDir, "app", "globals.css")
  ];

  const cssPath = candidates.find((p) => fs.existsSync(p));
  if (!cssPath) return false;

  let css = fs.readFileSync(cssPath, "utf8");
  const start = "/* FELORAL_TOPBAR_SWAP_FALLBACK_START */";
  const end = "/* FELORAL_TOPBAR_SWAP_FALLBACK_END */";
  const re = new RegExp(start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");

  css = css.replace(re, "");

  const fix = `
${start}
/* Fallback: swap common topbar children visually if the structure could not be rewritten. */
.feloral-topbar,
.site-topbar,
.topbar,
.top-bar,
.header-top,
.header__top,
.site-header__top,
.announcement-bar,
.top-strip,
.promo-bar {
  flex-direction: row-reverse !important;
}
${end}
`;

  fs.writeFileSync(cssPath, css.trimEnd() + "\n\n" + fix.trim() + "\n", "utf8");
  return true;
}

if (!fs.existsSync(target)) {
  console.error("Target folder not found:", target);
  process.exit(1);
}

const files = walk(path.join(target, "src")).concat(walk(path.join(target, "app")));
const candidates = [...new Set(files)].filter((file) => {
  const text = fs.readFileSync(file, "utf8");
  return hasAll(text);
});

if (!candidates.length) {
  console.log("No source file found with all topbar texts. Installing CSS fallback only.");
  const cssDone = appendCssFallback(target);
  console.log(cssDone ? "CSS fallback installed." : "CSS fallback failed: globals.css not found.");
  process.exit(cssDone ? 0 : 2);
}

let changed = false;

for (const file of candidates) {
  const text = fs.readFileSync(file, "utf8");
  const result = swapBlocks(text);

  if (!result) {
    console.log("Candidate found but automatic structural swap failed:", file);
    continue;
  }

  const backup = file + ".bak-topbar-swap";
  if (!fs.existsSync(backup)) {
    fs.writeFileSync(backup, text, "utf8");
  }

  fs.writeFileSync(file, result.swapped, "utf8");

  console.log("Topbar shipping/links swapped in:");
  console.log(file);
  console.log("Backup:");
  console.log(backup);
  console.log("Shipping tag:", result.shipTag, "Links tag:", result.linksTag);
  changed = true;
  break;
}

if (!changed) {
  console.log("Structural swap could not be applied. Installing CSS fallback.");
  const cssDone = appendCssFallback(target);
  console.log(cssDone ? "CSS fallback installed." : "CSS fallback failed: globals.css not found.");
  process.exit(cssDone ? 0 : 2);
}

process.exit(0);
