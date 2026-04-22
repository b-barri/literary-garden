import { createHash } from "node:crypto";
import type { BookId, QuoteId } from "./ids.js";
import { asQuoteId } from "./ids.js";

// Canonicalize quote text for stable hashing across re-imports.
//
// NFC-normalize Unicode (guards combining-diacritic drift: NFD "u\u0308" == NFC "ü").
// Collapse any whitespace run to a single space.
// Trim edges.
//
// We intentionally do NOT lowercase. toLowerCase() is locale-sensitive; the
// Turkish "İ" → "i̇" path destabilizes ids for Turkish-language highlights.
// See plan insight D-4.
export function normalizeQuoteText(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

// Stable quote id.
//
// quoteId = SHA-256(bookId + "\0" + normalizedText), first 20 hex chars (80 bits).
// Collision-safe at any realistic personal-library scale.
//
// This is stable against IDENTICAL text within the same book. Kindle
// re-highlighting with shifted boundaries intentionally produces a NEW id;
// orphaned press-state is rescued via the soft-match reattachment pass at
// mount time (see plan Phase 4 Task 4, insight D-1).
export function hashQuoteId(bookId: BookId, text: string): QuoteId {
  const canonical = `${bookId}\x00${normalizeQuoteText(text)}`;
  const hex = createHash("sha256").update(canonical).digest("hex").slice(0, 20);
  return asQuoteId(hex);
}
