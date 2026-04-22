<script lang="ts">
  import { tick } from "svelte";
  import type { Card } from "ts-fsrs";
  import { loadAll } from "~/lib/progress";
  import { mastery } from "~/lib/scheduler";
  import { assignIllustration, illustrationSvg } from "~/lib/illustration";
  import { placeholderCoverSrc } from "~/lib/coverFallback";
  import PressedAlbumCard from "./PressedAlbumCard.svelte";
  import { sharePNG, canNativeShare } from "~/lib/share";
  import { siteConfig } from "~/site.config";

  interface Word {
    id: string;
    word: string;
    stem: string;
    lang: string;
    primaryBookId: string;
    lookups: { usage: string; bookId: string; seenAt: string }[];
  }
  interface Book {
    id: string;
    title: string;
    authors: string;
    coverUrl: string | null;
  }

  interface Props {
    allWords: Word[];
    books: Book[];
  }

  const { allWords, books }: Props = $props();

  const booksById = new Map(books.map((b) => [b.id, b]));

  let pressed: Array<{ word: Word; card: Card; pressedAt: Date }> = $state([]);
  let inBloom: Array<{ word: Word; card: Card; lastReview: Date; nextDue: Date }> = $state([]);
  let mounted = $state(false);

  $effect(() => {
    const cards = loadAll();
    const pressedList: typeof pressed = [];
    const bloomList: typeof inBloom = [];
    for (const w of allWords) {
      const card = cards[w.id];
      if (!card) continue;
      const m = mastery(card);
      if (m === "pressed") {
        pressedList.push({
          word: w,
          card,
          pressedAt: card.last_review ?? card.due,
        });
      } else if (m === "bloom") {
        bloomList.push({
          word: w,
          card,
          lastReview: card.last_review ?? new Date(),
          nextDue: card.due,
        });
      }
    }
    pressedList.sort((a, b) => b.pressedAt.getTime() - a.pressedAt.getTime());
    bloomList.sort((a, b) => b.lastReview.getTime() - a.lastReview.getTime());
    pressed = pressedList;
    inBloom = bloomList;
    mounted = true;
  });

  // Group by primary book
  const grouped = $derived.by(() => {
    const groups = new Map<string, typeof pressed>();
    for (const item of pressed) {
      const key = item.word.primaryBookId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return [...groups.entries()].map(([bookId, items]) => ({
      book: booksById.get(bookId),
      items,
    }));
  });

  function formatPressedDate(d: Date): string {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  // --- Export pipeline ---
  //
  // Click-handler mounts the off-screen <PressedAlbumCard> at its native
  // 1080×1350 dimensions, waits one tick + font-ready + image-decode,
  // then calls sharePNG (Web Share on mobile, download fallback).
  //
  // Concurrent-click guard: `exporting` state disables the button during
  // capture. The card only lives in the DOM while `showExport` is true,
  // which keeps the cost of pressing the album page to zero when not
  // exporting (the card is not cheap — 6 cover <img> tags each force a
  // network request on first load).
  let exporting = $state(false);
  let showExport = $state(false);
  let exportNode: HTMLDivElement | undefined = $state();
  let exportError = $state<string | null>(null);

  const canShare = $derived(canNativeShare());

  async function handleExport() {
    if (exporting || pressed.length === 0) return;
    exporting = true;
    exportError = null;
    showExport = true;
    try {
      // Wait for Svelte to flush state -> DOM.
      await tick();
      if (!exportNode) throw new Error("export node failed to mount");

      // Explicit font preload — fonts.ready alone can resolve before a
      // just-requested weight has painted. Two fonts in use on the card.
      const loadFont = (w: string, f: string) =>
        document.fonts.load(w, f).catch(() => {});
      await Promise.all([
        loadFont('500 58px "Cormorant Garamond"'),
        loadFont('italic 22px "Cormorant Garamond"'),
        loadFont('400 16px "Lora"'),
        document.fonts.ready,
      ]);

      // Wait for cover images to decode — .ready/.fonts doesn't cover
      // <img>. Decoded images render into the html-to-image clone cleanly;
      // undecoded ones render as blank squares.
      const imgs = Array.from(
        exportNode.querySelectorAll<HTMLImageElement>("img"),
      );
      await Promise.all(
        imgs.map((img) =>
          img.complete && img.naturalWidth > 0
            ? img.decode().catch(() => {})
            : new Promise<void>((r) => {
                img.onload = () => r();
                img.onerror = () => r();
              }),
        ),
      );

      // Two-frame yield so any loading UI paints before the synchronous
      // rasterize burst on the main thread.
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );

      const datestamp = new Date().toISOString().slice(0, 10);
      const slug = siteConfig.ownerName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await sharePNG(exportNode, {
        title: `${siteConfig.ownerName}'s pressed words`,
        text: "words pressed in my literary garden",
        filename: `${slug}-pressed-${datestamp}`,
      });
    } catch (err) {
      exportError = err instanceof Error ? err.message : "export failed";
      // Best-effort: leave the card mounted long enough for the error
      // message to be legible, then tear down anyway on next click.
    } finally {
      showExport = false;
      exporting = false;
    }
  }
</script>

{#if !mounted}
  <p class="loading" aria-live="polite">opening the album…</p>
{:else if pressed.length === 0 && inBloom.length === 0}
  <section class="empty">
    <div class="emoji" aria-hidden="true">🍃</div>
    <h2>your first pressings will appear here</h2>
    <p>
      when a word has been remembered long enough — 21 days of proven memory —
      it graduates from the practice deck to this album, like a flower pressed
      between the pages of a book.
    </p>
  </section>
{:else}
  {#if inBloom.length > 0}
    <section class="in-bloom">
      <h2>🌸 in bloom</h2>
      <p class="section-hint">
        {inBloom.length} word{inBloom.length === 1 ? "" : "s"} you&rsquo;re actively learning. they&rsquo;ll press after 21 days of proven memory.
      </p>
      <ul class="bloom-list">
        {#each inBloom as item (item.word.id)}
          <li>
            <div class="illus" aria-hidden="true">{@html illustrationSvg(assignIllustration(item.word.id))}</div>
            <div class="meta">
              <h4 lang={item.word.lang}>{item.word.word}</h4>
              <p class="stability">
                stability {Math.round(item.card.stability * 10) / 10}&nbsp;d
                <span class="sep">·</span>
                next due {item.nextDue.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if pressed.length > 0}
    <div class="pressed-header">
      <div>
        <h2 class="pressed-heading">🏵️ pressed</h2>
        <p class="count">
          {pressed.length} pressing{pressed.length === 1 ? "" : "s"}
          from {grouped.length} book{grouped.length === 1 ? "" : "s"}
        </p>
      </div>
      <button
        type="button"
        class="export-btn"
        onclick={handleExport}
        disabled={exporting}
        aria-label={canShare ? "share pressed album" : "download pressed album"}
      >
        {#if exporting}
          <span class="spinner" aria-hidden="true"></span>
          {canShare ? "sharing…" : "saving…"}
        {:else}
          {canShare ? "✦ share album" : "✦ save as image"}
        {/if}
      </button>
    </div>
    {#if exportError}
      <p class="export-error" role="alert">
        Couldn&rsquo;t export — {exportError}. Please try again.
      </p>
    {/if}
  {/if}
  <div class="albums">
    {#each grouped as group (group.book?.id ?? "unknown")}
      <section class="album">
        <header>
          {#if group.book?.coverUrl}
            <img class="cover" src={group.book.coverUrl} alt="" />
          {:else if group.book}
            <img class="cover" src={placeholderCoverSrc(group.book.id)} alt="" />
          {/if}
          <div>
            <h3>{group.book?.title ?? "—"}</h3>
            {#if group.book?.authors}<p class="authors">{group.book.authors}</p>{/if}
            <p class="book-count">{group.items.length} pressing{group.items.length === 1 ? "" : "s"}</p>
          </div>
        </header>
        <ul class="specimens">
          {#each group.items as item (item.word.id)}
            <li class="specimen">
              <div class="illustration" aria-hidden="true">
                {@html illustrationSvg(assignIllustration(item.word.id))}
              </div>
              <div class="word-info">
                <h4 lang={item.word.lang}>{item.word.word}</h4>
                <p class="sentence" lang={item.word.lang}>
                  &ldquo;{item.word.lookups[0]?.usage}&rdquo;
                </p>
                <p class="date">pressed {formatPressedDate(item.pressedAt)}</p>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
{/if}

<!--
  Off-screen export card. Mounted only while `showExport` is true so the 6
  cover <img> tags don't fetch on every album-page view. `left: -10000px`
  keeps the node fully laid out (vs `display: none`, which zeroes layout
  and breaks html-to-image capture).
-->
{#if showExport}
  <div
    class="export-stage"
    aria-hidden="true"
    bind:this={exportNode}
  >
    <PressedAlbumCard {pressed} {booksById} />
  </div>
{/if}

<style>
  /* Off-screen export stage — laid-out but not visible. `display:none`
     would zero dimensions and break the capture; `left:-10000px` is the
     battle-tested pattern from src/lib/share.ts's sibling component. */
  .export-stage {
    position: fixed;
    left: -10000px;
    top: 0;
    width: 1080px;
    pointer-events: none;
    z-index: -1;
  }

  /* --- Pressed heading row with export button --- */
  .pressed-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }
  .export-btn {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.95rem;
    color: var(--color-sage-900);
    background: var(--color-cream);
    border: 1px solid oklch(0.72 0.08 70 / 0.55);
    border-bottom-width: 2px;
    padding: 0.55rem 1.1rem;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 0.02em;
    transition: background 0.15s ease, transform 0.05s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.08);
  }
  .export-btn:hover:not(:disabled) {
    background: oklch(0.96 0.03 80);
  }
  .export-btn:active:not(:disabled) {
    transform: translateY(1px);
  }
  .export-btn:disabled {
    opacity: 0.55;
    cursor: progress;
  }
  .export-btn .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 1.5px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .export-error {
    margin: 0.5rem 0 0;
    font-size: 0.88rem;
    color: oklch(0.45 0.12 25);
    font-style: italic;
  }

  .loading {
    text-align: center;
    color: var(--color-sepia);
    font-style: italic;
    padding: 3rem 0;
  }
  .empty {
    text-align: center;
    padding: 4rem 1rem;
  }
  .empty .emoji { font-size: 3rem; margin-bottom: 0.5rem; }
  .empty h2 {
    font-family: var(--font-display);
    font-size: 1.6rem;
    color: var(--color-sage-900);
    margin-bottom: 0.75rem;
    letter-spacing: -0.01em;
  }
  .empty p {
    max-width: 28rem;
    margin: 0 auto;
    font-size: 0.9rem;
    color: var(--color-ink);
    line-height: 1.55;
  }

  .count {
    margin-bottom: 1.5rem;
    color: var(--color-sepia);
    font-style: italic;
    font-size: 0.9rem;
  }

  .in-bloom {
    margin-bottom: 2.5rem;
    padding-bottom: 2rem;
    border-bottom: 1px dashed oklch(0.82 0.06 145 / 0.6);
  }
  .in-bloom h2,
  .pressed-heading {
    font-family: var(--font-display);
    font-size: 1.4rem;
    color: var(--color-sage-900);
    margin-bottom: 0.35rem;
    letter-spacing: -0.01em;
  }
  .section-hint {
    font-size: 0.8rem;
    color: var(--color-sepia);
    font-style: italic;
    margin-bottom: 1rem;
  }
  .bloom-list {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.5rem;
  }
  .bloom-list li {
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 0.6rem;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--color-cream);
    border: 1px solid oklch(0.62 0.08 145 / 0.4);
    border-radius: 0.4rem;
  }
  .bloom-list .illus {
    width: 36px;
    aspect-ratio: 1;
  }
  :global(.bloom-list .illus svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
  .bloom-list h4 {
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--color-sage-900);
  }
  .bloom-list .stability {
    font-size: 0.7rem;
    color: var(--color-sepia);
    margin-top: 0.1rem;
  }
  .bloom-list .sep { margin: 0 0.3rem; }
  .pressed-heading {
    margin-top: 0;
  }

  .albums {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .album header {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid oklch(0.82 0.06 145 / 0.5);
  }
  .album .cover {
    width: 48px;
    height: 66px;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: 0 1px 4px oklch(0.22 0.02 250 / 0.15);
  }
  .album h3 {
    font-family: var(--font-display);
    font-size: 1.25rem;
    color: var(--color-sage-900);
    letter-spacing: -0.01em;
  }
  .album .authors {
    font-size: 0.8rem;
    color: var(--color-sepia);
    font-style: italic;
  }
  .album .book-count {
    font-size: 0.75rem;
    color: var(--color-sage-700);
    margin-top: 0.2rem;
  }

  .specimens {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 1rem;
    list-style: none;
  }
  .specimen {
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 0.75rem;
    padding: 0.75rem;
    background:
      linear-gradient(oklch(0.92 0.03 80 / 0.3), oklch(0.92 0.03 80 / 0.3)),
      oklch(0.96 0.02 85);
    border: 1px solid oklch(0.72 0.08 70 / 0.5);
    border-radius: 0.5rem;
    align-items: center;
  }
  .specimen .illustration {
    width: 60px;
    aspect-ratio: 1;
    filter: sepia(0.35) saturate(0.75) contrast(0.92);
  }
  :global(.specimen .illustration svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
  .specimen h4 {
    font-family: var(--font-display);
    font-size: 1.1rem;
    color: oklch(0.35 0.05 80);
    margin-bottom: 0.2rem;
  }
  .specimen .sentence {
    font-family: var(--font-display);
    font-size: 0.75rem;
    font-style: italic;
    color: oklch(0.4 0.02 250);
    line-height: 1.35;
    max-height: 2.7rem;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .specimen .date {
    margin-top: 0.3rem;
    font-size: 0.7rem;
    color: var(--color-sepia);
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }

  /* --- Mobile --- */
  @media (max-width: 640px) {
    .in-bloom h2,
    .pressed-heading {
      font-size: 1.25rem;
    }
    .bloom-list {
      grid-template-columns: 1fr;
      gap: 0.4rem;
    }
    .specimens {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    .specimen {
      grid-template-columns: 52px 1fr;
      gap: 0.6rem;
      padding: 0.6rem;
    }
    .specimen .illustration { width: 52px; }
    .specimen h4 { font-size: 1rem; }
    .specimen .sentence { font-size: 0.72rem; }
    .album header { gap: 0.75rem; margin-bottom: 0.5rem; }
    .album .cover { width: 42px; height: 58px; }
    .album h3 { font-size: 1.1rem; }
  }
</style>
