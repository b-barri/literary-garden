<script lang="ts">
  import type { Card } from "ts-fsrs";
  import WordCard from "./WordCard.svelte";
  import { saveCard } from "~/lib/progress";
  import { buildQueueFromProgress, type QueueItem } from "~/lib/daily";
  import { mastery, type PassiveRating } from "~/lib/scheduler";
  import { assignIllustration, illustrationSvg } from "~/lib/illustration";

  interface Lookup {
    usage: string;
    bookId: string;
    seenAt: string;
  }
  interface Word {
    id: string;
    word: string;
    stem: string;
    lang: string;
    lookups: Lookup[];
    primaryBookId: string;
  }
  interface Book {
    id: string;
    title: string;
    authors: string;
    coverUrl: string | null;
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
    allWords: Word[];
    books: Book[];
    definitions: Record<string, Definition | null>;
  }

  const { allWords, books, definitions }: Props = $props();

  const booksById = new Map(books.map((b) => [b.id, b]));

  let queue: QueueItem<Word>[] = $state([]);
  let currentIndex = $state(0);
  let sessionRated = $state(0);
  let sessionBloomed = $state(0);
  let sessionPressed = $state(0);
  let mounted = $state(false);
  let lastPressedDate: string | null = $state(null);

  $effect(() => {
    queue = buildQueueFromProgress(allWords);
    mounted = true;
  });

  const current = $derived(queue[currentIndex] ?? null);
  const done = $derived(mounted && currentIndex >= queue.length);
  const emptyStart = $derived(mounted && queue.length === 0);

  // Count of already-pressed cards (not in today's queue — they live in /album)
  const pressedCount = $derived.by(() => {
    if (!mounted) return 0;
    let n = 0;
    for (const w of allWords) {
      // Cheap: read from the stored progress we already loaded for queue build.
      // Note: buildQueueFromProgress already loaded localStorage; this re-reads.
      try {
        const raw = window.localStorage.getItem("literary-garden:progress:v1");
        if (!raw) break;
        const parsed = JSON.parse(raw) as { cards?: Record<string, { state: number; stability: number }> };
        const c = parsed.cards?.[w.id];
        if (c && c.state === 2 && c.stability >= 21) n++;
      } catch { return 0; }
    }
    return n;
  });

  function handleRated(nextCard: Card, rating: PassiveRating) {
    if (!current) return;
    const prevMastery = mastery(current.card);
    const newMastery = mastery(nextCard);

    saveCard(current.word.id, nextCard);

    sessionRated++;
    if (prevMastery === "seedling" && newMastery === "bloom") sessionBloomed++;
    if (prevMastery === "bloom" && newMastery === "pressed") {
      sessionPressed++;
      lastPressedDate = nextCard.due.toISOString();
    }

    // Advance. If "again", the card technically becomes due soon — but within the
    // same session we still move on to keep the ritual bounded.
    currentIndex++;
  }

  // Word → its book + illustration + definition
  function assetsFor(word: Word) {
    const book = booksById.get(word.primaryBookId);
    return {
      book,
      illustration: illustrationSvg(assignIllustration(word.id)),
      definition: definitions[word.id] ?? null,
    };
  }

  const todayString = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
</script>

{#if !mounted}
  <p class="loading" aria-live="polite">tending…</p>
{:else if emptyStart}
  <!-- No seedlings + no due reviews — the garden rests -->
  <section class="empty-state rests" aria-live="polite">
    <div class="emoji" aria-hidden="true">🌾</div>
    <h2>the garden rests</h2>
    <p>nothing is due for review today, and there are no new seedlings.</p>
    <p class="small">
      {#if pressedCount > 0}
        {pressedCount} words have graduated to pressed flowers &middot;
        <a href="/album">visit the album</a>
      {:else}
        try again tomorrow.
      {/if}
    </p>
  </section>
{:else if done}
  <!-- Session complete -->
  <section class="empty-state complete" aria-live="polite">
    <div class="emoji" aria-hidden="true">🌸</div>
    <h2>today&rsquo;s garden is tended</h2>
    <p class="summary">
      {sessionRated} card{sessionRated === 1 ? "" : "s"} reviewed
      {#if sessionBloomed > 0}
        &middot; {sessionBloomed} bloomed
      {/if}
      {#if sessionPressed > 0}
        &middot; {sessionPressed} pressed 🏵️
      {/if}
    </p>
    <p class="small">
      see you tomorrow.
      {#if pressedCount > 0}
        &middot; <a href="/album">album</a>
      {/if}
    </p>
  </section>
{:else if current}
  <section class="practice">
    <header class="session-header">
      <p class="date">{todayString}</p>
      <p class="progress">
        {currentIndex + 1} <span class="sep">/</span> {queue.length}
        {#if current.origin === "new"}
          <span class="origin new">🌱 new</span>
        {:else}
          <span class="origin review">🌸 review</span>
        {/if}
      </p>
    </header>
    <div class="card-slot">
      {#key current.word.id}
        {@const assets = assetsFor(current.word)}
        <WordCard
          wordId={current.word.id}
          word={current.word.word}
          stem={current.word.stem}
          lang={current.word.lang}
          lookups={current.word.lookups}
          bookTitle={assets.book?.title ?? ""}
          bookAuthors={assets.book?.authors ?? ""}
          illustrationSvg={assets.illustration}
          coverUrl={assets.book?.coverUrl ?? null}
          definition={assets.definition}
          card={current.card}
          onrated={handleRated}
          captureKeyboard
        />
      {/key}
    </div>
  </section>
{/if}

<style>
  .loading {
    text-align: center;
    color: var(--color-sepia);
    font-style: italic;
    padding: 3rem 0;
  }

  /* --- Practice layout --- */
  .session-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1.25rem;
    font-size: 0.8rem;
  }
  .date {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--color-sepia);
  }
  .progress {
    color: var(--color-sage-700);
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .progress .sep { color: var(--color-sepia); }
  .origin {
    margin-left: 0.25rem;
    padding: 0.1rem 0.45rem;
    background: oklch(0.93 0.04 145 / 0.5);
    border-radius: 999px;
    font-size: 0.7rem;
  }
  .origin.new { background: oklch(0.93 0.04 145 / 0.7); color: var(--color-sage-900); }
  .origin.review { background: oklch(0.95 0.03 20 / 0.7); color: oklch(0.4 0.08 20); }

  .card-slot {
    max-width: 22rem;
    margin: 0 auto;
  }

  /* --- Empty states --- */
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
  }
  .empty-state .emoji {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    filter: drop-shadow(0 2px 2px oklch(0.72 0.08 70 / 0.2));
  }
  .empty-state h2 {
    font-family: var(--font-display);
    font-size: 2rem;
    color: var(--color-sage-900);
    margin-bottom: 0.5rem;
    letter-spacing: -0.01em;
  }
  .empty-state p {
    color: var(--color-ink);
    font-size: 0.95rem;
    margin: 0.25rem 0;
  }
  .empty-state .summary {
    font-family: var(--font-display);
    color: var(--color-sage-700);
    font-size: 1rem;
  }
  .empty-state .small {
    font-size: 0.8rem;
    color: var(--color-sepia);
    margin-top: 1rem;
  }
  .empty-state a {
    color: var(--color-sage-700);
    border-bottom: 1px solid currentColor;
  }
</style>
