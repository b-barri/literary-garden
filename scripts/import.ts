/**
 * Import the user's Kindle Vocabulary Builder database into processed JSON
 * that Astro content collections consume at build time.
 *
 * Input:  data/raw/vocab.db
 * Output: data/processed/words.json, data/processed/books.json
 *
 * Phase 1 scope — no cover art, no dictionary definitions (Phase 3).
 */

import Database from "better-sqlite3";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DB_PATH = resolve(ROOT, "data/raw/vocab.db");
const OUT_DIR = resolve(ROOT, "data/processed");

interface LookupRow {
  word_id: string;
  word: string;
  stem: string;
  lang: string;
  category: number;
  book_id: string;
  book_asin: string | null;
  book_title: string;
  book_authors: string;
  book_lang: string;
  usage: string | null;
  pos: string | null;
  lookup_timestamp: number;
}

interface Lookup {
  usage: string;
  bookId: string;
  seenAt: string;
  pos: string | null;
}

interface Word {
  id: string;
  word: string;
  stem: string;
  lang: string;
  firstSeenAt: string;
  lastSeenAt: string;
  primaryBookId: string;
  lookups: Lookup[];
}

interface Book {
  id: string;
  asin: string | null;
  title: string;
  authors: string;
  lang: string;
  wordCount: number;
}

function isoFromKindleTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`✖ No vocab.db found at ${DB_PATH}`);
    console.error(`  Copy it from your Kindle's system/vocabulary/vocab.db and retry.`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

  // INNER JOIN filters orphaned LOOKUPS (words deleted on-Kindle but lookups remain).
  // Order by timestamp ASC so the reduce step sees oldest→newest per word.
  const rows = db
    .prepare(
      `SELECT
         w.id         AS word_id,
         w.word       AS word,
         w.stem       AS stem,
         w.lang       AS lang,
         w.category   AS category,
         b.id         AS book_id,
         b.asin       AS book_asin,
         b.title      AS book_title,
         b.authors    AS book_authors,
         b.lang       AS book_lang,
         l.usage      AS usage,
         l.pos        AS pos,
         l.timestamp  AS lookup_timestamp
       FROM LOOKUPS l
       INNER JOIN WORDS w     ON w.id = l.word_key
       INNER JOIN BOOK_INFO b ON b.id = l.book_key
       ORDER BY l.timestamp ASC`,
    )
    .all() as LookupRow[];

  db.close();

  const wordsById = new Map<string, Word>();
  const booksById = new Map<string, Book>();
  const wordsPerBook = new Map<string, Set<string>>();

  for (const row of rows) {
    const seenAt = isoFromKindleTimestamp(row.lookup_timestamp);
    const usage = (row.usage ?? "").trim();

    // Skip lookups without any sentence at all — nothing to teach with.
    // (Empty `usage` is rare but possible for very old lookups.)
    if (!usage) continue;

    const lookup: Lookup = {
      usage,
      bookId: row.book_id,
      seenAt,
      pos: row.pos,
    };

    const existing = wordsById.get(row.word_id);
    if (existing) {
      existing.lookups.push(lookup);
      existing.lastSeenAt = seenAt;
      existing.primaryBookId = row.book_id; // ASC order → last write wins = most recent
    } else {
      wordsById.set(row.word_id, {
        id: row.word_id,
        word: row.word,
        stem: row.stem,
        lang: row.lang,
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
        primaryBookId: row.book_id,
        lookups: [lookup],
      });
    }

    if (!booksById.has(row.book_id)) {
      booksById.set(row.book_id, {
        id: row.book_id,
        asin: row.book_asin,
        title: row.book_title,
        authors: row.book_authors,
        lang: row.book_lang,
        wordCount: 0,
      });
    }

    if (!wordsPerBook.has(row.book_id)) {
      wordsPerBook.set(row.book_id, new Set());
    }
    wordsPerBook.get(row.book_id)!.add(row.word_id);
  }

  // Flip lookups to newest-first per the card-back design (recent context first).
  const words = [...wordsById.values()].map((w) => ({
    ...w,
    lookups: [...w.lookups].reverse(),
  }));

  const books = [...booksById.values()].map((b) => ({
    ...b,
    wordCount: wordsPerBook.get(b.id)?.size ?? 0,
  }));

  // Sort for stable, human-readable output.
  words.sort((a, b) => a.word.localeCompare(b.word));
  books.sort((a, b) => a.title.localeCompare(b.title));

  writeFileSync(resolve(OUT_DIR, "words.json"), JSON.stringify(words, null, 2) + "\n");
  writeFileSync(resolve(OUT_DIR, "books.json"), JSON.stringify(books, null, 2) + "\n");

  const totalLookups = words.reduce((n, w) => n + w.lookups.length, 0);
  console.log(`🌱 Imported ${words.length} words from ${books.length} books (${totalLookups} lookups)`);
  console.log(`   → data/processed/words.json`);
  console.log(`   → data/processed/books.json`);
}

main();
