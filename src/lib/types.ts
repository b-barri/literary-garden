// Runtime types inferred from Zod schemas. Single source of truth lives in
// ./schemas.ts. Use these types everywhere (components, scripts, lib) rather
// than redeclaring interfaces per-file.
// See plan insight A-1.

import type { z } from "astro/zod";
import type { wordSchema, bookSchema, quoteSchema } from "./schemas.js";
import type { QuoteId } from "./ids.js";

export type Word = z.infer<typeof wordSchema>;
export type Book = z.infer<typeof bookSchema>;
export type Quote = z.infer<typeof quoteSchema>;

// Per-quote pressed-state entry. Persisted in localStorage via
// src/lib/scrapbook.ts (Phase 4). Not part of any content collection.
// Note is always `string | null` — never `undefined`-or-absent — because
// JSON.stringify drops undefined values, which breaks round-trips.
// See plan insight T-10.
export type PressedEntry = {
  pressedAt: string;
  note: string | null;
};

export type PressedStore = {
  version: 1;
  pressed: Record<QuoteId, PressedEntry>;
};
