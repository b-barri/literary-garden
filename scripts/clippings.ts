// Kindle `My Clippings.txt` parser — pure functions.
//
// Entry point: parseClippings(raw, vocabBooks) returns { quotes, bookEnrichments,
// synthesizedBooks }. The caller (scripts/import.ts) is the only writer; this
// module does no file I/O and no mutation of its inputs.
//
// Design notes captured from plan insights:
//   D-2  Regex splitter `/\r?\n=+\r?\n/` (CRLF/LF mix post-Kindle-cloud-sync)
//   D-3  `cleanTitle` refuses to strip numeric/Roman-numeral parens (anthology
//        false-positive), only strips on known-author match or denylist
//   D-4  NFC normalize, no `toLowerCase` on hash input
//   D-6  `kind` detected by locale-aware keyword set, not English literal
//   D-7  No writes here — caller's problem
//   S-2  Slugify whitelist; 64KB per-block ceiling (ReDoS guard)

import type { BookId } from "../src/lib/ids.js";
import { asBookId } from "../src/lib/ids.js";
import { hashQuoteId } from "../src/lib/quoteId.js";
import type { Book, Quote } from "../src/lib/types.js";

// ---------- Types ----------

export type RawClipping =
  | RawHighlight
  | { kind: "Note" | "Bookmark"; rawTitleLine: string; text: string; location: string | null; page: string | null; highlightedAt: string };

type RawHighlight = {
  kind: "Highlight";
  rawTitleLine: string;
  text: string;
  location: string | null;
  page: string | null;
  highlightedAt: string;
  note: string | null;
};

export interface BookEnrichment {
  firstHighlightAt: string;
  mostRecentHighlightAt: string;
  highlightCount: number;
}

export interface ParseResult {
  quotes: Quote[];
  bookEnrichments: Map<BookId, BookEnrichment>;
  synthesizedBooks: Book[];
}

// ---------- Constants ----------

const MAX_BLOCK_BYTES = 64 * 1024;

// Locale-aware keyword detection. English primary; common non-English tokens
// included so the parser doesn't drop Kindle clippings from German/Japanese/
// Korean/Spanish/French/Russian/Arabic users silently.
const HIGHLIGHT_RE = /\b(highlight|markierung|ハイライト|하이라이트|resaltado|destaque|surligné|выделение)\b|تمييز/i;
const NOTE_RE = /\b(note|notiz|メモ|노트|nota|заметка)\b|ملاحظة/i;
const BOOKMARK_RE = /\b(bookmark|lesezeichen|しおり|북마크|marcador|señalador|marque-page|закладка)\b|إشارة مرجعية/i;

const LOCATION_RE = /(?:Location|Position|位置|위치|Posición|Emplacement|Позиция)[\s:]*([\d-]+)/i;
const PAGE_RE = /\bpage\s+([\d-]+)/i;

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const TITLE_SUFFIX_DENYLIST = /^(z-?library|epub|retail|kindle[\s-]?edition|ebook|pdf|mobi|goodreads|libgen)$/i;
const CONTAINS_DIGIT_OR_ROMAN = /\d|^[ivxlcdm]+$/i;

// ---------- Parser ----------

/**
 * Parse the entire `My Clippings.txt` file. Strips BOM, splits on the
 * separator, drops malformed blocks (after logging), attaches Notes to
 * preceding Highlights, reconciles book identity against vocab.db books.
 */
export function parseClippings(raw: string, vocabBooks: Book[]): ParseResult {
  const rawClippings = parseClippingsFile(raw);
  const highlights = attachNotes(rawClippings);

  const quotes: Quote[] = [];
  const bookEnrichments = new Map<BookId, BookEnrichment>();
  const synthesizedById = new Map<BookId, Book>();
  const seenQuoteIds = new Set<string>();

  for (const h of highlights) {
    const reconciled = reconcileBook(h.rawTitleLine, vocabBooks);
    const bookId = asBookId(reconciled.book.id);
    if (reconciled.source === "synthesized" && !synthesizedById.has(bookId)) {
      synthesizedById.set(bookId, reconciled.book);
    }

    const quoteId = hashQuoteId(bookId, h.text);
    if (seenQuoteIds.has(quoteId)) continue;
    seenQuoteIds.add(quoteId);

    quotes.push({
      id: quoteId,
      bookId,
      text: h.text,
      location: h.location,
      page: h.page,
      highlightedAt: h.highlightedAt,
      note: h.note,
    });

    const existing = bookEnrichments.get(bookId);
    if (existing) {
      existing.highlightCount += 1;
      if (h.highlightedAt < existing.firstHighlightAt) existing.firstHighlightAt = h.highlightedAt;
      if (h.highlightedAt > existing.mostRecentHighlightAt) existing.mostRecentHighlightAt = h.highlightedAt;
    } else {
      bookEnrichments.set(bookId, {
        firstHighlightAt: h.highlightedAt,
        mostRecentHighlightAt: h.highlightedAt,
        highlightCount: 1,
      });
    }
  }

  return {
    quotes,
    bookEnrichments,
    synthesizedBooks: [...synthesizedById.values()],
  };
}

/**
 * Parse the raw file into an ordered list of RawClipping records.
 * Logs and skips malformed blocks; never throws.
 */
export function parseClippingsFile(raw: string): RawClipping[] {
  // Strip UTF-8 BOM if present (older Kindles sometimes emit it).
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  // Split on separator runs of `=` surrounded by newlines; handles CRLF/LF
  // mixes that Kindle cloud sync can produce in one file.
  const blocks = cleaned.split(/\r?\n=+\r?\n/);

  const out: RawClipping[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i].trim();
    if (!block) continue;
    if (Buffer.byteLength(block, "utf8") > MAX_BLOCK_BYTES) {
      console.warn(`  ✖ clippings block #${i} exceeds ${MAX_BLOCK_BYTES} bytes, skipping`);
      continue;
    }
    const parsed = parseBlock(block);
    if (parsed) out.push(parsed);
  }
  return out;
}

function parseBlock(block: string): RawClipping | null {
  const lines = block.split(/\r?\n/);
  if (lines.length < 2) return null;
  const titleLine = lines[0].trim();
  const metaLine = lines[1].trim();
  // Body is everything after the blank separator line.
  const bodyStart = lines[2] === "" ? 3 : 2;
  const text = lines.slice(bodyStart).join("\n").trim();

  const kind = detectKind(metaLine);
  if (!kind) return null;

  const location = extractMatch(metaLine, LOCATION_RE, (m) => `Location ${m}`);
  const page = extractMatch(metaLine, PAGE_RE, (m) => `page ${m}`);
  const highlightedAt = extractTimestamp(metaLine);
  if (!highlightedAt) return null;

  if (kind === "Highlight") {
    return { kind, rawTitleLine: titleLine, text, location, page, highlightedAt, note: null };
  }
  return { kind, rawTitleLine: titleLine, text, location, page, highlightedAt };
}

function detectKind(metaLine: string): "Highlight" | "Note" | "Bookmark" | null {
  if (HIGHLIGHT_RE.test(metaLine)) return "Highlight";
  if (NOTE_RE.test(metaLine)) return "Note";
  if (BOOKMARK_RE.test(metaLine)) return "Bookmark";
  return null;
}

function extractMatch(s: string, re: RegExp, format: (m: string) => string): string | null {
  const m = s.match(re);
  return m ? format(m[1]) : null;
}

function extractTimestamp(metaLine: string): string | null {
  const addedMatch = metaLine.match(/Added on\s+(.+)$/i);
  const candidate = addedMatch ? addedMatch[1].trim() : metaLine;
  return parseKindleTimestamp(candidate);
}

/**
 * Parse a Kindle-style date string into a naive local ISO timestamp
 * (`YYYY-MM-DDTHH:mm:ss`, no offset). English only for v1; Kindle clippings
 * in other locales use different month-name conventions.
 *
 * Accepts: "Monday, March 24, 2024 7:14:03 PM" and the comma-less variants.
 * Returns null on anything else.
 */
export function parseKindleTimestamp(input: string): string | null {
  const s = input.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  // Pattern: [Weekday] Month Day Year H:MM:SS [AM|PM]
  const m = s.match(/(?:\w+\s+)?([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!m) return null;
  const [, monthName, dayStr, yearStr, hourStr, minStr, secStr, ampm] = m;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;
  let hour = Number(hourStr);
  const min = Number(minStr);
  const sec = Number(secStr);
  if (ampm) {
    const isPM = ampm.toUpperCase() === "PM";
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
  }
  const day = Number(dayStr);
  const year = Number(yearStr);
  if (!Number.isFinite(month) || day < 1 || day > 31 || hour > 23 || min > 59 || sec > 59) return null;
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(min)}:${pad2(sec)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Attach Note blocks to the preceding Highlight if they share a raw title
 * line and the Highlight has no note yet. Notes that don't match are
 * dropped. Bookmarks are always dropped.
 */
function attachNotes(clippings: RawClipping[]): RawHighlight[] {
  const highlights: RawHighlight[] = [];
  let last: RawHighlight | null = null;
  for (const c of clippings) {
    if (c.kind === "Highlight") {
      highlights.push(c);
      last = c;
    } else if (c.kind === "Note" && last && last.rawTitleLine === c.rawTitleLine && last.note === null) {
      last.note = c.text;
    }
    // Bookmarks are ignored intentionally (navigational, not content).
  }
  return highlights;
}

// ---------- Book reconciliation ----------

/**
 * Given a raw title line from clippings (may include "(Author) (Z-Library)"
 * style suffixes) and the existing vocab.db book list, either:
 *   - match an existing book (source = "vocab-db"), or
 *   - synthesize a new Book record (source = "synthesized").
 *
 * Applies a hardened title cleanup: only strips a trailing `(...)` group if
 * its contents match a known author name OR a curated denylist (Z-Library
 * etc.). REFUSES to strip parens containing digits or Roman numerals — this
 * guards against collapsing "Foundation (Vol 1)" and "Foundation (Vol 2)"
 * into a single book. See plan insight D-3.
 */
export function reconcileBook(
  rawTitleLine: string,
  vocabBooks: Book[],
): { source: "vocab-db" | "synthesized"; book: Book } {
  const knownAuthors = buildAuthorSet(vocabBooks.map((b) => b.authors));
  const { title: cleaned, author: extractedAuthor } = cleanTitle(rawTitleLine, knownAuthors);

  const norm = normalizeForMatch(cleaned);
  for (const b of vocabBooks) {
    if (normalizeForMatch(b.title) === norm) {
      return { source: "vocab-db", book: b };
    }
  }

  const synthesized: Book = {
    id: slugifyBookId(cleaned),
    asin: null,
    title: cleaned,
    authors: extractedAuthor ?? "Unknown",
    lang: "en",
    wordCount: 0,
    coverUrl: null,
    spineColor: null,
    firstHighlightAt: null,
    mostRecentHighlightAt: null,
    highlightCount: 0,
  };
  return { source: "synthesized", book: synthesized };
}

/**
 * Normalize for equality comparison between clippings titles and vocab.db
 * titles. NFC + whitespace collapse + en-US case fold. See plan insight D-4.
 */
function normalizeForMatch(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

/**
 * Build a set of lowercase author forms. vocab.db stores "Last, First" —
 * we also register the swapped "First Last" form so clippings titles
 * like "... (Aysegül Savaş)" match against "Savaş, Aysegül" in vocab.db.
 */
function buildAuthorSet(authorStrings: string[]): Set<string> {
  const out = new Set<string>();
  for (const a of authorStrings) {
    const norm = a.normalize("NFC").trim().toLocaleLowerCase("en-US");
    if (!norm) continue;
    out.add(norm);
    if (norm.includes(",")) {
      const [last, first] = norm.split(",").map((s) => s.trim());
      if (last && first) out.add(`${first} ${last}`);
    } else {
      // Also add "Last, First" form in case the author appears both ways.
      const parts = norm.split(/\s+/);
      if (parts.length >= 2) {
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(" ");
        out.add(`${last}, ${first}`);
      }
    }
  }
  return out;
}

function cleanTitle(rawTitleLine: string, knownAuthors: Set<string>): { title: string; author: string | null } {
  let working = rawTitleLine.trim();
  let extractedAuthor: string | null = null;

  // Iteratively peel trailing `(...)` groups; never strip volume markers.
  while (true) {
    const m = working.match(/\s*\(([^()]+)\)\s*$/);
    if (!m) break;
    const inner = m[1].trim();

    if (CONTAINS_DIGIT_OR_ROMAN.test(inner)) {
      break;
    }
    const innerNorm = inner.normalize("NFC").toLocaleLowerCase("en-US");
    const matchesAuthor = knownAuthors.has(innerNorm);
    const matchesDenylist = TITLE_SUFFIX_DENYLIST.test(innerNorm);

    if (!matchesAuthor && !matchesDenylist) {
      // Unknown paren group — might be the author on a book that isn't in
      // vocab.db. Strip it once as the extracted author, but only if we
      // haven't already captured one.
      if (extractedAuthor === null) {
        extractedAuthor = inner;
        working = working.slice(0, m.index).trim();
        continue;
      }
      break;
    }

    if (matchesAuthor && extractedAuthor === null) {
      extractedAuthor = inner;
    }
    working = working.slice(0, m.index).trim();
  }

  return { title: working, author: extractedAuthor };
}

/**
 * Deterministic, safe book id from a cleaned title.
 * Whitelist [a-z0-9-], strip leading dots, cap 64 chars. See plan insight S-2.
 */
export function slugifyBookId(s: string): string {
  const stripped = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/^\.+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return stripped.slice(0, 64) || "untitled";
}
