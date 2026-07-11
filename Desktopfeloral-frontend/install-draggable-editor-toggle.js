const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "C:\\Users\\MJN\\Desktop\\feloral\\Desktopfeloral-frontend";
const srcRoot = path.join(target, "src");

const exts = new Set([".tsx", ".jsx"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".turbo", ".git", "dist", "build", "payload", "New folder"].includes(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, out);
    } else if (exts.has(path.extname(entry.name))) {
      out.push(full);
    }
  }

  return out;
}

function scoreCandidate(file) {
  const text = fs.readFileSync(file, "utf8");
  let score = 0;

  if (text.includes("ادیتور فعال است")) score += 100;
  if (text.includes("روی یک متن")) score += 60;
  if (text.includes("خروج")) score += 40;
  if (text.includes("enableEditor")) score += 30;
  if (text.includes("disableEditor")) score += 30;
  if (text.includes("useCmsEditor")) score += 30;
  if (text.includes("cms-editor-toolbar")) score += 25;
  if (text.includes("cms-editor-toggle")) score += 25;
  if (file.toLowerCase().includes("toolbar")) score += 20;
  if (file.toLowerCase().includes("toggle")) score += 20;
  if (file.includes("cms-editor-provider")) score -= 100;
  if (file.includes("cms-editor-sidebar")) score -= 100;

  return score;
}

function detectExport(text, file) {
  let m = text.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/);
  if (m) return { kind: "defaultNamedFunction", name: m[1] };

  m = text.match(/export\s+function\s+([A-Za-z0-9_]+)\s*\(/);
  if (m) return { kind: "namedFunction", name: m[1] };

  m = text.match(/export\s+const\s+([A-Za-z0-9_]+)\s*=/);
  if (m) return { kind: "namedFunction", name: m[1] };

  if (text.match(/export\s+default\s+function\s*\(/)) {
    const base = path.basename(file, path.extname(file))
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    return { kind: "defaultNamedFunction", name: base || "CmsEditorToggle" };
  }

  if (text.match(/export\s+default\s+/)) {
    const base = path.basename(file, path.extname(file))
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    return { kind: "defaultNamedFunction", name: base || "CmsEditorToggle" };
  }

  const base = path.basename(file, path.extname(file))
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return { kind: "namedFunction", name: base || "CmsEditorToggle" };
}

function componentCode(exportInfo) {
  const fnStart =
    exportInfo.kind === "defaultNamedFunction"
      ? `export default function ${exportInfo.name}()`
      : `export function ${exportInfo.name}()`;

  return `"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useCmsEditor } from "@/components/cms/cms-editor-provider";

type TogglePosition = {
  left: number;
  top: number;
};

const POSITION_STORAGE_KEY = "feloral_editor_toggle_position_v1";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultPosition(): TogglePosition {
  if (typeof window === "undefined") {
    return { left: 18, top: 18 };
  }

  return {
    left: 18,
    top: Math.max(18, window.innerHeight - 76)
  };
}

function readSavedPosition(): TogglePosition {
  if (typeof window === "undefined") return { left: 18, top: 18 };

  try {
    const saved = window.localStorage.getItem(POSITION_STORAGE_KEY);

    if (!saved) return getDefaultPosition();

    const parsed = JSON.parse(saved) as Partial<TogglePosition>;

    if (typeof parsed.left !== "number" || typeof parsed.top !== "number") {
      return getDefaultPosition();
    }

    return {
      left: clamp(parsed.left, 8, window.innerWidth - 180),
      top: clamp(parsed.top, 8, window.innerHeight - 58)
    };
  } catch {
    return getDefaultPosition();
  }
}

${fnStart} {
  const { enabled, enableEditor, disableEditor, closePanel } = useCmsEditor();

  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<TogglePosition>({ left: 18, top: 18 });

  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0
  });

  useEffect(() => {
    setPosition(readSavedPosition());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [mounted, position]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      setPosition((current) => ({
        left: clamp(current.left, 8, window.innerWidth - 180),
        top: clamp(current.top, 8, window.innerHeight - 58)
      }));
    };

    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!mounted) return null;

  const toggleEditor = () => {
    if (enabled) {
      closePanel();
      disableEditor();
      return;
    }

    enableEditor();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: position.left,
      startTop: position.top
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.moved = true;
    }

    setPosition({
      left: clamp(drag.startLeft + dx, 8, window.innerWidth - 180),
      top: clamp(drag.startTop + dy, 8, window.innerHeight - 58)
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag.active || drag.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already be released by the browser.
    }

    dragRef.current.active = false;

    if (!drag.moved) {
      toggleEditor();
    }
  };

  return (
    <div
      className="feloral-editor-draggable-toggle"
      role="button"
      tabIndex={0}
      aria-pressed={enabled}
      title="برای فعال/غیرفعال کردن کلیک کن؛ برای جابه‌جایی با موس بکش"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleEditor();
        }
      }}
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        zIndex: 2147483000,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 150,
        padding: "10px 14px",
        borderRadius: 999,
        border: enabled ? "1px solid rgba(214,168,79,.75)" : "1px solid rgba(255,255,255,.18)",
        background: enabled ? "rgba(17, 17, 17, .92)" : "rgba(17, 17, 17, .72)",
        color: enabled ? "#f4d58d" : "rgba(255,255,255,.72)",
        boxShadow: enabled ? "0 14px 40px rgba(0,0,0,.28), 0 0 0 1px rgba(214,168,79,.12)" : "0 12px 30px rgba(0,0,0,.22)",
        backdropFilter: "blur(12px)",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
        fontFamily: "var(--font-main), Vazirmatn, sans-serif",
        fontSize: 13,
        fontWeight: 800,
        lineHeight: 1,
        direction: "rtl"
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: enabled ? "#d6a84f" : "rgba(255,255,255,.35)",
          boxShadow: enabled ? "0 0 14px rgba(214,168,79,.9)" : "none",
          flex: "0 0 auto"
        }}
      />

      <span>{enabled ? "ادیتور فعال است" : "ادیتور غیرفعال است"}</span>
    </div>
  );
}
`;
}

if (!fs.existsSync(srcRoot)) {
  console.error("src folder not found:", srcRoot);
  process.exit(1);
}

const files = walk(srcRoot);
const scored = files
  .map((file) => ({ file, score: scoreCandidate(file) }))
  .filter((item) => item.score > 40)
  .sort((a, b) => b.score - a.score);

if (!scored.length) {
  console.error("Could not find the editor toolbar/toggle component.");
  console.error("Search hint: send results for files containing 'ادیتور فعال است' or 'enableEditor'.");
  process.exit(2);
}

const targetFile = scored[0].file;
const original = fs.readFileSync(targetFile, "utf8");
const exportInfo = detectExport(original, targetFile);
const backup = targetFile + ".bak-draggable-toggle";

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, original, "utf8");
}

fs.writeFileSync(targetFile, componentCode(exportInfo), "utf8");

console.log("Editor toolbar/toggle replaced with draggable single toggle.");
console.log("Changed file:", targetFile);
console.log("Backup:", backup);
console.log("Detected export:", exportInfo.kind, exportInfo.name);
console.log("Removed extra helper texts/buttons from this component.");
console.log("Click once: active. Click again: inactive.");
console.log("Drag with mouse: move anywhere; position is saved.");
process.exit(0);
