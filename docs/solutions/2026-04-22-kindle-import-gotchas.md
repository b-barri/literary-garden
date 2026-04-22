---
title: Kindle import & enrichment gotchas
date: 2026-04-22
phases: [1, 2, 3]
tags: [kindle, sqlite, open-library, dictionaryapi, astro, svelte, tailwind]
---

# Kindle import & enrichment gotchas

The real things that broke during Phases 1–3. Everything here cost > 15 minutes
of investigation; recording them so the next import pipeline (or anyone else)
doesn't re-discover them.

## 1. `pnpm import` is a built-in pnpm subcommand

Naming an npm script `import` and then running `pnpm import` does **not** run
your script. `pnpm import` is pnpm's built-in lockfile-conversion command, and
invoking it in a project with a `pnpm-lock.yaml` deletes the lockfile.

**Fix:** rename the script. We use `pnpm seed`. The `import` subcommand in
`scripts/` stays, it's the `package.json` binding that had to move.

## 2. `.astro` cache goes stale when you add a collection

Adding `books` to `src/content.config.ts` produced
`The collection "books" does not exist or is empty` at dev-server boot, even
with the config and JSON file in place. Clearing `.astro/` fixed it instantly.

**Fix:** `rm -rf .astro` when a new collection is added, or use a dev script
that wipes it. Astro *usually* invalidates correctly — this is the exception.

## 3. Sideloaded Kindle books duplicate the author in the title

Titles like `The Anthropologists (Aysegül Savas)` and `The Lonely City
(Olivia Laing) (Z-Library)` come from Calibre/Z-Library sideloads. The parens
are not metadata — they're part of the `BOOK_INFO.title` field.

**Fix (scripts/import.ts `cleanTitle`):** strip trailing `(...)` groups, repeat
until stable. Leaves real-parenthetical titles alone if the inner content
doesn't match the known-suffix shapes.

## 4. Orphaned `LOOKUPS` rows after you delete a vocab entry on the device

`LOOKUPS` rows survive `WORDS` deletion. An `INNER JOIN` silently drops them,
which is usually what you want; a `LEFT JOIN` would surface dangling rows
with `NULL` word data.

**Fix:** use `INNER JOIN LOOKUPS × WORDS × BOOK_INFO`. Document the choice —
a future maintainer will wonder why we're not `LEFT JOIN`-ing.

## 5. Prefer `stem` over the inflected form for dictionary lookups

Querying dictionaryapi.dev with the user's literal lookup (e.g. `"acquiesced"`)
fails where querying the stem (`"acquiesce"`) succeeds. Hit rate on real data:
~70% vs ~93% (154/166 words).

**Fix (`enrichDefinitions`):** try `stem` first, fall back to the inflected
form only if the stem 404s.

## 6. Open Library sometimes returns a grey placeholder instead of 404

Even with `?default=false`, `covers.openlibrary.org` occasionally responds
200 with a ~800-byte grey PNG. Writing that byte-for-byte means grey boxes
in the UI instead of the botanical fallback.

**Fix:** `if (response.bytes < 1500) treat as "no cover";`. Thresholds
empirical but robust — real covers are always ≥ 2 KB at size `-M`.

## 7. Rate limiting the dictionary + cover calls

dictionaryapi.dev is polite-but-public; Open Library's published guidance is
≤ 100 requests per 5 min. Parallelising the enrichment pass for 166 words +
22 covers hit visible throttling.

**Fix:** concurrency 1, random sleep 200–400 ms between calls. Incremental
caching (`data/processed/definitions.json`, `covers/manifest.json`) means
subsequent runs only touch the network for new entries.

## 8. `<svelte:window>` can't live inside `{#if}` in Svelte 5

```svelte
{#if captureKeyboard}
  <svelte:window onkeydown={handle} />  <!-- compile error in Svelte 5 -->
{/if}
```

The `<svelte:window>` element is a top-level construct, not a conditional one.

**Fix:** unconditional `<svelte:window>`, condition *inside* the handler:

```svelte
<svelte:window onkeydown={handleWindowKey} />

function handleWindowKey(event) {
  if (!captureKeyboard) return;
  handleKey(event);
}
```

## 9. CSS 3D flip needs `perspective` on the parent

`transform-style: preserve-3d` + `rotateY(180deg)` + `backface-visibility:
hidden` looks like a full flip recipe, but without `perspective` on the
parent, `rotateY(180deg)` collapses to a 2D mirror — the backface never
actually hides because there's no 3D context to hide *from*.

**Fix:** `.card-scene { perspective: 1200px; }` on the ancestor.

## 10. Astro 6 deprecates `z` from `astro:content`

The `z` re-export is deprecated; content schemas should import from `astro/zod`
directly. `z.string().datetime()` is also deprecated in zod v4 — use
`z.iso.datetime()`.

## 11. `<article role="button">` fails Svelte's a11y lint

Use `<div role="button" tabindex="0">` or a real `<button>`. `<article>`
carries landmark semantics that conflict with the button role.

## 12. `client:visible` with many islands

Placing 166 `<WordCard client:visible />` on one page initially looked
expensive, but `client:visible` hydrates on scroll — initial JS cost is
surprisingly small. The real cost comes at scroll time, which is why the
Phase 3 daily-queue refactor (one card at a time) was a worthwhile
tradeoff even on the Phase 2 numbers.
