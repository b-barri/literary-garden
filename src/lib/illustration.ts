/**
 * Deterministic illustration assignment — same word always gets the same flower.
 *
 * Phase 2 uses four hand-drawn SVGs; per-state visual variation comes from CSS
 * filters on the card, not from per-state assets. Upgrade path in Phase 4:
 * per-state unique illustrations (or per-word unique illustrations) if the
 * palette has earned it.
 */

import daisy from "~/assets/illustrations/daisy.svg?raw";
import tulip from "~/assets/illustrations/tulip.svg?raw";
import rose from "~/assets/illustrations/rose.svg?raw";
import fern from "~/assets/illustrations/fern.svg?raw";

const illustrations = { daisy, tulip, rose, fern } as const;
const names = Object.keys(illustrations) as IllustrationName[];

export type IllustrationName = keyof typeof illustrations;

export function assignIllustration(wordId: string): IllustrationName {
  // djb2-ish, good enough for even distribution across a four-flower library
  let hash = 5381;
  for (let i = 0; i < wordId.length; i++) {
    hash = ((hash << 5) + hash + wordId.charCodeAt(i)) | 0;
  }
  return names[Math.abs(hash) % names.length]!;
}

export function illustrationSvg(name: IllustrationName): string {
  return illustrations[name];
}
