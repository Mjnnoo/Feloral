const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const file = path.join(target, "src", "components", "cms", "header-drag-editor.tsx");

if (!fs.existsSync(file)) {
  console.error("header-drag-editor.tsx not found:", file);
  process.exit(1);
}

let text = fs.readFileSync(file, "utf8");
const backup = file + ".bak-fix-logo-drag-important";
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, text, "utf8");
}

if (!text.includes("function setImportantStyle(")) {
  text = text.replace(
    /function applyFixed\(/,
    `function setImportantStyle(el: HTMLElement, key: string, value: string) {
  el.style.setProperty(key, value, "important");
}

function applyFixed(`
  );
}

text = text.replace(
  /function applyFixed\(el: HTMLElement, pos: SavedPosition\) \{[\s\S]*?\n\}/,
  `function applyFixed(el: HTMLElement, pos: SavedPosition) {
  setImportantStyle(el, "position", "fixed");
  setImportantStyle(el, "left", \`\${pos.left}px\`);
  setImportantStyle(el, "top", \`\${pos.top}px\`);
  setImportantStyle(el, "right", "auto");
  setImportantStyle(el, "bottom", "auto");
  setImportantStyle(el, "margin", "0");
  setImportantStyle(el, "transform", "none");
  setImportantStyle(el, "z-index", "99980");
  if (pos.width && pos.width > 20) setImportantStyle(el, "width", \`\${pos.width}px\`);
}`
);

text = text.replace(
  /item\.el\.style\.left = `\$\{left\}px`;\s*\n\s*item\.el\.style\.top = `\$\{top\}px`;/g,
  `setImportantStyle(item.el, "left", \`\${left}px\`);
      setImportantStyle(item.el, "top", \`\${top}px\`);`
);

text = text.replace(
  /element\.style\.left = `\$\{Math\.max\(0, Math\.round\(nextLeft\)\)\}px`;\s*\n\s*element\.style\.top = `\$\{Math\.max\(0, Math\.round\(nextTop\)\)\}px`;/g,
  `setImportantStyle(element, "left", \`\${Math.max(0, Math.round(nextLeft))}px\`);
            setImportantStyle(element, "top", \`\${Math.max(0, Math.round(nextTop))}px\`);`
);

text = text.replace(
  /handle\.style\.zIndex = "99999";/g,
  `handle.style.zIndex = item.id === "logo" ? "100001" : "99999";`
);

fs.writeFileSync(file, text, "utf8");

console.log("OK: logo drag now uses inline !important styles.");
console.log("Patched:", file);
console.log("Backup:", backup);
