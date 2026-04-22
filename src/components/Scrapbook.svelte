<script lang="ts">
  import type { Book, Quote } from "~/lib/types";
  import SpineCarousel from "./SpineCarousel.svelte";
  import BookDetail from "./BookDetail.svelte";
  import { assignSpineColors, resolveSpine } from "~/lib/spineAesthetic";
  import { slugify } from "~/lib/slugify";

  interface Props {
    books: Book[];
    quotes: Quote[];
  }

  const { books, quotes }: Props = $props();

  let mounted = $state(false);
  let focusedIndex = $state(0);

  // Sort books by most-recent highlight, descending. Books with no highlights
  // (words-only, no clippings) fall to the bottom. Filter those out for now —
  // Phase 2 is scrapbook-only; words-only books have no quotes to show.
  const sortedBooks = $derived(
    books
      .filter((b) => (b.highlightCount ?? 0) > 0)
      .sort((a, b) => {
        const ax = a.mostRecentHighlightAt ?? "";
        const bx = b.mostRecentHighlightAt ?? "";
        return bx.localeCompare(ax);
      }),
  );

  // Deterministic spine colours + AA title colours, computed once per sorted order.
  const spineColors = $derived(assignSpineColors(sortedBooks.map((b) => b.id)));

  const focusedBook = $derived(sortedBooks[focusedIndex] ?? null);

  const quotesOfFocused = $derived(
    focusedBook
      ? quotes
          .filter((q) => q.bookId === focusedBook.id)
          .sort((a, b) => b.highlightedAt.localeCompare(a.highlightedAt))
      : [],
  );

  const heroQuote = $derived(quotesOfFocused[0] ?? null);

  $effect(() => {
    // On mount: check URL hash for a book slug, focus that index if found.
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (hash) {
      const idx = sortedBooks.findIndex((b) => slugify(b.title) === hash);
      if (idx >= 0) focusedIndex = idx;
    }
    mounted = true;
  });

  function handleFocus(next: number) {
    if (next < 0 || next >= sortedBooks.length) return;
    focusedIndex = next;
    const b = sortedBooks[next];
    if (!b) return;
    const slug = slugify(b.title);
    // replaceState so back-button doesn't accumulate every keystroke
    history.replaceState(null, "", slug ? `#${slug}` : window.location.pathname);
  }
</script>

{#if !mounted}
  <p class="placeholder" aria-live="polite">opening the scrapbook…</p>
{:else if sortedBooks.length === 0}
  <section class="empty-state" aria-live="polite">
    <div class="emoji" aria-hidden="true">📖</div>
    <h2>no passages yet</h2>
    <p>
      copy <code>My Clippings.txt</code> from your Kindle's <code>documents/</code>
      folder into <code>data/raw/</code>, then re-run <code>pnpm seed</code>.
    </p>
    <p class="small">the importer will read your highlights and fill this page.</p>
  </section>
{:else}
  <SpineCarousel
    books={sortedBooks}
    spineColors={spineColors}
    {focusedIndex}
    onfocus={handleFocus}
  />

  {#if focusedBook}
    {@const resolved = resolveSpine(
      focusedBook.id,
      focusedBook.spineColor ?? null,
      spineColors[focusedIndex] ?? "var(--color-leather-dark)",
    )}
    <BookDetail
      book={focusedBook}
      quotes={quotesOfFocused}
      {heroQuote}
      spineColor={resolved.bg}
      titleColor={resolved.fg}
    />
  {/if}
{/if}

<style>
  .placeholder {
    text-align: center;
    color: var(--color-sepia);
    font-style: italic;
    font-family: var(--font-display);
    padding: 3rem 0;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1.5rem;
    max-width: 36rem;
    margin: 0 auto;
  }
  .empty-state .emoji {
    font-size: 3rem;
    margin-bottom: 0.75rem;
    filter: drop-shadow(0 2px 2px oklch(0.72 0.08 70 / 0.2));
  }
  .empty-state h2 {
    font-family: var(--font-display);
    font-size: 1.8rem;
    color: var(--color-sage-900);
    margin: 0 0 0.5rem;
  }
  .empty-state p {
    color: var(--color-ink);
    line-height: 1.55;
    margin: 0.4rem 0;
  }
  .empty-state .small {
    font-size: 0.85rem;
    color: var(--color-sepia);
    font-style: italic;
  }
  .empty-state code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.88em;
    background: oklch(0.93 0.04 145 / 0.35);
    padding: 0.05em 0.35em;
    border-radius: 3px;
  }
</style>
