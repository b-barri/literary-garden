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
import { mkdirSync, writeFileSync, existsSync, readFileSync, renameSync, utimesSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { parseClippings } from "./clippings.js";
import type { Book, Quote } from "../src/lib/types.js";

const ROOT = resolve(import.meta.dirname, "..");
const DB_PATH = resolve(ROOT, "data/raw/vocab.db");
const CLIPPINGS_PATH = resolve(ROOT, "data/raw/My Clippings.txt");
const OUT_DIR = resolve(ROOT, "data/processed");
const COVER_DIR = resolve(ROOT, "public/covers");
const DEFINITIONS_PATH = resolve(OUT_DIR, "definitions.json");
const COVER_MANIFEST_PATH = resolve(OUT_DIR, "covers-manifest.json");
const QUOTES_PATH = resolve(OUT_DIR, "quotes.json");

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

// `Book` type is imported from ../src/lib/types.js (z.infer from the shared
// Zod schema) so the build-time shape matches the content-collection schema
// exactly. See plan insight A-1.

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
    source: "openlibrary" | "googlebooks" | "manual" | "placeholder";
    olCoverId?: number;
    // Hex string (#rrggbb) of the cover's dominant colour. Sharp's
    // histogram-based dominant extraction; omitted for placeholders.
    spineColor?: string;
    fetchedAt: string;
  };
}

// User-editable manual-cover overrides. Keyed by bookId → direct image URL.
// Read once per seed run; takes precedence over both OL and GB. Useful for
// sideloaded books the public APIs don't index (or index under a different
// normalisation) — the user can paste any direct image URL and the importer
// will download, cache, and extract a spine colour like any other cover.
// File is optional; missing or malformed file = no overrides, no error.
interface CoverOverrides {
  [bookId: string]: string;
}
const COVER_OVERRIDES_PATH = resolve(ROOT, "data/raw/cover-overrides.json");

// User-editable manual-definition overrides. Keyed by the canonical word
// (case-insensitive) — the importer matches against both the raw Kindle
// word and its stem. Lets the user supply definitions for proper nouns
// ("Dorchester"), phrases the Kindle captured as "words" ("I know"), or
// anything else dictionaryapi.dev doesn't index. The partial shape is
// merged into a full WordDefinition at load time — only `meanings` is
// required; phonetic defaults to null.
interface DefinitionOverride {
  phonetic?: string | null;
  meanings: DefinitionMeaning[];
}
interface DefinitionOverrides {
  [wordOrStem: string]: DefinitionOverride;
}
const DEFINITION_OVERRIDES_PATH = resolve(ROOT, "data/raw/definition-overrides.json");

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

// Atomic JSON write: writes to `${path}.tmp` then renames. `rename(2)` is
// atomic on same-fs POSIX (macOS/Linux), so a half-written file never shows
// up to downstream readers — important because Astro dev HMR watches these
// paths and otherwise can pick up a partial parse during `pnpm seed`.
// See plan insight D-7.
function writeJson(path: string, data: unknown): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, path);
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

async function fetchDefinitionFromApi(word: string): Promise<WordDefinition | null> {
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

// Candidate base forms to try when the Kindle-stored stem doesn't resolve.
// The Kindle's built-in stemmer quietly fails on many derivational suffixes
// (docility → docility, ephemerality → ephemerality, penumbral → penumbral),
// which leaves dictionaryapi.dev returning 404 for forms it simply doesn't
// index. Each transform below is a best-effort reverse-derivation toward a
// common dictionary headword. Order matters — longer suffixes first so
// "ingly" beats "ly". Preserves the original case for proper nouns that
// happen to survive the list.
function definitionCandidates(word: string): string[] {
  const out: string[] = [word];
  const lower = word.toLowerCase();
  if (lower !== word) out.push(lower);

  const rules: Array<[RegExp, string]> = [
    [/ingly$/, "ing"],        // disconcertingly → disconcerting
    [/edly$/, "ed"],          // reportedly → reported
    [/ly$/, ""],               // quickly → quick
    [/ness$/, ""],             // lonesomeness → lonesome
    [/ism$/, ""],              // monasticism → monastic (then → monastery? keep simple)
    [/ality$/, "al"],          // ephemerality → ephemeral
    [/acity$/, "acious"],      // tenacity → tenacious
    [/ocity$/, "ocious"],      // precocity → precocious
    [/icity$/, "ic"],          // ethnicity → ethnic
    [/ity$/, "e"],             // docility → docile
    [/ence$/, "ent"],          // putrescence → putrescent
    [/ance$/, "ant"],          // radiance → radiant
    [/al$/, "a"],              // penumbral → penumbra
    [/ic$/, ""],               // historic → histor- (weak, tried last)
  ];
  for (const [re, replacement] of rules) {
    if (re.test(lower)) {
      const base = lower.replace(re, replacement);
      if (base && base !== lower && !out.includes(base)) out.push(base);
    }
  }
  return out;
}

async function fetchDefinition(word: string): Promise<WordDefinition | null> {
  const candidates = definitionCandidates(word);
  for (let i = 0; i < candidates.length; i++) {
    const attempt = candidates[i];
    const def = await fetchDefinitionFromApi(attempt);
    if (def) return def;
    // Be polite between fallback attempts too.
    if (i < candidates.length - 1) await sleep(300);
  }
  return null;
}

async function enrichDefinitions(words: Word[]): Promise<DefinitionCache> {
  const cache: DefinitionCache = REFRESH_DEFINITIONS
    ? {}
    : readJson<DefinitionCache>(DEFINITIONS_PATH, {});
  const overrides = readDefinitionOverrides();

  // Manual overrides take priority over a cached null — so a user who
  // writes a definition for "Dorchester" today sees it applied on the
  // next seed without needing --refresh-definitions.
  let overridesApplied = 0;
  for (const word of words) {
    const manual = overrideFor(word, overrides);
    if (!manual) continue;
    const existing = cache[word.id];
    const shouldReplace = existing === null || existing === undefined;
    if (shouldReplace) {
      cache[word.id] = manual;
      overridesApplied++;
    }
  }
  if (overridesApplied > 0) {
    console.log(`  ✎ applied ${overridesApplied} manual definition override(s)`);
    writeJson(DEFINITIONS_PATH, cache);
  }

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

// Build a clean search query by stripping library-suffix parens and other
// sideloaded noise. "The Loneliness of Sonia (Kiran Desai) (z-library.sk)"
// → "The Loneliness of Sonia". Preserves legitimate parens (volumes etc.)
// by bailing when contents look numeric.
function searchableTitle(raw: string): string {
  return raw
    .replace(/\s*\(([^)]*)\)\s*/g, (m, inner) => {
      if (/^[ivxlcdm\d\s.,:-]+$/i.test(inner)) return ` (${inner}) `;
      return " ";
    })
    .replace(/,\s*(z-library|1lib|bookslib|libgen|epub|retail|kindle edition)[^,]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Google Books API — free, no key. Used as a second-chance lookup when Open
// Library misses; indexes a superset of recent titles + most sideloaded books.
// Returns a cover URL or null. Retries on 503 (backendFailed) with exponential
// backoff — Google's books backend is intermittently slow.
async function resolveGoogleBooksCover(
  title: string,
  authors: string,
): Promise<string | null> {
  const cleanTitle = searchableTitle(title);
  const firstAuthor = authors.includes(",")
    ? authors.split(",").reverse().map((s) => s.trim()).join(" ")
    : authors;
  // No quoted phrase — Google's phrase matching is too strict for
  // long compound titles with subtitles. Bare `intitle:` keywords OR
  // the author give good recall.
  const qParts = [`intitle:${cleanTitle}`];
  if (firstAuthor) qParts.push(`inauthor:${firstAuthor}`);
  const q = encodeURIComponent(qParts.join(" "));
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&printType=books`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 503 && attempt < 2) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const data = (await res.json()) as {
        items?: Array<{
          volumeInfo?: {
            imageLinks?: { thumbnail?: string; smallThumbnail?: string };
          };
        }>;
      };
      for (const item of data.items ?? []) {
        const links = item.volumeInfo?.imageLinks;
        const raw = links?.thumbnail ?? links?.smallThumbnail;
        if (!raw) continue;
        // Upgrade: https, zoom=2 (≈256px wide), strip curl-edge flourish.
        return raw
          .replace(/^http:/, "https:")
          .replace(/&edge=curl/g, "")
          .replace(/zoom=\d+/, "zoom=2");
      }
      return null;
    } catch {
      if (attempt < 2) await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

async function downloadCoverFromUrl(url: string, destPath: string): Promise<boolean> {
  try {
    // Many CDNs (notably Amazon's m.media-amazon.com and Google's gstatic)
    // block requests without a browser-shaped User-Agent. A minimal UA
    // string satisfies their filter without pretending to be a real
    // browser session.
    const res = await fetch(url, {
      headers: { "User-Agent": "LiteraryGarden/0.1 (personal, non-commercial)" },
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1500) return false;
    // Re-encode through sharp as JPEG. Third-party CDNs serve arbitrary
    // formats (WebP, PNG, AVIF) regardless of the URL's apparent extension.
    // Always writing a true JPEG ensures file bytes match the .jpg suffix
    // so strict content-type checks and image-format sniffers agree.
    const jpeg = await sharp(buf).jpeg({ quality: 86 }).toBuffer();
    writeFileSync(destPath, jpeg);
    return true;
  } catch {
    return false;
  }
}

// Load the user's manual cover-URL overrides. Safe on missing/malformed
// file — returns an empty map.
function readCoverOverrides(): CoverOverrides {
  if (!existsSync(COVER_OVERRIDES_PATH)) return {};
  try {
    const parsed = JSON.parse(readFileSync(COVER_OVERRIDES_PATH, "utf-8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CoverOverrides;
    }
    return {};
  } catch {
    return {};
  }
}

// Load the user's manual definition overrides. Keys are matched
// case-insensitively against both the raw word and its stem, so the user
// can write "Dorchester" or "dorchester" and either hits.
function readDefinitionOverrides(): DefinitionOverrides {
  if (!existsSync(DEFINITION_OVERRIDES_PATH)) return {};
  try {
    const parsed = JSON.parse(readFileSync(DEFINITION_OVERRIDES_PATH, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const normalised: DefinitionOverrides = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (!val || typeof val !== "object" || !Array.isArray((val as any).meanings)) continue;
      normalised[key.toLowerCase()] = val as DefinitionOverride;
    }
    return normalised;
  } catch {
    return {};
  }
}

function overrideFor(
  word: Word,
  overrides: DefinitionOverrides,
): WordDefinition | null {
  const hit =
    overrides[word.word.toLowerCase()] ??
    overrides[(word.stem ?? "").toLowerCase()] ??
    null;
  if (!hit) return null;
  return {
    phonetic: hit.phonetic ?? null,
    meanings: hit.meanings,
    fetchedAt: new Date().toISOString(),
  };
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

// Pulls a chromatic spine colour from a cover JPG. Sharp's built-in
// `stats().dominant` tends to latch onto paper-white margins or near-black
// ink on covers with heavy borders (we saw 5/17 covers return #f8f8f8 /
// #382818 / etc. — all monochrome). Instead:
//   1. Resize to 32×32 (1024 pixels — fast, denoised).
//   2. Per pixel, compute (L, S). Skip near-white, near-black, near-grey.
//   3. Quantise remaining chromatic pixels into coarse RGB buckets (÷32).
//   4. Return the most-populated bucket's centroid.
// Falls back to sharp's plain dominant only if no chromatic pixel survives.
// Returns "#rrggbb" or null on failure.
async function extractDominantColor(path: string): Promise<string | null> {
  try {
    const img = sharp(path).resize(32, 32, { fit: "cover" });
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    type Bucket = { r: number; g: number; b: number; n: number };
    const buckets = new Map<string, Bucket>();

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Perceptual luminance (Rec. 709). Skip extremes.
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (L > 0.88 || L < 0.1) continue;
      // Saturation = (max-min)/max. Skip near-greys.
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx === 0) continue;
      const S = (mx - mn) / mx;
      if (S < 0.18) continue;
      // Coarse quantise to 8 bins per channel → 512 possible buckets.
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.r += r; existing.g += g; existing.b += b; existing.n += 1;
      } else {
        buckets.set(key, { r, g, b, n: 1 });
      }
    }

    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

    if (buckets.size === 0) {
      // No chromatic pixels — fall back to sharp's plain dominant.
      const { dominant } = await sharp(path).resize(32, 32, { fit: "cover" }).stats();
      if (!dominant) return null;
      return `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`;
    }

    // Pick the heaviest bucket; centroid gives a smoother colour than
    // the modal raw pixel.
    let winner: Bucket | null = null;
    for (const b of buckets.values()) {
      if (!winner || b.n > winner.n) winner = b;
    }
    if (!winner) return null;
    const cr = winner.r / winner.n;
    const cg = winner.g / winner.n;
    const cb = winner.b / winner.n;
    return `#${toHex(cr)}${toHex(cg)}${toHex(cb)}`;
  } catch {
    return null;
  }
}

async function enrichCovers(books: Book[]): Promise<CoverManifest> {
  mkdirSync(COVER_DIR, { recursive: true });

  const manifest: CoverManifest = REFRESH_COVERS
    ? {}
    : readJson<CoverManifest>(COVER_MANIFEST_PATH, {});

  if (SKIP_NETWORK) {
    console.log(`  ↷ skipping cover fetch (--offline) · ${Object.keys(manifest).length} cached`);
    // Still set coverUrl + spineColor from existing manifest entries.
    for (const book of books) {
      const entry = manifest[book.id];
      if (!entry || entry.source === "placeholder") {
        book.coverUrl = null;
        book.spineColor = null;
      } else {
        book.coverUrl = `/covers/${book.id}.jpg`;
        book.spineColor = entry.spineColor ?? null;
      }
    }
    return manifest;
  }

  // Retry placeholders each run so newly-indexed books pick up a cover.
  // Keeps successful covers (openlibrary/googlebooks/manual) untouched.
  for (const [k, v] of Object.entries(manifest)) {
    if (v.source === "placeholder") delete manifest[k];
  }

  // Manual-override list — applied ahead of OL + GB. Any override for a
  // bookId that already has a manifest entry also wins (so the user can
  // swap a so-so OL cover for a preferred one by editing the overrides
  // file and removing the manifest entry, or deleting the JPG).
  const overrides = readCoverOverrides();

  const toProcess = books.filter(
    (b) => !(b.id in manifest) || (b.id in overrides && manifest[b.id]?.source !== "manual"),
  );
  if (toProcess.length === 0) {
    console.log(`  ✓ covers already cached for all ${books.length} books`);
  } else {
    const manualCount = toProcess.filter((b) => b.id in overrides).length;
    console.log(
      `  → resolving ${toProcess.length} book covers` +
        (manualCount ? ` (${manualCount} from manual overrides)` : ""),
    );
  }

  for (const book of toProcess) {
    const destJpg = resolve(COVER_DIR, `${book.id}.jpg`);

    // Layer 0: manual override — highest priority.
    let resolvedSource: "openlibrary" | "googlebooks" | "manual" | null = null;
    let olIdMatched: number | null = null;
    const overrideUrl = overrides[book.id];
    if (overrideUrl) {
      const ok = await downloadCoverFromUrl(overrideUrl, destJpg);
      if (ok) resolvedSource = "manual";
    }

    // Layer 1: Open Library.
    if (!resolvedSource) {
      const coverId = await resolveOpenLibraryCover(book.title, book.authors);
      if (coverId) {
        const ok = await downloadCover(coverId, destJpg);
        if (ok) {
          resolvedSource = "openlibrary";
          olIdMatched = coverId;
        }
      }
    }

    // Layer 2: Google Books (fallback).
    if (!resolvedSource) {
      const gbUrl = await resolveGoogleBooksCover(book.title, book.authors);
      if (gbUrl) {
        const ok = await downloadCoverFromUrl(gbUrl, destJpg);
        if (ok) resolvedSource = "googlebooks";
      }
    }

    if (resolvedSource) {
      const spineColor = await extractDominantColor(destJpg);
      manifest[book.id] = {
        source: resolvedSource,
        olCoverId: olIdMatched ?? undefined,
        spineColor: spineColor ?? undefined,
        fetchedAt: new Date().toISOString(),
      };
      const tag =
        resolvedSource === "googlebooks" ? "[gb]"
        : resolvedSource === "manual" ? "[manual]"
        : "[ol]";
      console.log(`     ✓ ${tag} ${book.title.slice(0, 40)}  ${spineColor ?? ""}`);
    } else {
      manifest[book.id] = {
        source: "placeholder",
        fetchedAt: new Date().toISOString(),
      };
      console.log(`     ○ ${book.title.slice(0, 40)} (no match on OL or Google Books)`);
    }
    await sleep(1000); // polite to both APIs
  }

  // Back-fill spineColor for covers downloaded before this enrichment landed
  // (old manifest entries with source "openlibrary" but no spineColor).
  let backfilled = 0;
  for (const [bookId, entry] of Object.entries(manifest)) {
    if (entry.source !== "openlibrary" || entry.spineColor) continue;
    const jpg = resolve(COVER_DIR, `${bookId}.jpg`);
    if (!existsSync(jpg)) continue;
    const c = await extractDominantColor(jpg);
    if (c) {
      entry.spineColor = c;
      backfilled++;
    }
  }
  if (backfilled > 0) console.log(`  ✓ back-filled spine colours for ${backfilled} existing covers`);
  writeJson(COVER_MANIFEST_PATH, manifest);

  // Set book.coverUrl + book.spineColor from the manifest.
  for (const book of books) {
    const entry = manifest[book.id];
    if (!entry || entry.source === "placeholder") {
      book.coverUrl = null;
      book.spineColor = null;
    } else {
      book.coverUrl = `/covers/${book.id}.jpg`;
      book.spineColor = entry.spineColor ?? null;
    }
  }
  const olCount = Object.values(manifest).filter((e) => e.source === "openlibrary").length;
  const gbCount = Object.values(manifest).filter((e) => e.source === "googlebooks").length;
  const manualCount = Object.values(manifest).filter((e) => e.source === "manual").length;
  const real = olCount + gbCount + manualCount;
  console.log(
    `  ✓ covers: ${real}/${books.length} real ` +
    `(${olCount} open library, ${gbCount} google books, ${manualCount} manual), ` +
    `${books.length - real} placeholders`,
  );
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

  // Empty-table guard — catches the "I copied vocab.db but had no Kindle
  // dictionary lookups" case so the user sees a helpful message instead of
  // an empty garden with no explanation.
  const wordCount = (db.prepare("SELECT COUNT(*) AS n FROM WORDS").get() as { n: number }).n;
  if (wordCount < 1) {
    console.error("✖ Seeded 0 words — vocab.db has no WORDS rows.");
    console.error("  Is Kindle dictionary lookup enabled? (Settings → Language & Dictionary)");
    console.error("  You need at least one word looked up on-device for the garden to grow.");
    db.close();
    process.exit(1);
  }

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
        spineColor: null,
        // Reset on every seed so removing My Clippings.txt clears stale counts.
        // Overwritten below if the clippings parse returns enrichments for this book.
        firstHighlightAt: null,
        mostRecentHighlightAt: null,
        highlightCount: 0,
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

  // ---------- Parse My Clippings.txt (optional) ----------
  let quotes: Quote[] = [];
  if (existsSync(CLIPPINGS_PATH)) {
    console.log("✧ Parsing My Clippings.txt…");
    const raw = readFileSync(CLIPPINGS_PATH, "utf8");
    const parsed = parseClippings(raw, books);
    quotes = parsed.quotes;

    // Merge synthesized books (present in clippings but not in vocab.db).
    const bookIds = new Set(books.map((b) => b.id));
    for (const sb of parsed.synthesizedBooks) {
      if (!bookIds.has(sb.id)) {
        books.push(sb);
        bookIds.add(sb.id);
        console.log(`  → new book (clippings only): ${sb.title.slice(0, 50)}`);
      }
    }

    // Apply per-book highlight enrichments onto the full books list.
    for (const [bookId, enrichment] of parsed.bookEnrichments) {
      const book = books.find((b) => b.id === bookId);
      if (!book) continue;
      book.firstHighlightAt = enrichment.firstHighlightAt;
      book.mostRecentHighlightAt = enrichment.mostRecentHighlightAt;
      book.highlightCount = enrichment.highlightCount;
    }

    // Re-sort books now that synthesized entries may have joined.
    books.sort((a, b) => a.title.localeCompare(b.title));

    console.log(`  ✓ parsed ${quotes.length} quotes across ${parsed.bookEnrichments.size} book(s)\n`);
  } else {
    console.log(`↷ no My Clippings.txt at data/raw/ — skipping quotes\n`);
  }

  console.log("📖 Enriching definitions…");
  await enrichDefinitions(words);

  console.log("\n🌸 Enriching book covers…");
  await enrichCovers(books);

  writeJson(resolve(OUT_DIR, "words.json"), words);
  writeJson(resolve(OUT_DIR, "books.json"), books);
  writeJson(QUOTES_PATH, quotes);

  // Touch the content config. Astro's file-loader collections have a
  // known HMR race with atomic renames — the watcher sees a brief
  // "file not found" during rename(tmp, final) and may leave the dev
  // server holding an empty collection until restart. Touching the
  // config's mtime forces Astro to re-evaluate the entire content
  // graph, which reliably picks up the new JSON. Cheap, durable.
  try {
    const configPath = resolve(ROOT, "src/content.config.ts");
    const now = new Date();
    utimesSync(configPath, now, now);
  } catch {
    // Best-effort only — if the config is missing or unwritable we
    // just skip the nudge; seeds still succeed and build still works.
  }

  console.log(`\n✨ Garden seeded.`);
}

main().catch((err) => {
  console.error("✖ Import failed:", err);
  process.exit(1);
});
