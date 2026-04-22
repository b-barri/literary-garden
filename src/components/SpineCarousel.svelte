<script lang="ts">
  import type { Book } from "~/lib/types";
  import type { SpineColor } from "~/lib/spineAesthetic";
  import { resolveSpine } from "~/lib/spineAesthetic";
  import { placeholderCoverSrc } from "~/lib/coverFallback";

  interface Props {
    books: Book[];
    // Palette fallback, parallel-indexed to books. Used when a book has no
    // cover-derived spineColor (placeholders or the rare pale outlier).
    spineColors: SpineColor[];
    focusedIndex: number;
    onfocus: (index: number) => void;
  }

  const { books, spineColors, focusedIndex, onfocus }: Props = $props();

  let scroller: HTMLDivElement | undefined = $state();
  let programmaticScrollInFlight = false;
  let observer: IntersectionObserver | null = null;
  let pendingFocusedIndex = $state(0);
  // Keep the IO-based pending index in sync with external focus changes
  // (arrow clicks, keyboard, URL-hash init) so scrollend-commit doesn't
  // race backwards to an obsolete candidate.
  $effect(() => { pendingFocusedIndex = focusedIndex; });

  // Resolve bg + fg per book once. Pure, so $derived memoises across renders.
  const resolved = $derived(
    books.map((b, i) =>
      resolveSpine(b.id, b.spineColor ?? null, spineColors[i] ?? "var(--color-leather-dark)"),
    ),
  );

  // Smoothly centre the focused spine. Custom easing is handled by CSS on
  // the flex children; we only need to scroll the right item into view.
  $effect(() => {
    if (!scroller) return;
    const el = scroller.querySelector<HTMLButtonElement>(
      `button[data-index="${focusedIndex}"]`,
    );
    if (!el) return;
    programmaticScrollInFlight = true;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setTimeout(() => { programmaticScrollInFlight = false; }, 620);
  });

  $effect(() => {
    if (!scroller) return;
    observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollInFlight) return;
        const centre = scroller!.getBoundingClientRect().left + scroller!.clientWidth / 2;
        let bestIdx = pendingFocusedIndex;
        let bestDist = Infinity;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const rect = entry.boundingClientRect;
          const mid = rect.left + rect.width / 2;
          const dist = Math.abs(mid - centre);
          if (dist < bestDist) {
            bestDist = dist;
            const raw = (entry.target as HTMLElement).dataset.index;
            if (raw != null) bestIdx = parseInt(raw, 10);
          }
        }
        pendingFocusedIndex = bestIdx;
      },
      {
        root: scroller,
        rootMargin: "0px -45% 0px -45%",
        threshold: 0.5,
      },
    );
    const spines = scroller.querySelectorAll("button[data-index]");
    spines.forEach((s) => observer!.observe(s));

    const commit = () => {
      if (programmaticScrollInFlight) return;
      if (pendingFocusedIndex !== focusedIndex) onfocus(pendingFocusedIndex);
    };
    scroller.addEventListener("scrollend", commit);

    return () => {
      observer?.disconnect();
      scroller?.removeEventListener("scrollend", commit);
    };
  });

  function handleKey(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        onfocus(Math.max(0, focusedIndex - 1));
        break;
      case "ArrowRight":
        event.preventDefault();
        onfocus(Math.min(books.length - 1, focusedIndex + 1));
        break;
      case "Home":
        event.preventDefault();
        onfocus(0);
        break;
      case "End":
        event.preventDefault();
        onfocus(books.length - 1);
        break;
    }
  }
</script>

<!-- Inline SVG defs: a turbulence "paper grain" filter sampled across every
     spine + cover. Rendered hidden but reachable via url(#paper-grain). -->
<svg class="svg-defs" aria-hidden="true" focusable="false" width="0" height="0">
  <defs>
    <filter id="paper-grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
      <feDiffuseLighting in="noise" lighting-color="white" surfaceScale="1" result="diff">
        <feDistantLight azimuth="45" elevation="35" />
      </feDiffuseLighting>
      <feComposite in="diff" in2="SourceGraphic" operator="in" />
    </filter>
  </defs>
</svg>

<div class="shelf">
  <button
    class="arrow arrow-prev"
    type="button"
    aria-label="previous book"
    disabled={focusedIndex === 0}
    onclick={() => onfocus(Math.max(0, focusedIndex - 1))}
  >
    <span aria-hidden="true">←</span>
  </button>

  <div
    class="scroller"
    role="tablist"
    aria-label="books in the scrapbook"
    tabindex="-1"
    bind:this={scroller}
    onkeydown={handleKey}
  >
    {#each books as book, i (book.id)}
      {@const palette = resolved[i] ?? { bg: "var(--color-leather-dark)", fg: "var(--color-cream)" }}
      {@const isFocused = i === focusedIndex}
      {@const cover = book.coverUrl ?? placeholderCoverSrc(book.id)}
      <button
        class="book"
        class:focused={isFocused}
        data-index={i}
        role="tab"
        type="button"
        aria-selected={isFocused}
        aria-label={`${book.title} by ${book.authors}, ${book.highlightCount} highlight${book.highlightCount === 1 ? "" : "s"}`}
        tabindex={isFocused ? 0 : -1}
        style={`--bg: ${palette.bg}; --fg: ${palette.fg};`}
        onclick={() => onfocus(i)}
      >
        <!-- Spine face. Hinges on its right edge (rotateY -58deg when open). -->
        <span class="spine" aria-hidden="true">
          <span class="spine-grain"></span>
          <span class="spine-ink-shadow"></span>
          <span class="spine-gild"></span>
          <span class="spine-title">{book.title}</span>
          <span class="spine-count">{book.highlightCount}</span>
        </span>

        <!-- Cover face. Hinges on its left edge (rotateY 88deg when closed). -->
        <span class="cover" aria-hidden="true">
          <span class="cover-fore-edge"></span>
          <img class="cover-art" src={cover} alt="" loading="lazy" />
          <span class="cover-grain"></span>
        </span>

        <!-- Floor shadow, only visible when focused -->
        <span class="book-shadow" aria-hidden="true"></span>
      </button>
    {/each}

    <!-- Spacers to let the first & last book centre in the viewport -->
    <div class="endcap left" aria-hidden="true"></div>
    <div class="endcap right" aria-hidden="true"></div>
  </div>

  <button
    class="arrow arrow-next"
    type="button"
    aria-label="next book"
    disabled={focusedIndex === books.length - 1}
    onclick={() => onfocus(Math.min(books.length - 1, focusedIndex + 1))}
  >
    <span aria-hidden="true">→</span>
  </button>
</div>

<style>
  /* Aesthetic direction: warm library shelf at dusk. Each spine is
     dyed to its cover's dominant tone (build-time sharp histogram).
     Focused book hinges open on its binding — spine rotates -58deg on
     its right edge, cover rotates +28deg on its left edge, sharing one
     perspective parent so the two rotations read as a single rigid
     book opening. Motion is tuned with easeOutExpo for a mechanical
     settle, never a toy bounce. */

  /* Tunable design tokens. Keep the book dimensions named so the spine
     + cover + endcap math stays obvious. */
  .shelf {
    --book-height: 260px;
    --spine-w: 42px;
    --cover-w: 168px;          /* 4× spine, matches Adam Maj's ratio */
    --book-open-w: calc(var(--spine-w) + var(--cover-w));
    --gap: 0px;                /* spines touch, like real books */
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-open: cubic-bezier(0.2, 0.85, 0.3, 1);
    position: relative;
    margin: 1.5rem 0 3rem;
    padding: 0;
  }

  .svg-defs {
    position: absolute;
    left: -9999px;
  }

  /* The scroller keeps a native scroll-snap row; buttons sit within. The
     inner shelf-back draws the wood/paper ground plane behind the books. */
  .scroller {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: var(--gap);
    overflow-x: auto;
    overflow-y: visible;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    scrollbar-width: none;
    -ms-overflow-style: none;
    /* Pad top & bottom so the lifted focused book doesn't clip */
    padding: 3.2rem 0 2rem;
    /* The 3D perspective that makes the hinge read as a real book binding. */
    perspective: 1100px;
    -webkit-perspective: 1100px;
  }
  .scroller::-webkit-scrollbar { display: none; }

  .endcap {
    flex: 0 0 auto;
    width: 50vw;
    height: 1px;
    scroll-snap-align: none;
  }

  /* The original design had a linen "shelf-back" gradient rendered behind
     the books as a ground plane. Removed because Safari's 3D rendering
     context (perspective parent + preserve-3d children) makes z-index
     ambiguous, causing the ground plane to paint OVER the books on iOS.
     The focused-book cast shadow carries enough weight on its own. */

  /* The book — a flex row of spine + cover with a fixed open width. We
     do NOT change the button width; both children always exist in the
     DOM and only rotate. This keeps adjacent books from reflowing when
     one opens. The non-focused book's cover is rotated 88deg edge-on
     so only its hair-thin edge is visible. */
  .book {
    position: relative;
    flex: 0 0 auto;
    width: var(--spine-w);
    height: var(--book-height);
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    scroll-snap-align: center;
    scroll-snap-stop: always;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
    transition: width 620ms var(--ease-open), transform 520ms var(--ease-open);
    z-index: 1;
  }
  .book:focus-visible {
    outline: none;
  }
  .book:focus-visible .spine {
    outline: 2px solid var(--color-wisteria-500);
    outline-offset: 4px;
  }

  /* --- Spine: the always-visible face. --- */
  .spine {
    position: absolute;
    inset: 0;
    width: var(--spine-w);
    height: var(--book-height);
    background: var(--bg);
    color: var(--fg);
    transform-origin: right center;
    transform: translateZ(0) rotateY(0deg);
    transition: transform 560ms var(--ease-open), filter 320ms ease-out;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    box-shadow:
      inset 0 0 0 1px oklch(0 0 0 / 0.15),
      inset 2px 0 0 0 oklch(1 0 0 / 0.09),   /* highlight top-left hair */
      inset -3px 0 6px oklch(0 0 0 / 0.42),   /* deep shadow by binding */
      inset 0 1px 0 oklch(1 0 0 / 0.08),      /* head hairline */
      inset 0 -1px 0 oklch(0 0 0 / 0.3);      /* foot hairline */
    border-radius: 1.5px 2px 2px 1.5px;
    overflow: hidden;
  }

  /* Grain + ink overlays layered on the spine. Using box-shadow-backed
     pseudo elements doesn't compose the turbulence filter, so we stack
     real spans and let the turbulence fuse with the spine background. */
  .spine-grain {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        ellipse at 40% 25%,
        oklch(1 0 0 / 0.06) 0%,
        transparent 55%
      ),
      radial-gradient(
        ellipse at 65% 80%,
        oklch(0 0 0 / 0.18) 0%,
        transparent 60%
      );
    mix-blend-mode: overlay;
    opacity: 0.65;
    pointer-events: none;
  }
  .spine-ink-shadow {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      oklch(1 0 0 / 0.05) 0%,
      transparent 12%,
      transparent 78%,
      oklch(0 0 0 / 0.28) 100%
    );
    pointer-events: none;
  }
  /* Faint gilt line — a single painted strip near the head. */
  .spine-gild {
    position: absolute;
    top: 14%;
    left: 8%;
    right: 8%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      oklch(0.78 0.12 75 / 0.55) 35%,
      oklch(0.9 0.15 82 / 0.75) 50%,
      oklch(0.78 0.12 75 / 0.55) 65%,
      transparent
    );
    filter: blur(0.4px);
    pointer-events: none;
  }

  .spine-title {
    position: absolute;
    top: 14%;
    bottom: 10%;
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.82rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 0 oklch(0 0 0 / 0.3);
    pointer-events: none;
  }
  .spine-count {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-body);
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--fg);
    opacity: 0.55;
    pointer-events: none;
  }

  /* --- Cover: hinges forward from its left edge. --- */
  .cover {
    position: absolute;
    top: 0;
    left: var(--spine-w);
    width: var(--cover-w);
    height: var(--book-height);
    transform-origin: left center;
    /* 88deg = nearly perpendicular, edge-on. Tiny face exposure. */
    transform: translateZ(0) rotateY(88deg);
    transition: transform 620ms var(--ease-open);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
    box-shadow:
      inset 0 0 0 1px oklch(0 0 0 / 0.2),
      inset 1px 0 0 oklch(1 0 0 / 0.08),
      0 10px 20px oklch(0 0 0 / 0.25);
  }
  .cover-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    /* Slight punch so mid-range covers don't go muddy under the dusk
       ambient. Adam Maj's pattern, calmer. */
    filter: brightness(0.96) contrast(1.08) saturate(1.05);
  }
  /* The paper fore-edge — narrow stripes on the right simulating
     page ends. Rendered even when the cover is closed (edge-on) so
     the hair-thin visible edge still reads as paper, not painted wood. */
  .cover-fore-edge {
    position: absolute;
    top: 0;
    right: 0;
    width: 7px;
    height: 100%;
    background: linear-gradient(
      90deg,
      oklch(0 0 0 / 0) 0px,
      oklch(1 0 0 / 0.45) 1px,
      oklch(0.92 0.02 80 / 0.28) 2px,
      oklch(0.95 0.015 80 / 0.32) 3px,
      oklch(1 0 0 / 0) 4px,
      oklch(0 0 0 / 0) 5px,
      oklch(0.92 0.02 80 / 0.28) 6px,
      oklch(0 0 0 / 0) 7px
    );
    pointer-events: none;
    z-index: 2;
  }
  .cover-grain {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at 70% 30%,
      oklch(1 0 0 / 0.05) 0%,
      transparent 60%
    );
    mix-blend-mode: overlay;
    opacity: 0.45;
    pointer-events: none;
  }

  /* --- Focused state — the hinge opens. --- */
  .book.focused {
    width: var(--book-open-w);
    transform: translateZ(24px);
    z-index: 5;
  }
  .book.focused .spine {
    transform: translateZ(0) rotateY(-58deg);
    filter: brightness(0.86) contrast(1.02);
  }
  .book.focused .cover {
    transform: translateZ(0) rotateY(28deg);
  }

  /* Soft cast shadow on the shelf beneath the lifted book. */
  .book-shadow {
    position: absolute;
    left: 50%;
    bottom: -14px;
    transform: translateX(-50%) scaleX(0.9);
    width: var(--book-open-w);
    height: 16px;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at center,
      oklch(0 0 0 / 0.35) 0%,
      oklch(0 0 0 / 0.1) 45%,
      transparent 72%
    );
    opacity: 0;
    transition: opacity 420ms var(--ease), transform 520ms var(--ease-open);
    pointer-events: none;
  }
  .book.focused .book-shadow {
    opacity: 1;
  }

  /* Hover lift — only when not focused. Small and quiet. */
  .book:not(.focused):hover .spine {
    transform: translateY(-4px) rotateY(0deg);
  }

  /* --- Arrow controls. --- */
  .arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid oklch(0.72 0.08 70 / 0.45);
    background: linear-gradient(
      180deg,
      oklch(0.97 0.02 85 / 0.95),
      oklch(0.92 0.03 82 / 0.95)
    );
    color: var(--color-leather-dark);
    font-size: 1rem;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: transform 160ms var(--ease), box-shadow 160ms var(--ease), opacity 160ms;
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.6) inset,
      0 2px 6px oklch(0.22 0.02 250 / 0.15);
  }
  .arrow span {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.15rem;
    line-height: 1;
    transform: translateY(-1px);
  }
  .arrow:hover:not(:disabled) {
    transform: translateY(-50%) scale(1.06);
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.6) inset,
      0 3px 12px oklch(0.22 0.02 250 / 0.22);
  }
  .arrow:focus-visible {
    outline: 2px solid var(--color-wisteria-500);
    outline-offset: 3px;
  }
  .arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .arrow-prev { left: 1.25rem; }
  .arrow-next { right: 1.25rem; }

  /* --- Responsive --- */
  @media (max-width: 640px) {
    .shelf {
      --book-height: 230px;
      --spine-w: 38px;
      --cover-w: 148px;
    }
    .arrow { display: none; }
    .scroller { padding: 2.2rem 0 1.25rem; }
    /* On mobile we skip hover-pre-lift entirely (no mouse), so touch-only
       feedback comes from the hinge open animation on click. */
    .spine-title { font-size: 0.88rem; }
    .count-badge { font-size: 0.68rem; padding: 0.1rem 0.45rem; }
  }

  /* --- Reduced motion --- */
  @media (prefers-reduced-motion: reduce) {
    .scroller { scroll-behavior: auto; }
    .book,
    .spine,
    .cover,
    .book-shadow {
      transition: none;
    }
    .book.focused .spine { transform: none; }
    .book.focused .cover { transform: rotateY(0deg); left: 0; }
    /* In RM mode, fall back to a simpler swap — cover comes straight
       forward without the hinge flourish. Keeps the information hierarchy
       (focused vs unfocused) without the 3D motion. */
  }
</style>
