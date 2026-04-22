<script lang="ts">
  import type { Book, Quote } from "~/lib/types";
  import ShareModal from "./ShareModal.svelte";

  interface Props {
    book: Book;
    quotes: Quote[];
    /**
     * Reserved: Phase 3 will use this to visually lift a single featured
     * passage (most-recently pressed, or user-chosen). For Phase 2 every
     * quote is rendered identically, so this prop is currently unused.
     */
    heroQuote?: Quote | null;
    /** CSS colour string — may be a hex (cover-derived) or a var() token. */
    spineColor: string;
    /** Foreground text colour on that background (used by the page head). */
    titleColor: string;
  }

  const { book, quotes, spineColor, titleColor }: Props = $props();

  // Phase 4 will count from localStorage. For Phase 2 the press affordance
  // doesn't exist yet so we show just the highlight count.
  const totalCount = $derived(quotes.length);

  const mostRecent = $derived(
    book.mostRecentHighlightAt
      ? new Date(book.mostRecentHighlightAt).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })
      : null,
  );

  // Short, humane date for each entry's meta row. "oct 9, 2025".
  function formatEntryDate(iso: string): string {
    try {
      // Kindle timestamps are naive-local (no TZ); new Date() is fine since
      // we don't care about tz precision for display.
      return new Date(iso)
        .toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        .toLowerCase();
    } catch {
      return "";
    }
  }

  // Normalise whitespace and strip surrounding quote marks if the Kindle
  // highlight itself happens to include them — we add our own typographic
  // quotation marks around the entry, so doubled quote marks look off.
  function cleanQuote(raw: string): string {
    return raw.trim().replace(/^["“”'‘’]+/, "").replace(/["“”'‘’]+$/, "");
  }

  // --- Share modal wiring ---
  let sharingQuote = $state<Quote | null>(null);
  const isShareOpen = $derived(sharingQuote !== null);

  function openShare(q: Quote) {
    sharingQuote = q;
  }
  function closeShare() {
    sharingQuote = null;
  }
</script>

<section
  class="detail"
  aria-labelledby="detail-title"
  style="--spine-accent: {spineColor}; --spine-title: {titleColor};"
>
  <header class="detail-head">
    <p class="eyebrow" aria-hidden="true">focused book</p>
    <h2 id="detail-title" aria-live="polite">{book.title}</h2>
    <p class="attribution">~ {book.authors}</p>
    <p class="counts">
      <span class="count-main">
        {totalCount} highlight{totalCount === 1 ? "" : "s"}
      </span>
      {#if mostRecent}
        <span class="dot" aria-hidden="true">·</span>
        <span class="recency">last read {mostRecent}</span>
      {/if}
    </p>
  </header>

  <div class="flourish section-flourish" aria-hidden="true">
    <span></span><span class="ornament">✦</span><span></span>
  </div>

  {#if quotes.length > 0}
    <ol class="entries" aria-label="highlights from this book">
      {#each quotes as q, i (q.id)}
        <li class="entry">
          <p class="entry-meta">
            <span class="entry-date">{formatEntryDate(q.highlightedAt)}</span>
            {#if q.page}
              <span class="sep" aria-hidden="true">·</span>
              <span>page {q.page.replace(/^page\s*/i, "")}</span>
            {/if}
            {#if q.location}
              <span class="sep" aria-hidden="true">·</span>
              <span>{q.location.replace(/^location\s*/i, "loc. ")}</span>
            {/if}
          </p>

          <blockquote class="entry-body">
            <span class="mark mark-open" aria-hidden="true">&ldquo;</span>
            <span class="text">{cleanQuote(q.text)}</span>
            <span class="mark mark-close" aria-hidden="true">&rdquo;</span>
          </blockquote>

          {#if q.note}
            <aside class="entry-note">
              <span class="note-em" aria-hidden="true">—</span>
              <span class="note-body">{q.note}</span>
            </aside>
          {/if}

          <div class="entry-actions">
            <button
              class="share-btn"
              type="button"
              aria-label="share this passage"
              onclick={() => openShare(q)}
            >
              <svg class="icon" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M4 10.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5.5M10 3v10m0-10-3.5 3.5M10 3l3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>share</span>
            </button>
          </div>

          {#if i < quotes.length - 1}
            <hr class="entry-sep" aria-hidden="true" />
          {/if}
        </li>
      {/each}
    </ol>
  {:else}
    <p class="empty-quotes">no highlights saved for this book yet.</p>
  {/if}
</section>

{#if sharingQuote}
  <ShareModal
    open={isShareOpen}
    quote={sharingQuote}
    {book}
    {spineColor}
    {titleColor}
    onclose={closeShare}
  />
{/if}

<style>
  .detail {
    max-width: 44rem;
    margin: 2rem auto 0;
    padding: 0 1.5rem;
  }

  .detail-head {
    text-align: center;
    margin-bottom: 1rem;
  }
  .eyebrow {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.72rem;
    color: var(--spine-accent);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 0 0 0.35rem;
    opacity: 0.85;
  }
  h2 {
    font-family: var(--font-display);
    font-size: clamp(1.7rem, 4.2vw, 2.25rem);
    color: var(--color-sage-900);
    letter-spacing: -0.005em;
    margin: 0 0 0.25rem;
    line-height: 1.15;
  }
  .attribution {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--color-sepia);
    font-size: 0.95rem;
    margin: 0 0 0.75rem;
  }
  .counts {
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--color-sepia);
    letter-spacing: 0.14em;
    text-transform: lowercase;
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .counts .dot { margin: 0 0.5rem; opacity: 0.55; }
  .counts .recency { font-style: italic; text-transform: none; letter-spacing: 0.06em; }

  /* Flourish between the book head and the entries — echoes the page head. */
  .section-flourish {
    margin: 1.25rem auto 2.5rem;
    max-width: 14rem;
  }

  /* --- Entries: commonplace-book treatment --- */

  .entries {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .entry {
    position: relative;
    padding: 0.25rem 0 1.75rem;
  }

  /* Meta row — date, page, location in sepia small-caps.
     Sits just above the quote. Tight letterspacing, tabular nums. */
  .entry-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--color-sepia);
    letter-spacing: 0.14em;
    text-transform: lowercase;
    font-variant-numeric: tabular-nums;
    margin: 0 0 0.85rem;
    opacity: 0.85;
  }
  .entry-meta .sep {
    margin: 0 0.55rem;
    opacity: 0.5;
  }
  .entry-date {
    color: var(--color-sage-700);
    font-weight: 500;
  }

  /* Quote body — italic display serif, hanging punctuation.
     The opening mark floats into the left margin in the book's spine
     colour, which ties each passage back to its binding without
     shouting. Max-width is tight enough that lines break at a
     comfortable 55–65 characters — the editorial sweet spot. */
  .entry-body {
    position: relative;
    margin: 0;
    padding: 0 0 0 0;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 400;
    font-size: clamp(1.2rem, 1.15vw + 0.9rem, 1.32rem);
    line-height: 1.6;
    color: var(--color-ink);
    letter-spacing: 0.002em;
  }
  .entry-body .text {
    /* Slight text-wrap hint for nicer line breaks on supporting browsers. */
    text-wrap: pretty;
  }

  /* The leading mark floats into the left margin. On narrow viewports it
     tucks inline instead so the quote body stays flush with the page. */
  .mark {
    font-family: var(--font-display);
    font-style: normal;
    color: var(--spine-accent);
    line-height: 1;
    user-select: none;
  }
  .mark-open {
    position: absolute;
    left: -2.5rem;
    top: -0.35rem;
    font-size: 3.25rem;
    opacity: 0.85;
    /* A tiny rotation + shadow so it reads as printed ink, not screen text. */
    transform: rotate(-4deg);
    text-shadow: 0 1px 0 oklch(0 0 0 / 0.08);
  }
  .mark-close {
    display: inline;
    font-size: 1.05em;
    opacity: 0.5;
    margin-left: 0.05em;
    vertical-align: baseline;
  }

  /* The note — marginalia, italic, indented under the quote with an
     em-dash preamble. Reads like the user is speaking to themselves. */
  .entry-note {
    margin: 0.85rem 0 0 1.5rem;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.9rem;
    line-height: 1.55;
    color: var(--color-sepia);
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    max-width: 34rem;
  }
  .entry-note .note-em {
    flex: 0 0 auto;
    color: var(--spine-accent);
    opacity: 0.7;
    font-style: normal;
    letter-spacing: 0;
  }
  .entry-note .note-body {
    flex: 1 1 auto;
  }

  /* Share action — quiet on desktop (hover-reveal), always visible on touch.
     Positioned below the quote + note; accent colour tints on hover. */
  .entry-actions {
    display: flex;
    margin-top: 0.75rem;
    opacity: 0;
    transition: opacity 180ms ease-out;
  }
  .entry:hover .entry-actions,
  .entry:focus-within .entry-actions {
    opacity: 1;
  }
  /* Touch devices can't hover — always show. */
  @media (hover: none) {
    .entry-actions { opacity: 1; }
  }
  .share-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    /* Hit target ≥ 44×44 for touch per Apple HIG — real padding rather
       than tiny font. Visual size kept modest via small font; the
       invisible hit area is the part that needs to be big. */
    padding: 0.55rem 1rem;
    background: transparent;
    border: 1px solid oklch(0.72 0.08 70 / 0.35);
    border-radius: 999px;
    color: var(--color-sepia);
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: lowercase;
    cursor: pointer;
    min-height: 40px;
    transition:
      background 140ms ease-out,
      color 140ms ease-out,
      border-color 140ms ease-out,
      transform 140ms ease-out;
  }
  .share-btn:hover {
    background: color-mix(in oklab, var(--spine-accent) 12%, transparent);
    color: var(--spine-accent);
    border-color: color-mix(in oklab, var(--spine-accent) 55%, transparent);
    transform: translateY(-1px);
  }
  .share-btn:focus-visible {
    outline: 2px solid var(--color-wisteria-500);
    outline-offset: 2px;
  }
  .share-btn .icon {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
  }
  /* On touch devices, never collapse the share affordance — it's the
     primary "export" signal and must feel first-class, not hover-discovered. */
  @media (hover: none) {
    .share-btn { font-size: 0.85rem; padding: 0.6rem 1.1rem; }
  }

  /* Separator between entries — a thin rule that fades at both ends with
     a tiny ornament in the middle. Echoes the flourish from the page head
     so the rhythm feels cohesive across the page. */
  .entry-sep {
    appearance: none;
    border: none;
    margin: 2rem auto 0.25rem;
    max-width: 14rem;
    height: 0;
    position: relative;
  }
  .entry-sep::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      oklch(0.72 0.08 70 / 0.35) 40%,
      oklch(0.62 0.08 145 / 0.5) 50%,
      oklch(0.72 0.08 70 / 0.35) 60%,
      transparent 100%
    );
  }
  .entry-sep::after {
    content: "✦";
    position: absolute;
    top: -0.45em;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.7rem;
    color: var(--color-sepia);
    background: var(--color-cream);
    padding: 0 0.45rem;
    opacity: 0.6;
  }

  .empty-quotes {
    text-align: center;
    color: var(--color-sepia);
    font-style: italic;
    padding: 2rem 0;
  }

  /* --- Responsive tightening --- */

  @media (max-width: 680px) {
    .detail { padding: 0 1.25rem; }
    .entry-body {
      font-size: 1.05rem;
      line-height: 1.58;
    }
    /* Narrow viewport — inline the opening mark instead of floating left. */
    .mark-open {
      position: static;
      display: inline;
      font-size: 1.35em;
      transform: none;
      margin-right: 0.1em;
      opacity: 0.65;
    }
    .entry-note { margin-left: 1rem; }
  }

  @media (max-width: 420px) {
    .detail { padding: 0 1rem; }
    .entry-meta { font-size: 0.65rem; letter-spacing: 0.12em; }
    .entry-sep { max-width: 10rem; margin: 1.5rem auto; }
  }

  /* --- Reduced motion — the current design has no motion on entries,
     so reduced-motion is already honoured. Kept here as a marker. --- */
</style>
