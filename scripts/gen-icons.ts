/**
 * One-shot PWA icon generator. Produces standard manifest icon sizes
 * + apple-touch-icon + favicon from a single source. Run with:
 *   pnpm tsx scripts/gen-icons.ts
 *
 * Re-run any time the brand mark changes.
 */

import sharp from "sharp";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = resolve(ROOT, "public/cameo.png");

interface Target {
  path: string;
  size: number;
  // Optional cream canvas — app icons look better with a painted
  // circle background than a transparent cameo on top of whatever
  // wallpaper the user has. Android round-icon-mask-friendly.
  background?: string;
}

const TARGETS: Target[] = [
  { path: "public/icon-192.png", size: 192, background: "#F7F2E4" },
  { path: "public/icon-512.png", size: 512, background: "#F7F2E4" },
  { path: "public/apple-touch-icon.png", size: 180, background: "#F7F2E4" },
  { path: "public/favicon.png", size: 48, background: "#F7F2E4" },
];

for (const t of TARGETS) {
  let pipeline = sharp(SRC).resize(t.size, t.size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (t.background) {
    pipeline = pipeline.flatten({ background: t.background });
  }
  await pipeline.png().toFile(resolve(ROOT, t.path));
  console.log(`  ✓ ${t.path} (${t.size}×${t.size})`);
}

console.log("\n✨ Icons generated.");
