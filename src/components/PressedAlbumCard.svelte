<script lang="ts">
  // Shareable snapshot of the owner's pressed words. Fixed 1080×1350
  // portrait (4:5, Instagram/WhatsApp-friendly) — mirrors ShareCard.svelte's
  // dimensions so the two social artifacts feel consistent.
  //
  // Rendered off-screen by PressedAlbum's export button, captured via the
  // shared src/lib/share.ts pipeline (html-to-image @ 2×), then downloaded
  // or handed to the Web Share API.
  //
  // All measurements are absolute pixels (not rems) so the export pipeline's
  // computed-style serializer doesn't pick up an inherited root-font-size.

  import type { Card } from "ts-fsrs";
  import { placeholderCoverSrc } from "~/lib/coverFallback";
  import { siteConfig } from "~/site.config";

  interface Word {
    id: string;
    word: string;
    lang: string;
    primaryBookId: string;
  }
  interface Book {
    id: string;
    title: string;
    authors: string;
    coverUrl: string | null;
  }
  interface PressedEntry {
    word: Word;
    card: Card;
    pressedAt: Date;
  }

  interface Props {
    pressed: PressedEntry[];
    booksById: Map<string, Book>;
    /** Max tiles to render in the grid. Older pressings become the "+N
     *  more" footer line. 6 fits a 2×3 grid at 1080×1350 comfortably. */
    maxTiles?: number;
  }

  const { pressed, booksById, maxTiles = 6 }: Props = $props();

  // Tiles are the *most-recently-pressed* entries. The overflow (older
  // pressings) becomes the "and N more" footer line so the card always
  // reads as "what I'm freshly proud of" rather than a historical dump.
  const tiles = $derived(pressed.slice(0, maxTiles));
  const overflow = $derived(Math.max(0, pressed.length - maxTiles));

  // Date range subtitle — earliest → latest pressing. Single pressing =
  // single date. Keeps the range honest to what's actually on the card,
  // not to the full history (which would be misleading).
  const dateRange = $derived.by(() => {
    if (tiles.length === 0) return "";
    const times = tiles.map((t) => t.pressedAt.getTime());
    const earliest = new Date(Math.min(...times));
    const latest = new Date(Math.max(...times));
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    const a = fmt(earliest);
    const b = fmt(latest);
    return a === b ? a : `${a} → ${b}`;
  });

  function bookTitleShort(book: Book | undefined): string {
    if (!book) return "";
    // Keep it punchy for the tile — cards with long titles get truncated
    // via CSS line-clamp, but a hard cap here avoids weird multi-line
    // wraps on short-but-awkward subtitles.
    return book.title.length > 38 ? book.title.slice(0, 36) + "…" : book.title;
  }
</script>

<div class="album-card">
  <!-- Paper texture overlay so the card doesn't read as flat digital. -->
  <div class="paper" aria-hidden="true"></div>

  <!-- Top ornamental band. Mirrors the in-app page-head flourish so the
       social object feels of-a-piece with the site it came from. -->
  <header class="band">
    <div class="ornament" aria-hidden="true">
      <span class="rule"></span>
      <span class="seal">🏵️</span>
      <span class="rule"></span>
    </div>
    <p class="eyebrow">pressed words</p>
    <h1 class="title">{siteConfig.ownerName}&rsquo;s literary garden</h1>
    <p class="subtitle">{dateRange}</p>
  </header>

  <!-- Grid of tiles. 2 columns, up to 3 rows. -->
  <div class="grid">
    {#each tiles as tile (tile.word.id)}
      {@const book = booksById.get(tile.word.primaryBookId)}
      <article class="tile">
        <div class="cover-frame">
          {#if book?.coverUrl}
            <img class="cover" src={book.coverUrl} alt="" />
          {:else if book}
            <img class="cover" src={placeholderCoverSrc(book.id)} alt="" />
          {/if}
        </div>
        <div class="tile-text">
          <h2 class="word" lang={tile.word.lang}>{tile.word.word}</h2>
          <p class="from">{bookTitleShort(book)}</p>
        </div>
      </article>
    {/each}
  </div>

  <!-- Footer: overflow count + garden signature. -->
  <footer class="foot">
    {#if overflow > 0}
      <p class="and-more">
        <em>and {overflow} more, pressed between pages.</em>
      </p>
    {/if}
    <p class="signoff">
      <span class="mark" aria-hidden="true">✦</span>
      a gardener&rsquo;s log
      <span class="mark" aria-hidden="true">✦</span>
    </p>
  </footer>
</div>

<style>
  /* Root card — fixed 1080×1350 portrait. All values in px for
     export-pipeline fidelity. */
  .album-card {
    position: relative;
    width: 1080px;
    height: 1350px;
    box-sizing: border-box;
    padding: 72px 80px 60px;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 32px;
    background:
      radial-gradient(ellipse at 30% 20%, #FBF5E6 0%, #F2E8CE 60%, #E8D9B5 100%);
    color: #2F2A1E;
    font-family: "Cormorant Garamond", Garamond, Georgia, serif;
    overflow: hidden;
  }

  /* Faint noise layer so the cream doesn't render as a flat JPEG. */
  .paper {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, rgba(90, 55, 20, 0.03) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(90deg, rgba(90, 55, 20, 0.02) 0 1px, transparent 1px 4px);
    mix-blend-mode: multiply;
    pointer-events: none;
  }

  /* --- Header band --- */
  .band {
    text-align: center;
    position: relative;
  }
  .ornament {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 22px;
  }
  .ornament .rule {
    flex: 1;
    max-width: 240px;
    height: 1px;
    background: linear-gradient(to right, transparent 0%, #8B5A2B 50%, transparent 100%);
  }
  .ornament .seal {
    font-size: 34px;
    line-height: 1;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.15));
  }
  .eyebrow {
    font-style: italic;
    font-size: 22px;
    letter-spacing: 0.14em;
    color: #5D4A2A;
    margin: 0 0 6px;
    text-transform: lowercase;
  }
  .title {
    font-family: "Cormorant Garamond", Garamond, Georgia, serif;
    font-weight: 500;
    font-style: italic;
    font-size: 58px;
    line-height: 1.05;
    margin: 0;
    color: #34472F;
    letter-spacing: -0.01em;
  }
  .subtitle {
    margin: 14px 0 0;
    font-style: italic;
    font-size: 22px;
    color: #6B5030;
    letter-spacing: 0.02em;
  }

  /* --- Grid --- */
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 26px 32px;
    align-content: start;
  }
  .tile {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 18px;
    align-items: center;
    padding: 18px 20px 18px 18px;
    background: rgba(255, 250, 232, 0.55);
    border: 1px solid rgba(139, 90, 43, 0.25);
    border-radius: 6px;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.4) inset,
      0 2px 6px rgba(90, 55, 20, 0.08);
  }
  .cover-frame {
    width: 120px;
    height: 180px;
    overflow: hidden;
    border-radius: 2px;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(0, 0, 0, 0.06);
  }
  .cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .tile-text {
    min-width: 0; /* allow text to shrink inside grid */
  }
  .word {
    font-family: "Cormorant Garamond", Garamond, Georgia, serif;
    font-weight: 500;
    font-style: italic;
    font-size: 36px;
    line-height: 1.1;
    margin: 0 0 6px;
    color: #34472F;
    letter-spacing: -0.005em;
    /* Prevent overflow for pathological long words. */
    overflow-wrap: break-word;
  }
  .from {
    margin: 0;
    font-family: "Lora", Georgia, serif;
    font-size: 16px;
    color: #6B5030;
    line-height: 1.3;
    /* Two-line clamp: long book titles don't overflow the tile. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* --- Footer --- */
  .foot {
    text-align: center;
  }
  .and-more {
    font-style: italic;
    font-size: 22px;
    color: #6B5030;
    margin: 0 0 14px;
  }
  .signoff {
    font-style: italic;
    font-size: 20px;
    color: #5D4A2A;
    letter-spacing: 0.08em;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }
  .signoff .mark {
    font-style: normal;
    font-size: 14px;
    color: #8B5A2B;
  }
</style>
