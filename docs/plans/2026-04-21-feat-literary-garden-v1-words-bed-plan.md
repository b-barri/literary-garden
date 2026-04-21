---
title: "Literary Garden v1 — Words Bed with State-as-Aesthetic"
type: feat
status: active
date: 2026-04-21
origin: docs/brainstorms/2026-04-21-literary-garden-brainstorm.md
---

# Literary Garden v1 — Words Bed with State-as-Aesthetic

## Overview

Build a static-site "words bed" of the literary garden: a botanically-illustrated, spaced-repetition vocabulary practice surface generated from the user's real Kindle Vocabulary Builder database (`vocab.db`). Each word the user looked up on their Kindle becomes a card that visually reflects its learning state — 🌱 seedling (new) → 🌸 in bloom (learning) → 🏵️ pressed (mature) — where decoration *is* the mastery readout, not a veneer on top.

The garden is the user's digitized intellectual orbit. v1 plants its first bed: inward daily practice. The outward-facing "quotes bed" is deferred to its own brainstorm-plan cycle after this ships (see brainstorm: `docs/brainstorms/2026-04-21-literary-garden-brainstorm.md`, Resolved Questions → "First seed").

## Problem Statement

The user's Kindle Vocabulary Builder has 166 words from 22 books (measured: `vocab.db`, 2026-04-21) — 166 tiny acts of curiosity that currently live inside a closed device. Amazon's on-device UI treats them as a flat, searchable list. There is no spaced repetition, no visual progression of mastery, no sense of the orbit they describe. The data is rich (each word carries the sentence it was encountered in and the book it came from), but its presentation is utilitarian and forgettable.

The user wants:
- A **daily habit** of learning 5 new words with their meaning and usage.
- A **beautiful** presentation of that practice — not a flashcard app with flowers painted on it, but a botanical garden whose visual state *is* the learning state.
- A **private** practice surface that doesn't leak their reading history to the internet.

## Proposed Solution

A local-first Astro v5 static site generated from `vocab.db`, with Svelte 5 islands for the interactive flashcard UI. Progress is persisted in `localStorage` using the `ts-fsrs` scheduler. The three-state botanical progression is wired directly to FSRS state + stability thresholds, so card appearance is a pure derivation of scheduler state.

The user drops `vocab.db` into `data/raw/`, runs `pnpm import`, and `pnpm dev` opens the garden. No server. No account. Not public.

## Technical Approach

### Architecture

```
┌─────────────────────────┐
│   data/raw/vocab.db     │  user-provided Kindle file (gitignored)
└───────────┬─────────────┘
            │ build-time (pnpm import)
            ▼
┌─────────────────────────────────────────┐
│  scripts/import.ts                      │
│   1. Read vocab.db (better-sqlite3 RO)  │
│   2. Join WORDS × LOOKUPS × BOOK_INFO   │
│   3. Canonicalize words (one per lang:word), aggregate lookups
│   4. Enrich books with covers (OL → GB) │
│   5. Fetch dictionary definitions       │
│   6. Write data/processed/{words,books}.json │
└──────────────┬──────────────────────────┘
               │ read at build time
               ▼
┌─────────────────────────────────────────┐
│  Astro v5 content collections           │
│   - `words` collection (Zod-typed)      │
│   - `books` collection (Zod-typed)      │
│   - pages: / , /album , /about          │
└──────────────┬──────────────────────────┘
               │ pre-rendered HTML + Svelte 5 islands
               ▼
┌─────────────────────────────────────────┐
│  Browser                                │
│   - <WordCard client:visible/>          │
│   - localStorage: fsrs-state-v1 (JSON)  │
│   - ts-fsrs scheduler in-memory         │
└─────────────────────────────────────────┘
```

**Data flow principle:** Everything that can be pre-computed at build time *is* — covers, definitions, card metadata. The client only computes scheduler transitions and renders the already-enriched data. This keeps bundles small and the aesthetic crisp (images are pre-optimized by Astro's `<Image>`).

### Canonical IDs (resolves SpecFlow §2)

- **Word card ID:** `{lang}:{word}` — one card per word regardless of how many books it was looked up in. Matches vocab.db's `WORDS.id`.
- **Book ID:** `BOOK_INFO.asin` when present, else a sha1 hash of normalized `title|authors`. Stable across re-imports.
- **Card back content:** all `LOOKUPS.usage` entries for that word, sorted by timestamp descending, tagged with book. "First seen in…" / "Also seen in…". Multiple sentences are a feature — they reveal the word's range.
- **Book cover shown on front:** the *most recent* lookup's book (the user's most recent memory of the word in context).
- **FSRS state key:** same `{lang}:{word}`. LocalStorage shape: `{ "en:notoriety": { stability, difficulty, elapsed_days, scheduled_days, due, reps, lapses, state, last_review } }`.

### FSRS → Visual State Mapping (resolves SpecFlow §5, brainstorm: Key Decisions → State-as-aesthetic)

| Visual State | FSRS Condition | In active deck? |
|---|---|---|
| 🌱 **Seedling** | `state === New` (never reviewed) | Yes (as new card) |
| 🌸 **In bloom** | `state ∈ {Learning, Relearning}` OR (`state === Review` AND `stability < 21` days) | Yes (as review) |
| 🏵️ **Pressed** | `state === Review` AND `stability ≥ 21` days | No (archived) |

- **Stability-based, not interval-based:** stability is the underlying memory strength; interval fluctuates with retention target. 21 days matches Anki's long-standing "mature" threshold.
- **Transitions are computed on rating events, not view.** A card's state is persisted when the user rates it; the card element reads state at mount and does not recompute on scroll.
- **Demotion:** rating "didn't know" on a bloom or pressed card can drop stability and the card returns to bloom. Pressed → Bloom demotion is allowed; Bloom → Seedling is not (seedling is strictly "never reviewed").
- **Rating map** (passive recall, 3 buttons): "didn't know" → `Rating.Again` (1), "blurry / had to think" → `Rating.Hard` (2), "knew it instantly" → `Rating.Good` (3). `Easy` is not exposed — it conflicts with passive recall's lack of a graded-ease signal.

### Implementation Phases

#### Phase 1 — Foundation (weekend 1) ✅ **Complete 2026-04-21**

Goal: the project exists, the palette exists, the importer reads vocab.db end-to-end, and a plain unstyled list of words renders.

Shipped in this phase:
- Astro 6.1.8 scaffold (plan said v5; v6 is current; same content-collections API).
- Svelte 5.55.4 integration installed (no islands rendered yet; arrives in Phase 2).
- Tailwind v4 via `@tailwindcss/vite` with full botanical palette in OKLCH.
- better-sqlite3 importer reads real `vocab.db` → 166 words, 22 books, 173 lookups.
- Astro content collections (`words`, `books`) typed via `astro/zod` (note: `z` re-export from `astro:content` is deprecated in Astro 6).
- Privacy baseline: `data/raw/` + `data/processed/` both gitignored; `noindex, nofollow` meta on the base layout.
- Garden renders at `/` as a styled list — alphabetical, with word, stem, most-recent sentence, and book attribution. Exceeded "unstyled" exit criterion because the palette + layout made a bare list already beautiful.

Gotchas captured to surface in `docs/solutions/` (Phase 4):
- `pnpm import` is a built-in pnpm subcommand; naming an npm script `import` makes `pnpm import` delete `pnpm-lock.yaml`. Renamed the script to `seed` and updated the README.
- `.astro` cache needed clearing after adding a new collection; otherwise the dev server reports `The collection "words" does not exist or is empty` despite valid config.
- Sideloaded Kindle books have the author duplicated in the title (e.g., "The Anthropologists (Aysegül Savas)") and often a "(Z-Library)" suffix. Phase 1 strips the suffix; Phase 3 will also strip the author parens.

- Initialize repo: `git init`, `.gitignore` (data/raw/, .DS_Store, node_modules, dist, .astro).
- Scaffold Astro v5 with pnpm, Svelte 5 integration, Tailwind v4 integration (`npx astro add svelte tailwind`).
- Define the Tailwind v4 theme in `src/styles/global.css` (CSS-first config):
  ```css
  @import "tailwindcss";
  @theme {
    --color-sage-50:  oklch(0.97 0.02 140);
    --color-sage-300: oklch(0.82 0.06 145);
    --color-sage-500: oklch(0.62 0.08 145);
    --color-sage-900: oklch(0.28 0.04 145);
    --color-rose-300: oklch(0.85 0.06 20);
    --color-rose-500: oklch(0.68 0.12 20);
    --color-cream:    oklch(0.97 0.02 85);
    --color-sepia:    oklch(0.72 0.08 70);
    --color-ink:      oklch(0.22 0.02 250);
    --font-display:   "Lora", "Garamond", serif;
    --font-body:      "Inter", system-ui, sans-serif;
  }
  ```
- Use Astro's `experimental.fonts` (now stable in 5.x) to self-host Lora + Inter.
- Write `scripts/import.ts` — minimum viable:
  - Open `data/raw/vocab.db` readonly with `better-sqlite3`.
  - `INNER JOIN` LOOKUPS × WORDS × BOOK_INFO (INNER handles orphaned LOOKUPS from deleted words — SpecFlow §1).
  - Group by `WORDS.id`, aggregate lookups into an array on each word.
  - Write raw (unenriched) `data/processed/words.json` and `books.json`.
- Define Astro content collections reading those JSON files via the `file()` loader with Zod schemas.
- Render `src/pages/index.astro` as an unstyled `<ul>` of words to validate data flow.
- **Exit criteria:** `pnpm dev` lists all 166 words with their sentences and source book titles.

#### Phase 2 — Card UI + Scheduler (weekend 2)

Goal: the card exists in all three botanical states, flips, accepts ratings, and persists FSRS state.

- Install `ts-fsrs`. Build `src/lib/scheduler.ts`: tiny wrapper around `fsrs()` exposing `nextState(card, rating)` and `mastery(card): 'seedling' | 'bloom' | 'pressed'`.
- Build `src/lib/progress.ts`: localStorage reader/writer keyed by `{lang}:{word}`, with a schema version (`v1`) and a hand-written migration stub for future versions.
- Build `src/components/WordCard.svelte`:
  - Front: word (large, `--font-display`), book cover art, mastery glyph.
  - Back: aggregated usage sentences with book attributions, meaning + example (from Phase 3 enrichment; placeholder in Phase 2).
  - Flip on click/tap/Space. Rating buttons (1 / 2 / 3 → Again / Hard / Good). Keyboard: `Space` flip, `1`/`2`/`3` rate, `N` next.
  - `lang` attribute on the word element for screen readers and font rendering (SpecFlow §10).
- Build `src/components/PressedBadge.svelte` and analogous Seedling/Bloom decorations. v1 visual treatment:
  - **Seedling:** ink-outline only, pale cream background, 60% opacity illustration, small sprout SVG in corner.
  - **In bloom:** full-color illustration, cream background, sage stroke accents, bud glyph in corner.
  - **Pressed:** desaturated + slight sepia wash on the illustration, parchment texture background, gold hairline border, pressed-flower glyph in corner.
  - Use **one botanical illustration per word assigned round-robin** from a small library (5–7 flower SVGs in `src/assets/illustrations/`); state treatment is pure CSS (filters, backgrounds, overlays). Upgrade path: per-state illustrations in a later phase.
- Build `src/pages/index.astro` as the daily practice surface (wires cards to scheduler in Phase 3).
- **Exit criteria:** a single card can be flipped, rated, and its state survives page reload; visual treatment differs clearly across the three states.

#### Phase 3 — Daily Practice Flow + Enrichment (weekend 3)

Goal: the daily ritual works end-to-end. Covers and definitions are present.

**Daily selection logic** (resolves SpecFlow §4):
- **Today anchor:** `Intl.DateTimeFormat().resolvedOptions().timeZone` for the user's local midnight boundary. Stored alongside `lastSessionDate`.
- **Deterministic daily draw:** seed a tiny PRNG (e.g. mulberry32) with `YYYY-MM-DD` so a refresh does not re-shuffle the five new cards.
- **Queue order:** due reviews (oldest `due` first) → 5 new seedlings. Reviews capped at `2 × newCardsPerDay = 10` per day; overflow is carried over (FSRS handles overdue via `elapsed_days`).
- **Underflow (< 5 seedlings remaining):** show whatever seedlings exist, then surface extra reviews to honor the daily commitment. When zero seedlings remain, the session is reviews-only.
- **Zero-due + zero-seedling end state:** the "garden rests" screen — a calm page with the week's pressed flowers, no practice button. Reappears next day when something is due.
- **Session complete signal:** after all queued cards are rated, show "today's garden is tended" with the count of pressings this session and a next-due date.

**Meaning source** (resolves SpecFlow §3):
- **Provider:** Free Dictionary API (`https://api.dictionaryapi.dev/api/v2/entries/en/{word}`), Wiktionary-licensed, no key required. Fallback: surface sentence + POS (`LOOKUPS.pos` when available) with no definition.
- **When:** at import time. Definitions cached in `data/processed/definitions.json` keyed by `{lang}:{word}` with a `fetchedAt` timestamp. Re-imports reuse cached entries; only new words trigger fetches. TTL = infinite for v1 (dictionary definitions don't meaningfully change).
- **What's surfaced on the card back:**
  - Meaning (first sense of the first POS).
  - A canonical example from the API *only when* the user's own `LOOKUPS.usage` is < 30 characters (the "Ingenue, whatever." case — real data from the user's db).
  - POS tag (sage pill).
  - One "did you know" tidbit — etymology or related form — if present.
- **Multi-sense policy:** show first sense by default, with a "more senses…" disclosure. Avoid overwhelming the card's aesthetic.
- **Rate-limit:** 5 req/sec, random sleep 200–400 ms between calls.

**Book cover enrichment** (resolves SpecFlow §8):
- **Lookup key hierarchy:** ASIN → Google Books (`/volumes?q=isbn:` also accepts ASIN via `id:`) → Open Library (if the book has an ISBN). Sideloaded books (e.g., `authors = "bhavya"`, no real ASIN) skip straight to the **fallback botanical placeholder**: a procedurally-tinted card-sized SVG showing a generic book with a pressed leaf.
- **Open Library usage:** `https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg?default=false` — `?default=false` returns 404 on missing rather than the gray placeholder (SpecFlow §8).
- **Caching:** `data/processed/covers/{bookId}.{ext}` + `data/processed/covers/manifest.json`. Re-imports read the manifest and skip cached covers unless `--refresh-covers` is passed.
- **Throttle:** ≤ 1 req/sec to stay well under Open Library's 100/5min guidance. Concurrency = 1 (simplicity > speed for 22 books).
- **Amazon is explicitly skipped** (ToS restriction for scraping cover images).

**Pressed flower album** (resolves SpecFlow §6):
- `src/pages/album.astro` — the pressed words, sorted by most-recent pressing (date stability crossed 21 days). Grouped by book.
- Read-only in v1. No un-press, no re-rate from the album. A "wander" button reshuffles the view.
- Empty state: an illustrated seed packet labeled "your first pressings will appear here."
- "Occasional resurfacing": **deferred to a v1.1 polish pass** — the brainstorm said "occasionally resurfaced for reinforcement," which is valuable but not blocking. Noted as Open Question for v1.1.

**Exit criteria:**
- Daily session loads 5 new + due reviews, capped at 10 reviews.
- Definitions appear on the card back for ≥ 90% of the 166 words (some proper nouns won't resolve).
- 22 books have either a real cover or a styled botanical placeholder — never a broken image.
- Pressed words appear in /album once they graduate.

#### Phase 4 — Polish (weekend 4)

- **Accessibility:** audit contrast for sage/rose across all three states using OKLCH math (`oklch(L% C H)` lets us check for `L` contrast ratios). Keyboard shortcuts documented on an `/about` page. ARIA labels for state glyphs ("🌸 in bloom — learning this word"). `prefers-reduced-motion` swaps the flip animation for a crossfade.
- **Onboarding (resolves SpecFlow §5):** if localStorage is empty and words exist, show a one-screen intro: "Welcome to your garden. You have N seedlings waiting." Set `onboardingSeenAt` in localStorage.
- **LocalStorage schema version & migration stub:** document the v1 shape; add a `migrate(fromVersion, toVersion)` function skeleton so v2 changes don't silently corrupt data.
- **Dev tooling:** `pnpm import` (imports data), `pnpm import:refresh-covers` (force cover refresh), `pnpm dev`, `pnpm build`, `pnpm preview`.
- **README.md** with setup, data-privacy note, the "local-only" statement in bold.
- **docs/solutions/**: a first entry capturing real gotchas encountered (Kindle BOM, orphaned LOOKUPS, sideloaded books).

**Exit criteria for v1:** the user can, on a fresh clone of the repo, `pnpm install && pnpm import && pnpm dev`, and immediately enter their daily practice with their 166 seedlings.

## Alternative Approaches Considered

### Eleventy instead of Astro
Simpler, pure static. Rejected: content collections + Zod schemas + image optimization + island components together are far more ergonomic in Astro v5. Eleventy would require hand-rolling most of that.

### React 19 instead of Svelte 5 as islands
Rejected on bundle size (≈45 KB vs ≈2–4 KB per island) and ergonomics (runes vs. hooks-of-hooks). Aesthetic is load-bearing; smaller islands = faster paint = less jank over beautifully-typed cards.

### Full web app with Supabase backend
The "Approach B" from the brainstorm. Rejected in the brainstorm and reaffirmed here: spending weekend-effort on auth + sync + deploy is weekend-effort not spent on the palette and illustrations — the things that make or break the "literary garden" feel. Local-first buys us that time.

### Fetch definitions at runtime from the client
Rejected: leaks the user's word list to a third-party API on every card view, makes offline use impossible, and adds latency to a moment that should feel unhurried (the card back should appear *now*, not after a network round-trip).

### Commit vocab.db to the repo
Rejected: even for a single-user repo, this embeds personal reading history into the git log permanently. Gitignore instead; provide fixtures for tests.

## System-Wide Impact

### Interaction Graph

```
User rates a card "knew it"
  → WordCard.onRate('good')
    → scheduler.nextState(currentCard, Rating.Good)   [ts-fsrs.next()]
    → progress.save('en:notoriety', nextState)         [localStorage]
    → deckStore.markCompleted(cardId)                  [Svelte store]
    → if deckStore.queue.isEmpty: navigate to completion screen
    → if pressing occurred (bloom→pressed): album prefetch invalidates
```

Two levels deep. Nothing touches the network on a rate event. All side effects are local.

### Error & Failure Propagation

- **Import script errors** (bad db, missing file, API failure) propagate as thrown exceptions, caught at the top of `import.ts`, exit code 1 with a colored error line. The Astro build does not mask these — if import failed, dev won't start.
- **Definition fetch failures** degrade silently: the card back renders with just the user's sentence + book attribution. Logged to `data/processed/import.log`.
- **Cover fetch failures** fall through ASIN → ISBN → placeholder deterministically. Never a broken `<img>`.
- **LocalStorage write failure** (quota, disabled, private mode) shows a persistent banner: "Progress can't be saved in this browser. Your ratings will be forgotten on refresh." Card still flips and shows definitions — reading works, just not practicing.
- **Clock skew / timezone changes** use `Date.now()` consistently and the browser's resolved timezone. A user crossing timezones mid-day may see "today's cards" shift — acceptable for v1; noted as edge.

### State Lifecycle Risks

- **Re-imports after progress exists:** FSRS state keys are `{lang}:{word}` — stable across imports. Progress for words still in vocab.db is preserved; progress for words the user deleted on-Kindle remains in localStorage as a **tombstone** (displayed nowhere). The `progress.prune()` helper can be called manually (a v1.1 thing) to reclaim the space; not urgent at 166 words.
- **Partial import failure** (cover enrichment fails mid-run) leaves `data/processed/` in a mixed state. Mitigation: write to `data/processed/.tmp/` and atomically rename on success.
- **LocalStorage corruption** (malformed JSON): detect on read, archive to `fsrs-state-v1.corrupt-{ts}`, initialize fresh. Surface a banner.
- **Export/restore is out of v1 scope**; cleared localStorage = progress lost. This is an acceptable local-first tradeoff for a single-device ritual. Documented in README.

### API Surface Parity

- Only one reader writes to localStorage: `src/lib/progress.ts`. All other code reads through it. No direct `localStorage.setItem` calls anywhere else.
- Only one consumer reads vocab.db: `scripts/import.ts`. Client code never touches SQLite.
- Only one place computes mastery: `scheduler.mastery(card)`. Card components and album page both call this — the derivation is never duplicated.

### Integration Test Scenarios

1. **Fresh import + rate one card "Good" + refresh browser** → card should be visible as "in bloom" after refresh; FSRS state round-trips localStorage.
2. **Import → rate card to pressed state → add new lookup for same word on Kindle → re-import** → pressed state preserved, new sentence appears on back.
3. **Import with no internet** → all cards render with sentences; definitions are missing but UI doesn't error; covers show botanical placeholders.
4. **LocalStorage disabled** → daily session still renders cards, user can flip and read; rating buttons show "progress can't save" banner instead of recording.
5. **All words pressed** → home page shows "garden rests" state; album shows all 166 words grouped by book.

## Acceptance Criteria

### Functional Requirements

- [ ] `pnpm import` reads `data/raw/vocab.db`, joins WORDS × LOOKUPS × BOOK_INFO, produces `data/processed/words.json` + `books.json` + `definitions.json` + covers directory.
- [ ] Every word from vocab.db appears as exactly one card (one per `{lang}:{word}`), with all its usage sentences aggregated on the back, sorted newest-first.
- [ ] The daily practice surface at `/` shows due reviews first, then 5 new seedlings, with a 10-review cap.
- [ ] Each card has three visual states (🌱 seedling, 🌸 in bloom, 🏵️ pressed) driven by FSRS state + stability threshold (21 days).
- [ ] Rating a card updates its FSRS state in localStorage and, on the next render, updates its visual state.
- [ ] Pressed cards appear in `/album`, sorted by most-recent pressing, grouped by book.
- [ ] Books without a resolvable cover show a styled botanical placeholder, never a broken image.
- [ ] Cards where `LOOKUPS.usage` is < 30 characters also display a canonical dictionary example on the back.
- [ ] Keyboard shortcuts: `Space` flips, `1`/`2`/`3` rate, `N` advances to next card.
- [ ] Session complete screen after queue is empty; "garden rests" screen when zero due + zero seedlings.
- [ ] `My Clippings.txt` is NOT processed in v1 (explicitly out of scope; deferred to the quotes-bed plan).

### Non-Functional Requirements

- [ ] Lighthouse a11y ≥ 95 on the home page; contrast passes WCAG AA for all three card states against their backgrounds.
- [ ] First-paint under 1s on a local preview build (site is static + pre-rendered).
- [ ] No third-party network calls at runtime. All data (definitions, covers) is bundled at build.
- [ ] No tracking, no analytics, no fonts from Google CDN (self-hosted via Astro fonts API).
- [ ] `prefers-reduced-motion`: card flip becomes a 200 ms crossfade; state transitions have no animation.
- [ ] Each word element carries a `lang="xx"` attribute for screen-reader pronunciation and font selection.
- [ ] LocalStorage schema has a top-level `version: 1` field and a migration path in `progress.ts`.

### Quality Gates

- [ ] Unit tests (Vitest) for: scheduler.mastery mapping, progress.save/load round-trip, the "Ingenue" short-sentence rule, the cover-lookup hierarchy, the daily deterministic draw.
- [ ] Integration test for import.ts against a checked-in fixture `tests/fixtures/vocab-sample.db` (not the user's real db).
- [ ] Visual regression check (Playwright + screenshots) of the three card states — one page per state.
- [ ] README with setup steps, data-privacy statement, and a "v1 is local-only" warning.
- [ ] docs/solutions/2026-XX-kindle-clippings-gotchas.md captures the real gotchas encountered during Phase 1 import (BOM, orphaned LOOKUPS, sideloaded titles).

## Success Metrics

- **Habit:** the user opens the garden on 5+ days in its first week of use.
- **Data health:** ≥ 90% of cards have a definition; 100% of books render some cover (real or placeholder).
- **Aesthetic confidence:** at the end of Phase 4, a screenshot of the three card states can stand next to a Kinfolk spread without feeling out of place. This is subjective — the user is the judge.
- **Progression:** within four weeks of daily use, at least 20 cards should graduate to "pressed" (rough sanity check on FSRS calibration).

## Dependencies & Prerequisites

- Node.js 20 LTS or newer (for `better-sqlite3` prebuilt binaries and `experimental.fonts`).
- pnpm 9+.
- `vocab.db` present at `data/raw/vocab.db` (the user's own; already available at `vocabulary/vocab.db` — move in Phase 1).
- Internet access during `pnpm import` (for first-time definition + cover fetches; all cached afterward).
- **No account, no key, no paid API.** Free Dictionary API, Google Books (public endpoint), Open Library Covers — all free and keyless.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dictionary API returns nothing for rare/proper words ("Ingenue") | High | Low | Card gracefully omits meaning; sentence + book attribution still render. |
| Kindle `vocab.db` schema changes in a future Kindle firmware | Low | Medium | Schema version is read from `VERSION` table; import logs a warning on unknown schema but continues best-effort. |
| Botanical illustrations not done in time | Medium | High (aesthetic is load-bearing) | Phase 2 uses a small library (5–7) of public-domain SVGs (e.g., from rawpixel.com or OpenClipart CC0) assigned by word hash. Custom illustrations are a Phase 4/v1.1 upgrade, not a blocker. |
| LocalStorage is fragile (clearing browser data = losing progress) | Medium | Medium | Document the tradeoff in README. v1.1 can add JSON export/import button. v2 can add optional IndexedDB + export. |
| User grows disillusioned with "Ingenue-like" thin sentences | Medium | Medium | The 30-char rule pads thin sentences with a dictionary example. Still not perfect; a v1.1 idea is showing a short snippet from the book (but that requires the book text, which we don't have). |
| Visual states are not distinctive enough in practice | Medium | High | Phase 2 exit criteria requires the states look "clearly different." Iterate in Phase 4 if they don't. |
| Fonts fail to self-host via `experimental.fonts` | Low | Low | Fallback to manual `<link>` tags with Fontsource packages. |
| Open Library rate-limit trip during a large import | Low (22 books) | Low | 1 req/sec throttle keeps us well under 100/5min. Retry with backoff on HTTP 429. |

## Resource Requirements

- **Time:** four weekends, one person (user). Phases 1–4 each scoped to fit a weekend.
- **Tools:** Node 20+, pnpm, VS Code (or similar), Figma optional for illustration exploration.
- **Services:** none paid. API calls are free-tier (and at 166 words / 22 books, well below any limit).
- **Infrastructure:** none. Site is static; v1 is local-only.

## Future Considerations

- **v1.1 polish pass:** occasional pressed-flower resurfacing (a "revisit" cadence that shows one pressed card every N days on the home page); JSON export/import button; custom per-state illustrations.
- **v2 — Quotes Bed:** its own brainstorm + plan cycle. Will add `My Clippings.txt` parsing, themed browsing, per-quote share links, monthly printable PDF. See brainstorm's "Open Questions" section.
- **v2.5 — Cross-device sync:** optional. Replace localStorage with an IndexedDB + a tiny KV service (Cloudflare KV, for instance) behind a passphrase. Only if the user reports friction in practice.
- **v3 — The album deepens:** theme tagging, cross-book connections ("words I looked up while reading books by women"), timeline view of the reading year.
- **Physical artifacts:** monthly printable PDF (brainstorm decision) lands with the quotes bed, not words. A "year of pressings" end-of-year print could be a delightful v2+ addition.

## Documentation Plan

- `README.md` — setup, the local-only statement, data-privacy note, shortcuts.
- `docs/solutions/2026-XX-kindle-clippings-gotchas.md` — real gotchas from Phase 1 (BOM, orphaned LOOKUPS, sideloaded titles, timezone anchors).
- `docs/architecture.md` — the data-flow diagram from Technical Approach, kept up to date as phases ship.
- Inline: scheduler.ts has one comment explaining the stability-21 threshold choice (the only non-obvious thing in the codebase). No other comments needed — names should carry the meaning.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-04-21-literary-garden-brainstorm.md](../brainstorms/2026-04-21-literary-garden-brainstorm.md) — carried forward:
  - v1 scope = words bed only; quotes bed deferred.
  - Three-state botanical progression with stability-based graduation.
  - Local-first, private-by-default; sharing is a v2 concern for quotes.
  - "Function differs, form unifies" as the architecture principle.
  - "State-as-aesthetic" as the core design principle.

### Internal References

- Real seed data: `/Users/bhavya/Vibe_coding/Kindle_exp/vocabulary/vocab.db` (166 words, 173 lookups, 22 books as of 2026-04-21). Move to `data/raw/vocab.db` in Phase 1.
- Illustrations assigned round-robin from `src/assets/illustrations/*.svg` in Phase 2.

### External References

- **Astro v5** — content collections with `file()` loader, `experimental.fonts` stable, `<Image>` component — `https://docs.astro.build`.
- **ts-fsrs** — `createEmptyCard()`, `fsrs().next(card, date, rating)`, `Rating.Again|Hard|Good|Easy`, card fields (stability, difficulty, due, state, reps, lapses) — `https://open-spaced-repetition.github.io/ts-fsrs/`.
- **better-sqlite3** v12.x — `new Database(path, { readonly: true, fileMustExist: true })` for Kindle vocab.db — `https://github.com/WiseLibs/better-sqlite3`.
- **Tailwind CSS v4** — CSS-first `@theme` config, OKLCH palette — `https://tailwindcss.com/docs/v4-beta`.
- **Svelte 5** — runes (`$state`, `$derived`, `$effect`, `$props`) — `https://svelte.dev/docs/svelte/overview`.
- **Open Library Covers API** — `https://covers.openlibrary.org/b/{type}/{id}-{size}.jpg?default=false`, ~100 req/5 min per IP for non-cover-ID lookups — `https://openlibrary.org/dev/docs/api/covers`.
- **Free Dictionary API** — `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` (Wiktionary data, no key) — `https://dictionaryapi.dev`.
- **Kindle vocab.db schema reference** — `https://yatsushi.com/blog/export-kindle-vocab-builder/` and `https://github.com/stoope/kindle-vocab-tools`.
- **FSRS algorithm** — `https://expertium.github.io/Algorithm.html` and `https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm`.
- **Botanical illustration sources (CC0/public domain):** rawpixel.com (vintage botanical prints, many CC0), OpenClipart, Biodiversity Heritage Library.

### Related Work

- Brainstorm follow-ups (tracked there, not here): quotes-bed brainstorm + plan; monthly printable design.
