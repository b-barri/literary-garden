// Spine colour resolution with two paths:
//
//   1. If the book has a `spineColor` extracted from its cover at seed time
//      (data/processed/covers-manifest.json via sharp), use that. Text
//      colour is chosen from Rec. 709 luminance so contrast stays readable.
//   2. Otherwise (placeholder-covered books, or one outlier cream cover)
//      fall back to a deterministic 7-colour hand-palette with neighbour
//      collision mitigation so adjacent spines never twin.

const SPINE_PALETTE = [
  "var(--color-leather-dark)",
  "var(--color-gold)",
  "var(--color-wax-crimson)",
  "var(--color-wax-amber)",
  "var(--color-teal-700)",
  "var(--color-sage-700)",
  "var(--color-wisteria-500)",
] as const;

export type SpineColor = (typeof SPINE_PALETTE)[number];

function hashBookId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function spineColorFor(bookId: string): SpineColor {
  return SPINE_PALETTE[hashBookId(bookId) % SPINE_PALETTE.length];
}

// Hand-picked title color for each spine background (AA-contrast).
// Gold/amber are light enough for ink; everything else takes cream.
export function spineTitleColor(bg: SpineColor): string {
  if (bg === "var(--color-gold)" || bg === "var(--color-wax-amber)") {
    return "var(--color-leather-dark)";
  }
  return "var(--color-cream)";
}

// Walk the sorted list and advance any spine whose colour matches its
// neighbour. Keeps deterministic given input order.
export function assignSpineColors(bookIds: readonly string[]): SpineColor[] {
  const colors: SpineColor[] = [];
  for (let i = 0; i < bookIds.length; i++) {
    let c = spineColorFor(bookIds[i]);
    if (i > 0 && colors[i - 1] === c) {
      const idx = SPINE_PALETTE.indexOf(c);
      c = SPINE_PALETTE[(idx + 1) % SPINE_PALETTE.length];
    }
    colors.push(c);
  }
  return colors;
}

// --- Cover-derived spine colour ---

// Rec. 709 relative luminance of a "#rrggbb" hex. 0 = black, 1 = white.
function luminanceOfHex(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 0.5;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Some cover extractions land on a near-white margin colour. If the
// dominant comes back above this threshold it looks like a blank spine
// against the watercolour paper — fall back to the palette instead.
const PALE_REJECT_L = 0.86;

export type ResolvedSpine = { bg: string; fg: string };

// Takes the book's sharp-extracted spineColor and decides: use it with a
// luminance-derived text colour, or fall back to the palette. Returns a
// plain CSS string (hex or var()) so callers can drop it into inline style.
export function resolveSpine(
  bookId: string,
  spineColor: string | null,
  paletteFallback: SpineColor,
): ResolvedSpine {
  if (spineColor) {
    const L = luminanceOfHex(spineColor);
    if (L < PALE_REJECT_L) {
      // Pick the text colour by luminance. The knee is lower than 0.5 to
      // favour cream text on mid-tones — cream reads as "gold-foil on
      // leather", ink as "dark-stamp on parchment". Hand-tuned.
      const fg = L > 0.62 ? "var(--color-leather-dark)" : "var(--color-cream)";
      return { bg: spineColor, fg };
    }
  }
  return { bg: paletteFallback, fg: spineTitleColor(paletteFallback) };
}
