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
cp "/Volumes/Kindle/documents/My Clippings.txt" data/raw/         # optional; powers the scrapbook tab
pnpm seed       # NB: not `pnpm import` — that's a pnpm built-in
pnpm dev
```

### Dev scripts

| Script                       | What it does                                                         |
| ---------------------------- | -------------------------------------------------------------------- |
| `pnpm seed`                  | Import `vocab.db` → `data/processed/` (incremental; reuses caches).  |
| `pnpm seed:refresh-covers`   | Re-fetch book covers from Open Library even if cached.               |
| `pnpm seed:refresh-definitions` | Re-fetch dictionary definitions (dictionaryapi.dev).              |
| `pnpm seed:refresh`          | Refresh both covers and definitions.                                 |
| `pnpm seed:offline`          | Skip all network calls — use only the cached enrichments.            |
| `pnpm dev`                   | Astro dev server at `http://localhost:4321`.                         |
| `pnpm build`                 | Static build → `dist/`.                                              |
| `pnpm preview`               | Serve the built site locally.                                        |
| `pnpm check`                 | Astro + Svelte type check.                                           |

### Keyboard shortcuts

Daily practice is reachable without the mouse:

| Key                     | Action                              |
| ----------------------- | ----------------------------------- |
| `Space` or `Enter`      | Flip the card                       |
| `1`                     | Rate "didn't know"                  |
| `2`                     | Rate "blurry, had to think"         |
| `3`                     | Rate "knew it instantly"            |
| Swipe `←` / `→` (touch) | Didn't know / knew it               |

See `/about` in the running app for the full legend.

### Importing your Kindle highlights

The scrapbook tab reads from `data/raw/My Clippings.txt`. Copy that file from your Kindle's USB-mounted `documents/` folder. If the file isn't present, `pnpm seed` still succeeds — the words bed keeps working and the scrapbook tab shows an empty-state prompting you to copy the file.

Re-running `pnpm seed` after updating `My Clippings.txt` re-parses highlights. Quote ids are stable across re-imports so your pressed favorites survive new highlights. If you re-highlight a passage with shifted boundaries on the Kindle, the press-state is reattached by soft match on mount; if the match is ambiguous the press is silently dropped.

The `data/raw/` directory is gitignored.

## Stack

- Astro v6 (static site)
- Svelte 5 (interactive islands)
- Tailwind v4 (CSS-first theme, OKLCH palette)
- better-sqlite3 (read vocab.db at build time)
- ts-fsrs (spaced repetition)

## Project status

v1 (words bed) — Phases 1–4 complete. See the plan for per-phase "Shipped" notes.

## Plan and brainstorm

- Literary garden brainstorm: [docs/brainstorms/2026-04-21-literary-garden-brainstorm.md](docs/brainstorms/2026-04-21-literary-garden-brainstorm.md)
- v1 words bed plan: [docs/plans/2026-04-21-feat-literary-garden-v1-words-bed-plan.md](docs/plans/2026-04-21-feat-literary-garden-v1-words-bed-plan.md)
- Scrapbook bed brainstorm: [docs/brainstorms/2026-04-22-quotes-tab-scrapbook-brainstorm.md](docs/brainstorms/2026-04-22-quotes-tab-scrapbook-brainstorm.md)
- Scrapbook bed plan: [docs/plans/2026-04-22-feat-quotes-tab-scrapbook-plan.md](docs/plans/2026-04-22-feat-quotes-tab-scrapbook-plan.md)
- Gotchas from implementation: [docs/solutions/2026-04-22-kindle-import-gotchas.md](docs/solutions/2026-04-22-kindle-import-gotchas.md)
