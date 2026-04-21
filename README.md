# Literary Garden

A digitized intellectual orbit — a private, botanically-illustrated vocabulary practice surface built from the user's Kindle clippings.

**v1 scope — the words bed.** Quotes come next. See `docs/brainstorms/` and `docs/plans/` for the origin story.

## Philosophy

> Everyone has their own intellectual orbit that one needs to expand, through travel or reading. This garden is the digital form of that orbit — tended, revisited, and sometimes shared as a postcard.

## Privacy

**This is a local-first, single-device site.** Your `vocab.db` and any clippings never leave your machine. Nothing is uploaded, tracked, or synced. There is no public URL. If you deploy this to the open internet, you are publishing your private reading history — don't.

The `data/raw/` directory (where your Kindle files live) is gitignored.

## Setup

```sh
pnpm install
cp /Volumes/Kindle/system/vocabulary/vocab.db data/raw/vocab.db   # or drag-drop
pnpm seed       # NB: not `pnpm import` — that's a pnpm built-in
pnpm dev
```

## Stack

- Astro v5 (static site)
- Svelte 5 (interactive islands)
- Tailwind v4 (CSS-first theme, OKLCH palette)
- better-sqlite3 (read vocab.db at build time)
- ts-fsrs (spaced repetition)

## Plan and brainstorm

- Brainstorm: [docs/brainstorms/2026-04-21-literary-garden-brainstorm.md](docs/brainstorms/2026-04-21-literary-garden-brainstorm.md)
- v1 plan: [docs/plans/2026-04-21-feat-literary-garden-v1-words-bed-plan.md](docs/plans/2026-04-21-feat-literary-garden-v1-words-bed-plan.md)
