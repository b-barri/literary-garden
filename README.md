# Literary Garden

A digitized intellectual orbit — a private, botanically-illustrated vocabulary practice and highlights scrapbook, grown from your own Kindle reading.

<!--
  Hero media slot. Drop your own preferred hero into public/docs/ and it
  will render below. If the file is missing, the image link just shows
  broken alt text — no build failure. The Pressed Album export from the
  /garden page makes a solid hero.
-->
![The Literary Garden — pressed words from a year's reading](public/docs/hero.png)

---

## Requirements

- **macOS** — walkthrough below is Mac-only. Windows/Linux welcomed as contributions.
- **A physical Amazon Kindle** with Vocabulary Builder enabled (Settings → Language & Dictionary → Vocabulary Builder → On).
- **Node 20+** (`node --version`).
- **pnpm** (`npm i -g pnpm`).

## Not supported (yet)

- Kobo, Boox, or other non-Kindle e-readers — they don't expose the `vocab.db` sqlite file.
- The Kindle phone/tablet app — same reason.
- Windows / Linux — step-by-step below is Mac only. Core code runs everywhere; the walkthrough is what's missing. **PRs welcome.**

---

## Philosophy

> Everyone has their own intellectual orbit — the shape of thought inherited from family, schooling, the city of one's youth. To live is to widen that orbit. Reading is the humblest route: a book is a letter from a stranger who has lived what you have not. This garden is the digital form of the orbit — pressed, tended, revisited, and sometimes shared as a postcard.

There are three states a word can be in: **seedling** (never reviewed), **in bloom** (actively learning), **pressed** (21+ days of proven memory). The garden visualizes where each of your words is, and nudges you to return daily.

## Getting your Kindle data (Mac)

1. Plug your Kindle into your Mac via USB.
2. It appears in Finder under **Locations** as `Kindle` (usually at `/Volumes/Kindle`).
3. In Finder, press **⌘ + ⇧ + .** (Cmd-Shift-dot) to reveal hidden folders. The `system/` directory becomes visible.
4. Copy two files into this repo's `data/raw/`:
   - `/Volumes/Kindle/system/vocabulary/vocab.db` → **required** (powers the words bed + garden)
   - `/Volumes/Kindle/documents/My Clippings.txt` → **optional** (powers the scrapbook tab)

<!--
  Media slot: screenshot of Finder showing the Kindle volume + the
  hidden /system/vocabulary/ path. Drop a PNG at public/docs/kindle-walkthrough.png
  to replace the broken-link placeholder.
-->
![Finder showing the Kindle volume and vocab.db location](public/docs/kindle-walkthrough.png)

**Nothing leaves your Mac.** `data/raw/` and `public/covers/` are both gitignored. A pre-commit hook blocks any accidental `git add -f` on personal paths.

## Setup

```sh
pnpm install
cp src/site.config.example.ts src/site.config.ts   # then edit with your name
# copy your Kindle files per the walkthrough above
pnpm seed                                           # process vocab.db + clippings
pnpm dev                                            # Astro at http://localhost:4321
```

**Edit `src/site.config.ts`** with your name and title. This file is gitignored so your values stay local — the template ships with only `site.config.example.ts` committed.

<!--
  Media slot: screenshot of an editor showing the handful of fields in
  site.config.ts (ownerName, siteTitle, tagline, socialImage, stampImage)
  with example values. Drop at public/docs/site-config-edit.png.
-->
![Editing site.config.ts — five fields](public/docs/site-config-edit.png)

**Optional personalization:**
- Drop your own `public/og-image.png` (1200×630) for LinkedIn/Twitter/Facebook link previews.
- Drop your own wax-seal stamp into `public/your-stamp.png` and point `stampImage` at it. The default `stamp-default.svg` ships with a generic seal.
- Also update `public/manifest.webmanifest`'s `name` field to match your `siteTitle` — it's static JSON and can't import the config automatically.

### Dev scripts

| Script | What it does |
| --- | --- |
| `pnpm seed` | Import `vocab.db` + clippings → `data/processed/`. Incremental. |
| `pnpm seed:refresh-covers` | Re-fetch book covers from Open Library even if cached. |
| `pnpm seed:refresh-definitions` | Re-fetch definitions (dictionaryapi.dev). |
| `pnpm seed:refresh` | Refresh both. |
| `pnpm seed:offline` | Skip all network; use only cached enrichments. |
| `pnpm reseed` | Seed + clear `.astro` cache (use after import changes). |
| `pnpm dev` | Astro dev server at `http://localhost:4321`. |
| `pnpm build` | Static build → `dist/`. |
| `pnpm preview` | Serve the built site locally. |
| `pnpm check` | Astro + Svelte type check. |

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` / `Enter` | Flip the practice card |
| `1` | Rate "didn't know" |
| `2` | Rate "blurry, had to think" |
| `3` | Rate "knew it instantly" |
| Swipe `←` / `→` (touch) | Didn't know / knew it |

Full legend + more context lives on the `/about` page in the running app.

## Re-seeding when you have new Kindle data

Rerun `pnpm seed` whenever you've added new highlights or vocabulary. The contract:

- **New words are added as seedlings.**
- **Existing words keep their FSRS card state** — spaced-repetition progress is keyed by Kindle's stable `word_id`, stored in your browser's `localStorage`, and never touched by the seed script.
- **Words you've removed from your Kindle vocab** don't vanish — their FSRS history stays in localStorage, cosmetically orphaned but harmless.
- **Re-seeding is safe to run as often as you like.** It's incremental and never destroys progress.

In short: your practice history lives in the browser; the seed script only rewrites `data/processed/*.json` and `public/covers/`. They don't talk to each other except at render time.

## Troubleshooting

- **`pnpm seed` exits with "No vocab.db found"** — copy it from `/Volumes/Kindle/system/vocabulary/vocab.db` per the walkthrough above.
- **`pnpm seed` says "Seeded 0 words"** — your Kindle's vocab.db is empty. Enable Vocabulary Builder on the device (Settings → Language & Dictionary → Vocabulary Builder → On), then look up a few words while reading. Then re-copy the db.
- **Covers missing for some books** — Open Library and Google Books don't always have every edition. Sideloaded books in particular are often unknown. The placeholder illustrations are intentional; they won't harm practice.
- **Book title reads weirdly, e.g. "(Author) (Z-Library)"** — the import script strips those artifacts from sideloaded filenames but the rule set is heuristic. Report a missed pattern as an issue and we'll extend it.
- **Practice cards or flora look stale after re-seeding** — delete `.astro/` (Astro's content cache) and restart dev: `rm -rf .astro && pnpm dev`. Or just `pnpm reseed`, which does both.
- **`pnpm install` fails on `better-sqlite3`** — Node native module; check that your Node matches the project's (`node --version` should be ≥ 20) and that you're on Apple Silicon (arm64). If you switched Nodes, `pnpm install --force` rebuilds.

## Privacy

**Local-first by default.** Nothing is uploaded, tracked, or synced. Definitions and covers are fetched once at seed time and bundled into the built site.

`data/raw/`, `data/processed/`, `public/covers/`, `My Clippings.sdr/`, and `book_cover/` are all gitignored. The pre-commit hook (`scripts/block-private.sh`) blocks any accidental `git add -f` on those paths.

**Do not deploy this to a public URL.** Even just `public/covers/` — which is your *own* cover cache — reveals your reading history via filenames. If you want always-on access from your phone, see the next section for the password-gated private-deploy path.

## Private Deploy (optional, owner-only)

If you want to browse your garden from your phone, the simplest path is a private Vercel deploy:

```sh
pnpm add -D vercel
vercel login
vercel link                                 # one-time: creates .vercel/, gitignored
```

**Before the first deploy**, in the Vercel dashboard → Project Settings → **Deployment Protection**, enable **Vercel Authentication** (free on Hobby). This gates your site behind Vercel's login — no public URL.

```sh
pnpm seed && pnpm build
vercel build --prod
vercel deploy --prebuilt --prod             # uploads only the static output
```

**Two warnings you must not skip:**

1. **Enable Deployment Protection before deploying**, and only use the `*.vercel.app` URL. On Hobby tier, production custom domains are always public — stick with the generated URL or your reading list is scrapeable.
2. **State is per-browser.** Your spaced-repetition progress lives in each device's localStorage. Pressing a word on your phone doesn't sync to your laptop. Pick one "primary" device for serious practice and use the other for casual browsing.

If you need shared-password access (a friend who doesn't have a Vercel account), switch to **Cloudflare Pages + Access** — their free tier allows magic-link email policies and up to 50 users. The `pnpm build` output is the same; only the deploy step changes.

## Stack

- Astro v6 (static site)
- Svelte 5 (interactive islands, runes mode)
- Tailwind v4 (CSS-first, OKLCH palette)
- better-sqlite3 (read vocab.db at build time)
- ts-fsrs (spaced repetition)
- html-to-image (Pressed Album + Quote PNG export)
- simple-git-hooks (the pre-commit privacy guard)
- sharp (`scripts/gen-icons.ts` for PWA icons)

## Project status

- v1 — words bed, practice, garden: shipped.
- Scrapbook tab (Kindle highlights): shipped.
- BYOK template + share export: shipped (this pass).
- Private deploy pipeline: documented.

## Plans + brainstorms

- [Scrapbook tab plan](docs/plans/2026-04-22-feat-quotes-tab-scrapbook-plan.md)
- [BYOK template + LinkedIn launch plan](docs/plans/2026-04-22-feat-linkedin-share-byok-template-plan.md)
- [Practice-garden continuity plan](docs/plans/2026-04-21-practice-garden-continuity-plan.md)
