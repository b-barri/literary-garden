<script lang="ts">
  import type { Card } from "ts-fsrs";
  import { nextState, mastery, type Mastery, type PassiveRating } from "~/lib/scheduler";

  interface Lookup {
    usage: string;
    bookId: string;
    seenAt: string;
  }

  interface DefinitionMeaning {
    partOfSpeech: string;
    definition: string;
    example: string | null;
  }

  interface Definition {
    phonetic: string | null;
    meanings: DefinitionMeaning[];
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
    coverUrl?: string | null;
    definition?: Definition | null;
    card: Card;
    /** Called with the new Card state when user rates. */
    onrated: (nextCard: Card, rating: PassiveRating) => void;
    /** If true, card listens to window keyboard (for single-card practice flow). */
    captureKeyboard?: boolean;
  }

  const {
    wordId,
    word,
    stem,
    lang,
    lookups,
    bookTitle,
    bookAuthors,
    illustrationSvg,
    coverUrl = null,
    definition = null,
    card,
    onrated,
    captureKeyboard = false,
  }: Props = $props();

  let flipped = $state(false);

  // Reset flipped when the card's word changes (Practice flow swaps cards).
  $effect(() => {
    void wordId;
    flipped = false;
  });

  const state: Mastery = $derived(mastery(card));

  const recentLookup = $derived(lookups[0]);
  const shouldPadWithDictExample = $derived(
    !!recentLookup && recentLookup.usage.length < 30,
  );
  const firstMeaning = $derived(definition?.meanings?.[0] ?? null);

  function flip() {
    flipped = !flipped;
  }

  function rate(rating: PassiveRating) {
    const nextCard = nextState(card, rating);
    onrated(nextCard, rating);
    flipped = false;
  }

  function handleKey(event: KeyboardEvent) {
    if (event.defaultPrevented) return;
    // Ignore if focus is on a form element so global shortcuts don't clobber typing.
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

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

  function handleWindowKey(event: KeyboardEvent) {
    if (!captureKeyboard) return;
    handleKey(event);
  }

  const masteryLabel: Record<Mastery, string> = {
    seedling: "🌱 seedling — new",
    bloom: "🌸 in bloom — learning",
    pressed: "🏵️ pressed — mature",
  };
</script>

<svelte:window onkeydown={handleWindowKey} />

<div class="card-scene">
<div
  class="card"
  data-mastery={state}
  data-flipped={flipped}
  tabindex="0"
  role="button"
  aria-pressed={flipped}
  aria-label={`${word}, ${masteryLabel[state]}. Press space to flip.`}
  onkeydown={captureKeyboard ? undefined : handleKey}
  onclick={flip}
>
  <!-- FRONT -->
  <div class="face face-front">
    {#if coverUrl}
      <img class="cover" src={coverUrl} alt="" />
    {/if}
    <div class="illustration" aria-hidden="true">
      {@html illustrationSvg}
    </div>
    <h2 class="word" {lang}>{word}</h2>
    {#if stem !== word}
      <p class="stem" {lang}>/ {stem}</p>
    {/if}
    <p class="book">
      <cite>{bookTitle}</cite>
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

    {#if firstMeaning}
      <div class="definition">
        <p class="phonetic-pos">
          {#if definition?.phonetic}<span class="phonetic">{definition.phonetic}</span>{/if}
          {#if firstMeaning.partOfSpeech}<span class="pos">{firstMeaning.partOfSpeech}</span>{/if}
        </p>
        <p class="meaning">{firstMeaning.definition}</p>
        {#if shouldPadWithDictExample && firstMeaning.example}
          <p class="dict-example"><span class="small-caps">e.g.</span> {firstMeaning.example}</p>
        {/if}
      </div>
    {:else}
      <p class="definition-missing">
        <span class="small-caps">no definition found</span>
      </p>
    {/if}

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
  </div>
</div>
</div>

<style>
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

  .face-front {
    background: var(--color-cream);
    border: 1px solid oklch(0.45 0.07 145 / 0.25);
  }

  .cover {
    position: absolute;
    top: 0.85rem;
    left: 0.85rem;
    width: 40px;
    height: 56px;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: 0 1px 3px oklch(0.22 0.02 250 / 0.18);
    opacity: 0.85;
  }

  .illustration {
    width: 58%;
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

  .card[data-mastery="seedling"] .illustration { filter: grayscale(1) brightness(1.15) opacity(0.55); }
  .card[data-mastery="seedling"] .face-front { background: oklch(0.98 0.01 85); }

  .card[data-mastery="bloom"] .face-front {
    background: var(--color-cream);
    box-shadow: 0 1px 0 oklch(0.62 0.08 145 / 0.4), 0 2px 12px oklch(0.22 0.02 250 / 0.06);
    border-color: oklch(0.62 0.08 145 / 0.5);
  }

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

  /* --- Back face: sentences + definition + ratings --- */
  .sentences blockquote {
    font-family: var(--font-display);
    font-size: 0.95rem;
    line-height: 1.4;
    color: var(--color-ink);
    margin-bottom: 0.4rem;
  }
  .sentences blockquote + blockquote {
    font-size: 0.8rem;
    color: oklch(0.35 0.02 250);
    padding-left: 0.6rem;
    border-left: 2px solid oklch(0.82 0.06 145);
  }

  .definition {
    margin-top: 0.6rem;
    padding: 0.6rem 0.7rem;
    background: oklch(0.93 0.04 145 / 0.35);
    border-radius: 0.4rem;
    border-left: 3px solid oklch(0.62 0.08 145);
  }
  .phonetic-pos {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
    font-size: 0.7rem;
  }
  .phonetic {
    color: var(--color-sepia);
    font-style: italic;
  }
  .pos {
    color: var(--color-sage-700);
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .meaning {
    font-family: var(--font-display);
    font-size: 0.9rem;
    line-height: 1.35;
    color: var(--color-ink);
  }
  .dict-example {
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: oklch(0.4 0.02 250);
    font-style: italic;
  }
  .definition-missing {
    margin-top: 0.6rem;
    padding: 0.5rem;
    color: var(--color-sepia);
    font-size: 0.75rem;
    text-align: center;
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

  @media (prefers-reduced-motion: reduce) {
    .card { transition: none; }
  }
</style>
