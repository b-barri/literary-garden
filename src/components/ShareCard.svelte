<script lang="ts">
  // Rendered at 1080×1350 CSS px (4:5, Instagram/WhatsApp-friendly portrait).
  // Exported at 2× via html-to-image → 2160×2700 PNG. All measurements are
  // absolute pixels (not rems) because the export pipeline serializes the
  // computed style, and root-font-size cascades don't always survive the
  // SVG foreignObject round-trip reliably.
  //
  // This component is mounted hidden off-screen while the modal is open,
  // so the DOM is always available for toBlob() to snapshot. Do not
  // use $effect with intersection observers or window-bound listeners —
  // the element is never visible and must stay inert.

  import type { Book, Quote } from "~/lib/types";
  import { placeholderCoverSrc } from "~/lib/coverFallback";
  import { siteConfig } from "~/site.config";

  interface Props {
    quote: Quote;
    book: Book;
    spineColor: string;
    titleColor: string;
    /** URL for the personal stamp; caller resolves precedence (custom → default). */
    stampSrc: string;
  }

  const { quote, book, spineColor, titleColor, stampSrc }: Props = $props();

  function cleanQuote(raw: string): string {
    return raw.trim().replace(/^["“”'‘’]+/, "").replace(/["“”'‘’]+$/, "");
  }

  const cover = $derived(book.coverUrl ?? placeholderCoverSrc(book.id));
  const bodyText = $derived(cleanQuote(quote.text));

  // Long quotes shrink slightly so they fit without clipping. Tuned
  // against typical Kindle highlight lengths (50 char paragraph through
  // 450 char marathon).
  const fontSizeClass = $derived(
    bodyText.length > 340 ? "compact" :
    bodyText.length > 200 ? "medium" : "roomy"
  );
</script>

<!--
  Card is a flex column so the three zones (header, quote, footer) share the
  1350 px height gracefully: header + footer hug their natural size, the
  quote zone fills the middle and vertically-centres its contents. This
  removes the "void after short quotes" bug the old absolute-footer layout
  had. All dims are px (not rem) so the export pipeline's computed-style
  serializer doesn't pick up an inherited root-font-size.
-->
<div
  class="card {fontSizeClass}"
  style={`--accent: ${spineColor}; --accent-fg: ${titleColor};`}
>
  <!-- Spine stripe — literal extension of the physical book binding. -->
  <div class="spine-stripe" aria-hidden="true"></div>

  <!-- Layered paper texture, no external asset. -->
  <div class="paper-texture" aria-hidden="true"></div>

  <!-- Book row, top. -->
  <header class="book-row">
    <div class="cover-frame">
      <img class="cover" src={cover} alt="" />
    </div>
    <div class="book-meta">
      <p class="eyebrow">from the book</p>
      <p class="book-title">{book.title}</p>
      <p class="book-author">~ {book.authors}</p>
    </div>
  </header>

  <!-- Mid flourish — ties the header to the quote via a hairline + fleur
       in the spine colour. Echoes the page-head flourish on /scrapbook. -->
  <div class="mid-flourish" aria-hidden="true">
    <span class="rule"></span>
    <svg class="fleur" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M12 2 C10 6, 10 8, 7 9 C10 10, 10 12, 12 16 C14 12, 14 10, 17 9 C14 8, 14 6, 12 2 Z M12 16 L12 22"
        fill="currentColor"
        opacity="0.8"
      />
    </svg>
    <span class="rule"></span>
  </div>

  <!-- Quote zone: flex:1, centre-justifies its block children vertically. -->
  <div class="quote-zone">
    <blockquote class="quote-body">
      <span class="mark mark-open" aria-hidden="true">&ldquo;</span><span class="text">{bodyText}</span><span class="mark mark-close" aria-hidden="true">&rdquo;</span>
    </blockquote>
    {#if quote.note}
      <p class="quote-note">
        <span class="note-em" aria-hidden="true">—</span> {quote.note}
      </p>
    {/if}
  </div>

  <!-- Footer: attribution left, stamp right. -->
  <footer class="card-foot">
    <div class="attribution">
      <p class="from">from {siteConfig.ownerName}&rsquo;s literary garden</p>
      <p class="sub">
        {#if quote.page}
          page {quote.page.replace(/^page\s*/i, "")}
        {/if}
        {#if quote.page && quote.location} <span class="dot">·</span> {/if}
        {#if quote.location}
          {quote.location.replace(/^location\s*/i, "loc. ")}
        {/if}
      </p>
    </div>
    <div class="stamp-holder" aria-hidden="true">
      <img class="stamp" src={stampSrc} alt="" />
    </div>
  </footer>
</div>

<style>
  /* Export dimensions are hard-coded in pixels. A parent CSS transform may
     scale the preview, but the export itself reads the computed box. */
  .card {
    position: relative;
    width: 1080px;
    height: 1350px;
    box-sizing: border-box;
    padding: 96px 96px 88px 132px;
    overflow: hidden;
    color: var(--color-ink);
    font-family: var(--font-display), "Cormorant Garamond", "Lora", Georgia, serif;
    /* Flex column so header/quote/footer share vertical space gracefully.
       Short quotes centre in the void; long ones push the footer down
       without overlapping it. */
    display: flex;
    flex-direction: column;
    gap: 0;
    /* Layered cream washes — the paper. */
    background:
      radial-gradient(
        ellipse at 18% 10%,
        oklch(0.97 0.02 85 / 0.95) 0%,
        oklch(0.94 0.025 82 / 0.9) 40%,
        oklch(0.91 0.03 72 / 0.92) 100%
      ),
      linear-gradient(
        180deg,
        oklch(0.97 0.025 90) 0%,
        oklch(0.94 0.03 80) 100%
      );
  }

  /* Watercolour paper texture — layered low-saturation blotches + soft
     vignette. No external image needed so export is fully offline. */
  .paper-texture {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(
        ellipse at 80% 25%,
        oklch(0.82 0.04 260 / 0.16) 0%,
        transparent 55%
      ),
      radial-gradient(
        ellipse at 20% 85%,
        oklch(0.72 0.06 70 / 0.15) 0%,
        transparent 60%
      ),
      radial-gradient(
        ellipse at 60% 50%,
        oklch(0.85 0.05 145 / 0.12) 0%,
        transparent 70%
      ),
      linear-gradient(
        135deg,
        transparent 0%,
        oklch(0.72 0.08 70 / 0.08) 50%,
        transparent 100%
      );
    z-index: 1;
  }

  .spine-stripe {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 24px;
    background:
      linear-gradient(180deg,
        color-mix(in oklab, var(--accent), white 8%),
        var(--accent) 40%,
        color-mix(in oklab, var(--accent), black 12%)
      );
    box-shadow:
      inset -2px 0 4px rgba(0, 0, 0, 0.18),
      inset 2px 0 0 rgba(255, 255, 255, 0.18);
    z-index: 2;
  }

  /* --- Book row, top --- */

  .book-row {
    position: relative;
    z-index: 3;
    display: flex;
    gap: 32px;
    align-items: center;
    flex: 0 0 auto;
  }
  .cover-frame {
    flex: 0 0 auto;
    width: 120px;
    height: 180px;
    border-radius: 2px;
    overflow: hidden;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.5) inset,
      0 14px 28px rgba(0, 0, 0, 0.22),
      0 4px 8px rgba(0, 0, 0, 0.14);
    background: var(--color-cream);
  }
  .cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .book-meta {
    flex: 1 1 auto;
    min-width: 0;
  }
  .eyebrow {
    font-family: "Inter", "Helvetica Neue", system-ui, sans-serif;
    font-size: 13px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 8px;
    font-weight: 500;
    opacity: 0.85;
  }
  .book-title {
    font-family: inherit;
    font-size: 38px;
    font-weight: 500;
    color: var(--color-sage-900);
    letter-spacing: -0.005em;
    line-height: 1.08;
    margin: 0 0 6px;
    /* Prevent a very long title from pushing the quote zone down. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .book-author {
    font-family: inherit;
    font-style: italic;
    font-size: 20px;
    color: var(--color-sepia);
    margin: 0;
    letter-spacing: 0.01em;
  }

  /* --- Mid flourish — hairline + fleur bridging book row to quote. --- */

  .mid-flourish {
    position: relative;
    z-index: 3;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 56px auto 48px;
    width: 280px;
    color: var(--accent);
  }
  .mid-flourish .rule {
    flex: 1 1 auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      currentColor 100%
    );
    opacity: 0.55;
  }
  .mid-flourish .rule:last-child {
    background: linear-gradient(
      90deg,
      currentColor 0%,
      transparent 100%
    );
  }
  .mid-flourish .fleur {
    flex: 0 0 auto;
    display: block;
    opacity: 0.9;
  }

  /* --- Quote zone: flex-1 so it fills the middle. Its contents are
     vertically centred via inner flex, so short quotes don't drift to
     the top and long ones still push close to the footer without
     overlapping it. --- */

  .quote-zone {
    position: relative;
    z-index: 3;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    padding: 0 0 0 0;
    min-height: 0; /* allow flex child to shrink below content height */
  }

  .quote-body {
    font-family: inherit;
    font-style: italic;
    font-weight: 400;
    color: var(--color-ink);
    margin: 0;
    /* `balance` distributes line lengths more evenly across the block —
       avoids orphan trailing lines like "raised their hands." that
       `pretty` was producing with our line widths. */
    text-wrap: balance;
    letter-spacing: 0.002em;
    /* Hanging punctuation: opening mark floats into the left gutter
       without pushing the body text right. */
    text-indent: -0.42em;
  }
  .card.roomy .quote-body { font-size: 46px; line-height: 1.45; }
  .card.medium .quote-body { font-size: 40px; line-height: 1.45; }
  .card.compact .quote-body { font-size: 34px; line-height: 1.4; }

  .mark {
    font-family: inherit;
    font-weight: 500;
    color: var(--accent);
    font-style: normal;
    user-select: none;
  }
  .mark-open {
    /* Inline with the text, subtly oversized. A large mark anchors the
       passage's visual weight and tints the first line with the spine
       colour; the text-indent above pulls the body line flush. */
    font-size: 1.35em;
    line-height: 0.5;
    opacity: 0.85;
    margin-right: 0.04em;
    vertical-align: -0.15em;
  }
  .mark-close {
    font-size: 1.1em;
    opacity: 0.55;
    margin-left: 0.04em;
    vertical-align: -0.1em;
  }

  .quote-note {
    margin: 36px 0 0 0;
    font-family: inherit;
    font-style: italic;
    font-size: 22px;
    line-height: 1.5;
    color: var(--color-sepia);
    max-width: 780px;
    display: flex;
    gap: 12px;
  }
  .quote-note .note-em {
    flex: 0 0 auto;
    color: var(--accent);
    font-style: normal;
    opacity: 0.8;
  }

  /* --- Footer (natural flex child, no longer absolute) --- */

  .card-foot {
    position: relative;
    z-index: 3;
    flex: 0 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 40px;
    padding-top: 32px;
    /* Hairline separator above the footer to visually anchor it. */
    border-top: 1px solid oklch(0.72 0.08 70 / 0.22);
  }
  .attribution {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .from {
    font-family: inherit;
    font-style: italic;
    font-size: 26px;
    color: var(--color-sage-900);
    margin: 0;
    letter-spacing: 0.005em;
    line-height: 1.2;
  }
  .sub {
    font-family: "Inter", system-ui, sans-serif;
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: lowercase;
    color: var(--color-sepia);
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  .sub .dot { margin: 0 6px; opacity: 0.5; }

  .stamp-holder {
    flex: 0 0 auto;
    width: 220px;
    height: 220px;
    position: relative;
  }
  .stamp {
    width: 100%;
    height: 100%;
    object-fit: contain;
    /* Slight rotation and drop-shadow so the stamp reads as pressed into
       paper rather than pasted on top. */
    transform: rotate(-6deg);
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.24));
  }
</style>
