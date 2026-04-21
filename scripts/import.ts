/**
 * Import the user's Kindle Vocabulary Builder database into processed JSON
 * that Astro content collections consume at build time.
 *
 * Phase 3 adds three enrichment passes:
 *   - title cleaning (strip "(Author)" and "(Z-Library)" from sideloaded books)
 *   - definitions from api.dictionaryapi.dev, cached locally
 *   - covers from Open Library, downloaded to public/covers/, cached locally
 *
 * All enrichments are incremental: already-cached words / books are not re-fetched
 * unless --refresh-definitions or --refresh-covers is passed.
 *
 * Input:  data/raw/vocab.db
 * Output: data/processed/words.json
 *         data/processed/books.json
 *         data/processed/definitions.json
 *         public/covers/{bookId}.jpg  (gitignored)
 */

import Database from "better-sqlite3";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DB_PATH = resolve(ROOT, "data/raw/vocab.db");
const OUT_DIR = resolve(ROOT, "data/processed");
const COVER_DIR = resolve(ROOT, "public/covers");
const DEFINITIONS_PATH = resolve(OUT_DIR, "definitions.json");
const COVER_MANIFEST_PATH = resolve(OUT_DIR, "covers-manifest.json");

const args = new Set(process.argv.slice(2));
const REFRESH_DEFINITIONS = args.has("--refresh-definitions") || args.has("--refresh");
const REFRESH_COVERS = args.has("--refresh-covers") || args.has("--refresh");
const SKIP_NETWORK = args.has("--offline");

// ---------- Types ----------

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
  coverUrl: string | null;
}

interface DefinitionMeaning {
  partOfSpeech: string;
  definition: string;
  example: string | null;
}

interface WordDefinition {
  phonetic: string | null;
  meanings: DefinitionMeaning[];
  fetchedAt: string;
}

interface DefinitionCache {
  [wordId: string]: WordDefinition | null; // null = fetched but not found
}

interface CoverManifest {
  [bookId: string]: {
    source: "openlibrary" | "placeholder";
    olCoverId?: number;
    fetchedAt: string;
  };
}

// ---------- Helpers ----------

function isoFromKindleTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Title cleaning ----------

/**
 * Strip trailing parenthetical groups from sideloaded book titles.
 *
 * Kindle's BOOK_INFO.title often looks like:
 *   "Opinions A Decade of Arguments, ... (Roxane Gay) (Z-Library)"
 * We want:
 *   "Opinions A Decade of Arguments, ..."
 *
 * Iteratively peels trailing `(…)` groups with no inner parens.
 */
function cleanTitle(title: string): string {
  let result = title;
  while (/\s*\([^()]+\)\s*$/.test(result)) {
    result = result.replace(/\s*\([^()]+\)\s*$/, "");
  }
  return result.trim();
}

// ---------- Definition fetching ----------

async function fetchDefinition(word: string): Promise<WordDefinition | null> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LiteraryGarden/0.1 (personal, non-commercial)" },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`  ! definition fetch failed for "${word}": ${res.status}`);
      return null;
    }
    const data = (await res.json()) as Array<{
      phonetic?: string;
      phonetics?: Array<{ text?: string }>;
      meanings?: Array<{
        partOfSpeech?: string;
        definitions?: Array<{ definition?: string; example?: string }>;
      }>;
    }>;
    const first = data[0];
    if (!first) return null;
    const phonetic =
      first.phonetic ?? first.phonetics?.find((p) => p.text)?.text ?? null;
    const meanings: DefinitionMeaning[] = [];
    for (const m of first.meanings ?? []) {
      const def = m.definitions?.[0];
      if (!def?.definition) continue;
      meanings.push({
        partOfSpeech: m.partOfSpeech ?? "",
        definition: def.definition,
        example: def.example ?? null,
      });
      // First definition per POS is enough for the card back.
      if (meanings.length >= 3) break;
    }
    if (meanings.length === 0) return null;
    return { phonetic, meanings, fetchedAt: new Date().toISOString() };
  } catch (err) {
    console.warn(`  ! definition fetch error for "${word}":`, (err as Error).message);
    return null;
  }
}

async function enrichDefinitions(words: Word[]): Promise<DefinitionCache> {
  const cache: DefinitionCache = REFRESH_DEFINITIONS
    ? {}
    : readJson<DefinitionCache>(DEFINITIONS_PATH, {});

  if (SKIP_NETWORK) {
    console.log(`  ↷ skipping definition fetch (--offline) · ${Object.keys(cache).length} cached`);
    return cache;
  }

  const toFetch = words.filter((w) => !(w.id in cache));
  if (toFetch.length === 0) {
    console.log(`  ✓ definitions already cached for all ${words.length} words`);
    return cache;
  }

  console.log(`  → fetching ${toFetch.length} definitions (politely, 1/sec)…`);
  let fetched = 0;
  let found = 0;
  for (const word of toFetch) {
    // Prefer the stem for dictionary lookup — "acquiesced" resolves better as "acquiesce".
    const def = await fetchDefinition(word.stem || word.word);
    cache[word.id] = def;
    if (def) found++;
    fetched++;
    if (fetched % 20 === 0) {
      console.log(`     ${fetched}/${toFetch.length}… (${found} found)`);
      // Write progress periodically so an interrupted run isn't wasted.
      writeJson(DEFINITIONS_PATH, cache);
    }
    await sleep(1000 + Math.floor(Math.random() * 400)); // 1.0–1.4s between calls
  }
  writeJson(DEFINITIONS_PATH, cache);
  console.log(`  ✓ definitions: ${found}/${toFetch.length} found, saved to definitions.json`);
  return cache;
}

// ---------- Cover fetching ----------

interface OLSearchDoc {
  cover_i?: number;
  title?: string;
  author_name?: string[];
  key?: string;
}

async function resolveOpenLibraryCover(
  title: string,
  authors: string,
): Promise<number | null> {
  // Author field comes as "Lastname, Firstname" — flip it for search.
  const authorGuess = authors.includes(",")
    ? authors.split(",").reverse().map((s) => s.trim()).join(" ")
    : authors;
  const params = new URLSearchParams({
    q: `${title} ${authorGuess}`,
    limit: "3",
    fields: "cover_i,title,author_name,key",
  });
  const url = `https://openlibrary.org/search.json?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LiteraryGarden/0.1 (personal, non-commercial)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { docs?: OLSearchDoc[] };
    const docs = data.docs ?? [];
    // Prefer the first doc that has a cover image.
    const hit = docs.find((d) => typeof d.cover_i === "number");
    return hit?.cover_i ?? null;
  } catch {
    return null;
  }
}

async function downloadCover(coverId: number, destPath: string): Promise<boolean> {
  const url = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg?default=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    // OL serves a tiny ~800 byte gray fallback even with default=false sometimes.
    if (buf.length < 1500) return false;
    writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

async function enrichCovers(books: Book[]): Promise<CoverManifest> {
  mkdirSync(COVER_DIR, { recursive: true });

  const manifest: CoverManifest = REFRESH_COVERS
    ? {}
    : readJson<CoverManifest>(COVER_MANIFEST_PATH, {});

  if (SKIP_NETWORK) {
    console.log(`  ↷ skipping cover fetch (--offline) · ${Object.keys(manifest).length} cached`);
    // Still set coverUrl from existing manifest entries.
    for (const book of books) {
      const entry = manifest[book.id];
      book.coverUrl = entry ? `/covers/${book.id}.${entry.source === "placeholder" ? "svg" : "jpg"}` : null;
    }
    return manifest;
  }

  const toProcess = books.filter((b) => !(b.id in manifest));
  if (toProcess.length === 0) {
    console.log(`  ✓ covers already cached for all ${books.length} books`);
  } else {
    console.log(`  → resolving ${toProcess.length} book covers (politely)…`);
  }

  for (const book of toProcess) {
    const destJpg = resolve(COVER_DIR, `${book.id}.jpg`);
    const coverId = await resolveOpenLibraryCover(book.title, book.authors);
    if (coverId) {
      const ok = await downloadCover(coverId, destJpg);
      if (ok) {
        manifest[book.id] = {
          source: "openlibrary",
          olCoverId: coverId,
          fetchedAt: new Date().toISOString(),
        };
        console.log(`     ✓ ${book.title.slice(0, 40)}`);
      } else {
        manifest[book.id] = { source: "placeholder", fetchedAt: new Date().toISOString() };
        console.log(`     ○ ${book.title.slice(0, 40)} (download failed)`);
      }
    } else {
      manifest[book.id] = { source: "placeholder", fetchedAt: new Date().toISOString() };
      console.log(`     ○ ${book.title.slice(0, 40)} (no OL match)`);
    }
    await sleep(1000); // be polite to OL
  }
  writeJson(COVER_MANIFEST_PATH, manifest);

  // Set book.coverUrl from the manifest.
  for (const book of books) {
    const entry = manifest[book.id];
    if (!entry) {
      book.coverUrl = null;
    } else if (entry.source === "openlibrary") {
      book.coverUrl = `/covers/${book.id}.jpg`;
    } else {
      book.coverUrl = null; // placeholder SVG is rendered in-component
    }
  }
  const realCovers = Object.values(manifest).filter((e) => e.source === "openlibrary").length;
  console.log(`  ✓ covers: ${realCovers}/${books.length} real, ${books.length - realCovers} placeholders`);
  return manifest;
}

// ---------- Main ----------

async function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`✖ No vocab.db found at ${DB_PATH}`);
    console.error(`  Copy it from your Kindle's system/vocabulary/vocab.db and retry.`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
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
    if (!usage) continue;

    const lookup: Lookup = { usage, bookId: row.book_id, seenAt, pos: row.pos };

    const existing = wordsById.get(row.word_id);
    if (existing) {
      existing.lookups.push(lookup);
      existing.lastSeenAt = seenAt;
      existing.primaryBookId = row.book_id;
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
        title: cleanTitle(row.book_title), // Phase 3: strip "(Author)" and "(Z-Library)"
        authors: row.book_authors,
        lang: row.book_lang,
        wordCount: 0,
        coverUrl: null,
      });
    }

    if (!wordsPerBook.has(row.book_id)) {
      wordsPerBook.set(row.book_id, new Set());
    }
    wordsPerBook.get(row.book_id)!.add(row.word_id);
  }

  const words = [...wordsById.values()].map((w) => ({
    ...w,
    lookups: [...w.lookups].reverse(),
  }));
  const books = [...booksById.values()].map((b) => ({
    ...b,
    wordCount: wordsPerBook.get(b.id)?.size ?? 0,
  }));

  words.sort((a, b) => a.word.localeCompare(b.word));
  books.sort((a, b) => a.title.localeCompare(b.title));

  console.log(`🌱 Parsed ${words.length} words from ${books.length} books\n`);

  console.log("📖 Enriching definitions…");
  await enrichDefinitions(words);

  console.log("\n🌸 Enriching book covers…");
  await enrichCovers(books);

  writeJson(resolve(OUT_DIR, "words.json"), words);
  writeJson(resolve(OUT_DIR, "books.json"), books);
  console.log(`\n✨ Garden seeded.`);
}

main().catch((err) => {
  console.error("✖ Import failed:", err);
  process.exit(1);
});
