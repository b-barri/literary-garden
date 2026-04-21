<script lang="ts">
  import type { Card } from "ts-fsrs";
  import { emptyCard, nextState, mastery, type Mastery, type PassiveRating } from "~/lib/scheduler";
  import { loadCard, saveCard } from "~/lib/progress";

  interface Lookup {
    usage: string;
    bookId: string;
    seenAt: string;
  }

  interface Props {
    wordId: string;
    word: string;
    stem: string;
    lang: string;
    lookups: Lookup[];
    bookTitle: string;
    bookAuthors: string;
    illustrationSvg: string;
  }

  const { wordId, word, stem, lang, lookups, bookTitle, bookAuthors, illustrationSvg }: Props = $props();

  let card: Card = $state(emptyCard());
  let flipped = $state(false);
  let storageOk = $state(true);

  // Load card state on mount (client-only — progress store guards SSR).
  $effect(() => {
    card = loadCard(wordId);
    const onStorageFailed = () => { storageOk = false; };
    window.addEventListener("garden:storage-failed", onStorageFailed);
    return () => window.removeEventListener("garden:storage-failed", onStorageFailed);
  });

  const state: Mastery = $derived(mastery(card));

  // Strip the "(Author) (Z-Library)" noise that sideloaded titles drag in.
  const cleanTitle: string = $derived(
    bookTitle
      .replace(/\s*\(Z-Library\)\s*$/i, "")
      .replace(/\s*\([^()]*\)\s*$/, "")
      .trim(),
  );

  const recentLookup = $derived(lookups[0]);

  function flip() {
    flipped = !flipped;
  }

  function rate(rating: PassiveRating) {
    card = nextState(card, rating);
    saveCard(wordId, card);
    flipped = false; // return to the front so the new mastery state is visible
  }

  function handleKey(event: KeyboardEvent) {
    // Ignore if a ratings button is focused — it has its own handlers
    if (event.defaultPrevented) return;
    switch (event.key) {
      case " ":
      case "Enter":
        event.preventDefault();
        flip();
        break;
      case "1":
        if (flipped) { event.preventDefault(); rate("again"); }
        break;
      case "2":
        if (flipped) { event.preventDefault(); rate("hard"); }
        break;
      case "3":
        if (flipped) { event.preventDefault(); rate("good"); }
        break;
    }
  }

  const masteryLabel: Record<Mastery, string> = {
    seedling: "🌱 seedling — new",
    bloom: "🌸 in bloom — learning",
    pressed: "🏵️ pressed — mature",
  };
</script>

<div class="card-scene">
<div
  class="card"
  data-mastery={state}
  data-flipped={flipped}
  tabindex="0"
  role="button"
  aria-pressed={flipped}
  aria-label={`${word}, ${masteryLabel[state]}. Press space to flip.`}
  onkeydown={handleKey}
  onclick={flip}
>
  <!-- FRONT -->
  <div class="face face-front">
    <div class="illustration" aria-hidden="true">
      {@html illustrationSvg}
    </div>
    <h2 class="word" {lang}>{word}</h2>
    {#if stem !== word}
      <p class="stem" {lang}>/ {stem}</p>
    {/if}
    <p class="book">
      <cite>{cleanTitle}</cite>
      {#if bookAuthors}<span class="dim">&middot; {bookAuthors}</span>{/if}
    </p>
    <span class="mastery-glyph" aria-hidden="true">
      {#if state === "seedling"}🌱{/if}
      {#if state === "bloom"}🌸{/if}
      {#if state === "pressed"}🏵️{/if}
    </span>
  </div>

  <!-- BACK -->
  <div class="face face-back">
    <div class="sentences" {lang}>
      {#each lookups as lookup, i (lookup.seenAt + i)}
        <blockquote>&ldquo;{lookup.usage}&rdquo;</blockquote>
      {/each}
    </div>
    <p class="definition-placeholder">
      <span class="small-caps">definition</span><br />
      fetched in phase 3 from dictionaryapi.dev
    </p>
    <div class="ratings" role="group" aria-label="rate your recall">
      <button type="button" class="rate again" onclick={(e) => { e.stopPropagation(); rate("again"); }}>
        <span class="num">1</span><span class="lbl">didn&rsquo;t know</span>
      </button>
      <button type="button" class="rate hard" onclick={(e) => { e.stopPropagation(); rate("hard"); }}>
        <span class="num">2</span><span class="lbl">blurry</span>
      </button>
      <button type="button" class="rate good" onclick={(e) => { e.stopPropagation(); rate("good"); }}>
        <span class="num">3</span><span class="lbl">knew it</span>
      </button>
    </div>
    {#if !storageOk}
      <p class="storage-warning" role="alert">
        progress can&rsquo;t be saved in this browser &middot; ratings won&rsquo;t persist
      </p>
    {/if}
  </div>
</div>
</div>

<style>
  /* Scene — gives the card 3D perspective so rotateY actually rotates instead
     of flattening into a 2D mirror (which would reveal both faces at once). */
  .card-scene {
    perspective: 1200px;
    width: 100%;
    aspect-ratio: 3 / 4;
  }
  .card {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 1rem;
    cursor: pointer;
    transform-style: preserve-3d;
    transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
    text-align: left;
    outline: none;
  }
  .card:focus-visible {
    box-shadow: 0 0 0 3px oklch(0.62 0.08 145 / 0.5);
  }
  .card[data-flipped="true"] {
    transform: rotateY(180deg);
  }

  .face {
    position: absolute;
    inset: 0;
    padding: 1.25rem 1.25rem 1rem;
    border-radius: inherit;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .face-back {
    transform: rotateY(180deg);
    background: var(--color-cream);
    border: 1px solid oklch(0.45 0.07 145 / 0.25);
    color: var(--color-ink);
  }

  /* Front base */
  .face-front {
    background: var(--color-cream);
    border: 1px solid oklch(0.45 0.07 145 / 0.25);
  }

  .illustration {
    width: 60%;
    aspect-ratio: 1;
    align-self: center;
    margin-top: 0.25rem;
  }
  :global(.illustration svg) {
    width: 100%;
    height: 100%;
    display: block;
  }

  .word {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 3vw, 2rem);
    color: var(--color-sage-900);
    text-align: center;
    margin-top: 0.5rem;
    letter-spacing: -0.01em;
  }
  .stem {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.9rem;
    color: var(--color-sepia);
    text-align: center;
    margin-top: 0.125rem;
  }
  .book {
    font-size: 0.75rem;
    color: var(--color-sepia);
    text-align: center;
    margin-top: auto;
    padding-top: 0.75rem;
    font-style: italic;
  }
  .book cite { font-style: italic; }
  .book .dim { opacity: 0.7; }

  .mastery-glyph {
    position: absolute;
    top: 0.75rem;
    right: 0.85rem;
    font-size: 1.25rem;
    line-height: 1;
    filter: drop-shadow(0 1px 0 oklch(1 0 0));
  }

  /* --- Mastery-state treatments --- */

  /* 🌱 Seedling: washed-out, ink-outline feel */
  .card[data-mastery="seedling"] .illustration { filter: grayscale(1) brightness(1.15) opacity(0.55); }
  .card[data-mastery="seedling"] .face-front { background: oklch(0.98 0.01 85); }

  /* 🌸 In bloom: fully-colored, cream page, sage accents */
  .card[data-mastery="bloom"] .face-front {
    background: var(--color-cream);
    box-shadow: 0 1px 0 oklch(0.62 0.08 145 / 0.4), 0 2px 12px oklch(0.22 0.02 250 / 0.06);
    border-color: oklch(0.62 0.08 145 / 0.5);
  }

  /* 🏵️ Pressed: parchment, sepia wash, gold hairline */
  .card[data-mastery="pressed"] .illustration {
    filter: sepia(0.35) saturate(0.75) contrast(0.92);
  }
  .card[data-mastery="pressed"] .face-front {
    background:
      linear-gradient(oklch(0.92 0.03 80 / 0.5), oklch(0.92 0.03 80 / 0.5)),
      radial-gradient(ellipse at top, oklch(0.95 0.03 85) 0%, oklch(0.92 0.03 80) 100%);
    border: 1px solid oklch(0.72 0.08 70);
    box-shadow:
      inset 0 0 0 1px oklch(0.82 0.08 80),
      0 1px 0 oklch(0.72 0.08 70 / 0.4),
      0 2px 8px oklch(0.22 0.02 250 / 0.08);
  }
  .card[data-mastery="pressed"] .word { color: oklch(0.35 0.05 80); }

  /* --- Back face: sentences + ratings --- */
  .sentences blockquote {
    font-family: var(--font-display);
    font-size: 1rem;
    line-height: 1.4;
    color: var(--color-ink);
    margin-bottom: 0.5rem;
  }
  .sentences blockquote + blockquote {
    font-size: 0.85rem;
    color: oklch(0.35 0.02 250);
    padding-left: 0.6rem;
    border-left: 2px solid oklch(0.82 0.06 145);
  }
  .definition-placeholder {
    font-size: 0.75rem;
    color: var(--color-sepia);
    font-style: italic;
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: oklch(0.93 0.04 145 / 0.4);
    border-radius: 0.4rem;
  }
  .small-caps {
    font-variant: small-caps;
    letter-spacing: 0.08em;
    font-style: normal;
  }

  .ratings {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
    margin-top: auto;
    padding-top: 0.5rem;
  }
  .rate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.5rem 0.25rem;
    background: oklch(0.97 0.02 145);
    border: 1px solid oklch(0.62 0.08 145 / 0.35);
    border-radius: 0.5rem;
    color: var(--color-ink);
    font-family: var(--font-body);
    cursor: pointer;
    transition: background-color 0.15s, transform 0.1s;
  }
  .rate:hover { background: oklch(0.93 0.04 145); }
  .rate:active { transform: translateY(1px); }
  .rate.again:hover { background: oklch(0.9 0.04 20); }
  .rate.good:hover  { background: oklch(0.9 0.04 145); }
  .rate .num {
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--color-sage-700);
  }
  .rate .lbl {
    font-size: 0.7rem;
    color: var(--color-sepia);
  }
  .storage-warning {
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: oklch(0.52 0.13 20);
    text-align: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .card { transition: none; }
  }
</style>
