---
date: 2026-04-22
topic: quotes-tab-scrapbook
status: brainstorm
---

# Quotes Tab — The Scrapbook Bed

A follow-up to `2026-04-21-literary-garden-brainstorm.md`. The original brainstorm scoped v1 to the words bed only and deferred the quotes bed to a dedicated brainstorm/plan cycle. This is that cycle.

## What We're Building

The quotes tab — labeled **"the scrapbook"** in the nav alongside *"the papers"* and *"garden"* — is the second bed of the literary garden. Where the words bed is a restrained daily-practice surface (flashcards, pressed flowers), the scrapbook bed is an outward, browsing-oriented surface for quotes the user has highlighted from books.

**Primary interaction: a horizontal spine carousel**, modeled directly on adammaj.com.

The shelf is a row of book spines — each a solid colored bar with the title set in vertical sans-serif. In the center of the carousel, the focused book rotates face-forward, showing the real Kindle cover JPG. Left/right arrows (and keyboard / swipe) navigate through the collection. There is no open/close state — **the carousel IS the shelf, and the focused book IS always "open."** Navigation replaces expansion.

Beneath the carousel, the focused book's detail pane renders:

- Book title in large Cormorant serif display
- Author, optional read-date, pressed-count, total-count (`N pressed of M highlights`)
- A **mixed-rhythm quote grid**: one featured pull-quote (hero) at top + smaller masonry tiles beneath

The shelf has a **pressed toggle**. When pressed view is active, the carousel filters to books that have at least one pressed quote; other books are hidden entirely. Pressing a quote (the curation gesture that mirrors the words-bed pressed-flower album) promotes it to hero of its book's grid and makes its book visible in pressed view.

Every quote can be exported as a **share image** (watercolor card, Cormorant serif, garden palette, social-sized PNG).

## Why This Approach

Two references pulled in different directions:

- **Stripe Press (press.stripe.com)** → editorial publisher; typographic colored covers in a numbered catalog. Book-as-hero.
- **adammaj.com** → personal reading page; horizontal spine carousel with face-forward focused cover, hand-picked metadata (`Rating: 6/10`, `Read: July 19, 2024`). Carousel-as-reader.

We chose adammaj's **spine carousel** because it collapses two gestures into one — the shelf and the detail pane coexist permanently, navigation is expansion, and the adjacent spines remain visible as context the user never loses. No modals, no open/close, no back button.

We tether the aesthetic to the existing garden via **palette source**. Rather than arbitrary saturated spine colors, spines draw from the garden's *deeper* tokens — `leather-dark`, `gold`, `wax-crimson`, `wax-amber`, `teal-700`, `sage-700`, `wisteria-500`. This finally activates the unused bookbinding palette sitting in `src/styles/global.css` and keeps the scrapbook bed visibly related to the words bed without repeating it. Cormorant + Inter typography and `watercolor-paper` background continue from the rest of the site into the detail pane and quote tiles.

**Pure Stripe Press** (generated typographic covers per book) was rejected — high design risk, discards the real Kindle cover JPGs already downloaded.

**Handcrafted-scrapbook tropes** (torn edges, rotations, ink borders) — my initial misreading of "scrapbook (adammaj)" — were dropped once the real adammaj pattern was on the table. adammaj is visually cleaner than literal scrapbook; its personality lives in bold spines, hand-picked metadata, and carousel flow, not in paper-distress visuals.

## Key Decisions

- **Shelf = horizontal spine carousel.** Focused book face-forward in the center, spines flanking. Left/right arrows navigate; keyboard + swipe supported.
- **Always-visible detail pane below the carousel.** Title, metadata, and quote grid for the currently-focused book render permanently; no open/close state.
- **Face-forward cover = real Kindle JPG** from `public/covers/{bookId}.jpg`. No generated covers.
- **Spine colors from deeper garden tokens** (~7 saturated values): `leather-dark`, `gold`, `wax-crimson`, `wax-amber`, `teal-700`, `sage-700`, `wisteria-500`. Assigned deterministically by book-id hash so a given book always looks the same.
- **Mixed-rhythm quote grid.** One featured hero pull-quote (Cormorant display, large) + smaller masonry tiles beneath. Each book gets a clear point of entry.
- **Tab label: "the scrapbook"** — lowercase italic, matches existing nav form.
- **Hero quote logic:** most-recently pressed; falls back to most-recent highlight when nothing is pressed.
- **Shelf sort order:** most-recently-highlighted book first. Books you just read sit at the front of the carousel.
- **Hybrid curation.** All highlights visible by default. Pressing a quote marks it a favorite.
- **Pressed view = filter.** Toggle filters the carousel to books with ≥1 pressed quote; others are hidden. Same mechanism, filtered set.
- **Share image per quote, not gated by pressing.** Every quote can be exported as a PNG. Press = "find this again"; share = "post this." Two intentions kept cleanly separable.
- **Tethered to garden aesthetic.** Cormorant + Inter typography, `watercolor-paper` background on the detail pane and tiles, garden's deeper palette for spines and accents. Architectural principle *"function differs, form unifies"* preserved.

## Open Questions

For resolution during `/ce:plan`:

- **Data source state.** Does `My Clippings.txt` already exist in `data/raw/`? The `scripts/import.ts` importer currently handles only `vocab.db` — it needs extension to parse Kindle clippings and emit a new `quotes` content collection. Schema TBD: `quoteId`, `bookId`, `text`, `location`/`page`, `highlightedAt`, optional `note`, optional `pressedAt`.
- **Carousel URL state.** Does the focused book's slug appear in the URL (e.g. `/scrapbook#coffee-cools`) so browser back works and specific books are linkable? Or is focus purely ephemeral?
- **Carousel geometry.** How many spines show on each side of the focused cover (adammaj shows ~4 each)? Does the carousel wrap (infinite) or have hard edges?
- **Rating + read-date metadata (from adammaj).** adammaj's pane shows `Read: July 19, 2024 - Rating: 6/10`. Neither is a Kindle field. Add manual-rating to the content model? Use first/last highlight date as a read-date proxy, or leave read-date unfilled?
- **Empty/single-quote books.** Hide books with 0 highlights from the carousel entirely? Promote the single highlight of a 1-quote book to hero with no masonry beneath?
- **Highlights vs notes vs bookmarks.** `My Clippings.txt` contains all three. Default proposal: only highlights (and highlights-with-attached-notes) become tiles; user-notes attached to a highlight render as margin annotation on that tile.
- **Share-image rendering strategy.** Client-side (canvas / html-to-image on demand) vs. build-time pre-render to `public/shares/{quote-id}.png`. Build-time is cleaner for a static site but can bloat output for a large corpus.
- **Press-state persistence.** localStorage (like FSRS flashcard state) vs. a JSON file the importer reads/writes. localStorage is simpler; a file is git-backupable and survives device changes.
- **Privacy stance.** Prior brainstorm specifies `noindex,nofollow` and local-first. Share-image export happens via user action (download) — no server, no upload. Confirm this is sufficient opt-in.

## Next Steps

→ `/ce:plan docs/brainstorms/2026-04-22-quotes-tab-scrapbook-brainstorm.md` for implementation details.
