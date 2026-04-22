// Single source of truth for Astro content collection schemas.
// Imported by src/content.config.ts (wrapped in defineCollection) and by
// src/lib/types.ts (for z.infer types). Keeps the build-time schema and
// runtime types from drifting.
// See plan insight A-1.

import { z } from "astro/zod";

const lookup = z.object({
  usage: z.string(),
  bookId: z.string(),
  seenAt: z.iso.datetime(),
  pos: z.string().nullable(),
});

export const wordSchema = z.object({
  id: z.string(),
  word: z.string(),
  stem: z.string(),
  lang: z.string(),
  firstSeenAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime(),
  primaryBookId: z.string(),
  lookups: z.array(lookup).nonempty(),
});

// Kindle highlight timestamps are device-local with no offset ("Added on
// Monday, March 24, 2024 7:14:03 PM"). We preserve that form rather than
// converting to UTC to avoid silent drift when the build machine's TZ
// differs from the Kindle's — `z.iso.datetime({ local: true })` accepts
// `YYYY-MM-DDTHH:mm:ss` without a `Z` suffix. See plan insight D-4 (Kindle
// parsing) and F-2 (zod v4).
export const bookSchema = z.object({
  id: z.string(),
  asin: z.string().nullable(),
  title: z.string(),
  authors: z.string(),
  lang: z.string(),
  wordCount: z.number().int().nonnegative(),
  coverUrl: z.string().nullable().default(null),
  // Dominant colour extracted from the cover JPG at seed time — drives
  // the spine colour in the scrapbook so each spine matches its book's
  // binding. Null for placeholder-covered books (the 7-palette applies).
  spineColor: z.string().nullable().default(null),
  firstHighlightAt: z.iso.datetime({ local: true }).nullable().default(null),
  mostRecentHighlightAt: z.iso.datetime({ local: true }).nullable().default(null),
  highlightCount: z.number().int().nonnegative().default(0),
});

export const quoteSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  text: z.string(),
  location: z.string().nullable().default(null),
  page: z.string().nullable().default(null),
  highlightedAt: z.iso.datetime({ local: true }),
  note: z.string().nullable().default(null),
});
