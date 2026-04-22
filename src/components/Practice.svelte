<script lang="ts">
  import type { Card } from "ts-fsrs";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import WordCard from "./WordCard.svelte";
  import SessionLengthPicker from "./SessionLengthPicker.svelte";
  import { saveCard } from "~/lib/progress";
  import { buildQueueFromProgress, type QueueItem } from "~/lib/daily";
  import { mastery, type PassiveRating } from "~/lib/scheduler";
  import { assignIllustration, illustrationSvg } from "~/lib/illustration";
  import { saveSession, makeSessionId } from "~/lib/sessions";

  const SESSION_LENGTH_KEY = "literary-garden:session-length:v1";
  const ONBOARDING_KEY = "literary-garden:onboarding-seen-at:v1";

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
  const noop = () => {};

  let queue: QueueItem<Word>[] = $state([]);
  let currentIndex = $state(0);
  let sessionRated = $state(0);
  let sessionBloomed = $state(0);
  let sessionPressed = $state(0);
  let mounted = $state(false);
  let lastPressedDate: string | null = $state(null);

  // Session length control — picker shows until a length is chosen.
  let chosenLength = $state<number | null>(null);
  let rememberedLength = $state<number | null>(null);
  let fullQueueLength = $state(0);

  // Onboarding — shown exactly once, on first visit with seedlings waiting.
  let onboardingSeenAt = $state<string | null>(null);

  // Session logging — fires exactly once when the session completes.
  let sessionLogged = $state(false);

  // Words that bloomed in this session — shown on the complete screen so the
  // user can see where their work went before they vanish from the deck.
  let bloomedThisSession: Array<{ word: Word; rating: PassiveRating }> = $state([]);

  $effect(() => {
    // IMPORTANT: read from the local `built` binding, NOT `queue`, to avoid a
    // self-referential tracked read that would re-fire this effect forever.
    const built = buildQueueFromProgress(allWords);
    queue = built;
    fullQueueLength = built.length;
    try {
      const raw = window.localStorage.getItem(SESSION_LENGTH_KEY);
      if (raw) rememberedLength = parseInt(raw, 10) || null;
    } catch {
      // ignore
    }
    try {
      onboardingSeenAt = window.localStorage.getItem(ONBOARDING_KEY);
    } catch {
      // ignore — absence just means we'll show onboarding this visit
    }
    mounted = true;
  });

  function finishOnboarding() {
    const now = new Date().toISOString();
    onboardingSeenAt = now;
    try {
      window.localStorage.setItem(ONBOARDING_KEY, now);
    } catch {
      // storage refused — still proceed, they just might see it again next visit
    }
  }

  function handleLengthChoose(length: number) {
    chosenLength = length;
    queue = queue.slice(0, length);
    try {
      window.localStorage.setItem(SESSION_LENGTH_KEY, String(length));
    } catch {
      // ignore
    }
  }

  // First-time welcome screen. Only shown when there are seedlings to greet with
  // and the user hasn't seen it before. Sets onboardingSeenAt when dismissed.
  const needsOnboarding = $derived(
    mounted && allWords.length > 0 && onboardingSeenAt === null,
  );

  // Picker is active iff the session has started (mounted) with cards available
  // but the user hasn't chosen a length yet.
  const needsLengthChoice = $derived(
    mounted && !needsOnboarding && fullQueueLength > 0 && chosenLength === null,
  );

  const current = $derived(queue[currentIndex] ?? null);
  const done = $derived(mounted && currentIndex >= queue.length);
  const emptyStart = $derived(mounted && queue.length === 0);

  // Persist the session log as soon as the session reaches "done" — exactly once.
  $effect(() => {
    if (!done || sessionLogged || sessionRated === 0) return;
    // Which book contributed the most words this session?
    const bookCounts = new Map<string, number>();
    for (const entry of bloomedThisSession) {
      const bid = entry.word.primaryBookId;
      bookCounts.set(bid, (bookCounts.get(bid) ?? 0) + 1);
    }
    let dominantBookId: string | null = null;
    let max = 0;
    for (const [bid, n] of bookCounts) {
      if (n > max) { max = n; dominantBookId = bid; }
    }
    saveSession({
      id: makeSessionId(),
      completedAt: new Date().toISOString(),
      wordsReviewed: sessionRated,
      wordsBloomed: sessionBloomed,
      wordsPressed: sessionPressed,
      dominantBookId,
      wordIds: bloomedThisSession.map((e) => e.word.id),
    });
    sessionLogged = true;
  });

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

    // Record for the session-complete screen regardless of state change —
    // the user wants to see what they just worked on.
    bloomedThisSession.push({ word: current.word, rating });

    // Advance. If "again", the card technically becomes due soon — but within the
    // same session we still move on to keep the ritual bounded.
    currentIndex++;
  }

  // Garden status counters for the complete + empty screens.
  const gardenStatus = $derived.by(() => {
    if (!mounted) return { seedlings: allWords.length, bloom: 0, pressed: 0 };
    let seedlings = 0, bloom = 0, pressed = 0;
    try {
      const raw = window.localStorage.getItem("literary-garden:progress:v1");
      const cards = raw ? (JSON.parse(raw) as { cards?: Record<string, { state: number; stability: number }> }).cards ?? {} : {};
      for (const w of allWords) {
        const c = cards[w.id];
        if (!c) { seedlings++; continue; }
        if (c.state === 2 && c.stability >= 21) pressed++;
        else if (c.state === 0) seedlings++;
        else bloom++;
      }
    } catch {
      return { seedlings: allWords.length, bloom: 0, pressed: 0 };
    }
    return { seedlings, bloom, pressed };
  });

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
{:else if needsOnboarding}
  <section class="onboarding" aria-labelledby="onboarding-title">
    <div class="emoji" aria-hidden="true">🌱</div>
    <h2 id="onboarding-title">welcome to your garden</h2>
    <p class="lede">
      {allWords.length} seedling{allWords.length === 1 ? "" : "s"} waiting —
      the words you looked up on your Kindle, ready to be revisited.
    </p>

    <dl class="states-intro">
      <div>
        <dt><span aria-hidden="true">🌱</span> seedling</dt>
        <dd>a word you haven't reviewed yet.</dd>
      </div>
      <div>
        <dt><span aria-hidden="true">🌸</span> in bloom</dt>
        <dd>actively learning — you'll meet it again soon.</dd>
      </div>
      <div>
        <dt><span aria-hidden="true">🏵️</span> pressed</dt>
        <dd>known well, resting in <a href="/garden">the garden</a>.</dd>
      </div>
    </dl>

    <p class="rhythm">
      five new words a day is the rhythm. no streaks, no badges — just a small
      ritual you return to.
    </p>

    <button type="button" class="begin" onclick={finishOnboarding}>
      begin
    </button>

    <p class="small">
      <a href="/about">more about this garden →</a>
    </p>
  </section>
{:else if needsLengthChoice}
  <SessionLengthPicker
    available={fullQueueLength}
    rememberedLength={rememberedLength}
    onchoose={handleLengthChoose}
  />
{:else if emptyStart}
  <!-- No seedlings + no due reviews — the garden rests -->
  <section class="empty-state rests" aria-live="polite">
    <div class="emoji" aria-hidden="true">🌾</div>
    <h2>the garden rests</h2>
    <p>nothing is due for review today, and there are no new seedlings.</p>
    <p class="small">
      {#if pressedCount > 0}
        {pressedCount} words have graduated to pressed flowers &middot;
        <a href="/garden">visit the garden</a>
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
        &middot; {sessionBloomed} bloomed 🌸
      {/if}
      {#if sessionPressed > 0}
        &middot; {sessionPressed} pressed 🏵️
      {/if}
    </p>

    {#if bloomedThisSession.length > 0}
      <ul class="tended-list">
        {#each bloomedThisSession as entry (entry.word.id)}
          <li>
            <span class="glyph" aria-hidden="true">
              {#if entry.rating === "good"}🌸{:else if entry.rating === "hard"}🌿{:else}🌱{/if}
            </span>
            <span class="w" lang={entry.word.lang}>{entry.word.word}</span>
            <span class="r">{entry.rating === "good" ? "knew it" : entry.rating === "hard" ? "blurry" : "didn't know"}</span>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="garden-status">
      <div>
        <span class="num">{gardenStatus.seedlings}</span>
        <span class="lbl">🌱 seedlings waiting</span>
      </div>
      <div>
        <span class="num">{gardenStatus.bloom}</span>
        <span class="lbl">🌸 in bloom</span>
      </div>
      <div>
        <span class="num">{gardenStatus.pressed}</span>
        <span class="lbl">🏵️ pressed</span>
      </div>
    </div>

    <p class="rhythm">
      five new words a day is the garden&rsquo;s rhythm &mdash;
      {#if gardenStatus.seedlings > 0}
        {gardenStatus.seedlings} more seedling{gardenStatus.seedlings === 1 ? "" : "s"} will be
        introduced over the next {Math.ceil(gardenStatus.seedlings / 5)} day{gardenStatus.seedlings <= 5 ? "" : "s"}.
      {:else}
        every word has met the light. from here, the garden is about depth, not breadth.
      {/if}
    </p>

    <p class="small">
      come back tomorrow.
      {#if gardenStatus.pressed > 0}
        &middot; <a href="/garden">visit the garden</a>
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
      <div class="stack">
        {#each queue.slice(currentIndex, currentIndex + 3) as item, slotIdx (item.word.id)}
          {@const assets = assetsFor(item.word)}
          <div
            class="stack-slot"
            data-slot={slotIdx}
            aria-hidden={slotIdx !== 0}
            in:fly={{ y: 32, duration: 280, easing: cubicOut }}
          >
            <WordCard
              wordId={item.word.id}
              word={item.word.word}
              stem={item.word.stem}
              lang={item.word.lang}
              lookups={item.word.lookups}
              bookId={assets.book?.id ?? item.word.primaryBookId}
              bookTitle={assets.book?.title ?? ""}
              bookAuthors={assets.book?.authors ?? ""}
              illustrationSvg={assets.illustration}
              coverUrl={assets.book?.coverUrl ?? null}
              definition={assets.definition}
              card={item.card}
              onrated={slotIdx === 0 ? handleRated : noop}
              captureKeyboard={slotIdx === 0}
            />
          </div>
        {/each}
      </div>
    </div>

    <p class="swipe-hint" aria-hidden="true">
      tap to flip · swipe <span class="arr">←</span> didn&rsquo;t know · <span class="arr">→</span> knew it
    </p>
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
    font-size: 0.92rem;
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
  /* Origin pill — a tiny leather tab with a gold-foil glyph */
  .origin {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-left: 0.35rem;
    padding: 0.22rem 0.65rem 0.24rem;
    background: linear-gradient(180deg, var(--color-leather-mid) 0%, var(--color-leather-dark) 100%);
    border: 1px solid var(--color-leather-dark);
    border-radius: 4px;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.82rem;
    color: var(--color-gold-light);
    letter-spacing: 0.02em;
    box-shadow:
      0 1px 0 rgba(255, 224, 168, 0.15) inset,
      0 -1px 0 rgba(0, 0, 0, 0.35) inset;
  }
  .origin.new { color: var(--color-gold-light); }
  .origin.review { color: var(--color-gold); }

  .card-slot {
    max-width: 22rem;
    margin: 0 auto;
    width: 100%;
    /* Give the fanned-out side cards room to breathe beyond the centre width. */
    padding: 0.5rem 2.5rem 1.5rem;
    box-sizing: content-box;
    /* JS swipe handlers own all touch gestures on the card — no browser
       scroll-chaining interpolation. Applied up the ancestor chain so no
       iOS layer intercepts before the card itself. */
    touch-action: none;
  }

  /* Card-deck stack — current card centered, next two fanned behind.
     Each slot is absolutely positioned; Svelte keys by word.id so DOM persists
     as cards slide between slots, letting CSS transition the transform. */
  .stack {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    touch-action: none;
  }
  .stack-slot {
    position: absolute;
    inset: 0;
    transition:
      transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.42s ease-out;
    transform-origin: 50% 65%;
    will-change: transform;
    touch-action: none;
  }
  /* Back-left peek */
  .stack-slot[data-slot="2"] {
    transform: translate(-26%, 3%) rotate(-9deg) scale(0.9);
    z-index: 1;
    opacity: 0.82;
    pointer-events: none;
    filter: brightness(0.96);
  }
  /* Back-right peek */
  .stack-slot[data-slot="1"] {
    transform: translate(26%, 3%) rotate(9deg) scale(0.9);
    z-index: 2;
    opacity: 0.9;
    pointer-events: none;
    filter: brightness(0.98);
  }
  /* Front — the interactive card */
  .stack-slot[data-slot="0"] {
    transform: translate(0, 0) rotate(0deg) scale(1);
    z-index: 3;
    opacity: 1;
  }

  /* Discoverability hint for the swipe gesture — quiet, under the card */
  .swipe-hint {
    max-width: 22rem;
    margin: 1rem auto 0;
    text-align: center;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.88rem;
    color: var(--color-sepia);
    opacity: 0.75;
    line-height: 1.5;
  }
  .swipe-hint .arr {
    color: var(--color-sage-700);
    font-style: normal;
    font-weight: 500;
    padding: 0 0.05rem;
  }

  @media (max-width: 640px) {
    .session-header {
      font-size: 0.92rem;
      margin-bottom: 0.6rem;
    }
    .card-slot {
      max-width: 100%;
      padding: 0.4rem 1rem 0.8rem;
    }
    /* Shorter + narrower card on mobile. Aspect 3:3.6 (was 3:4) reduces
       total height; max-width caps horizontal size so the card sits
       comfortably inside the viewport even on large phones. A max-height
       based on dvh prevents the card from ever exceeding the space
       between header and rating buttons — no scrolling to reveal the
       bottom of the card on iPhone-14-class screens. */
    .stack {
      aspect-ratio: 3 / 3.6;
      max-width: 18rem;
      max-height: 58dvh;
      margin: 0 auto;
    }
    /* Tighter fan so side-peek cards don't clip viewport edges. */
    .stack-slot[data-slot="2"] {
      transform: translate(-14%, 2.5%) rotate(-6deg) scale(0.88);
    }
    .stack-slot[data-slot="1"] {
      transform: translate(14%, 2.5%) rotate(6deg) scale(0.88);
    }
    .swipe-hint {
      max-width: 100%;
      font-size: 0.9rem;
      margin-top: 0.65rem;
    }
  }
  /* Very narrow devices — iPhone SE, older Androids. Push card to edge. */
  @media (max-width: 380px) {
    .card-slot {
      padding: 0.25rem 0.5rem 0.6rem;
    }
    .stack {
      aspect-ratio: 3 / 3.8;
    }
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

  .tended-list {
    max-width: 22rem;
    margin: 1.25rem auto;
    list-style: none;
    text-align: left;
    background: oklch(0.93 0.04 145 / 0.25);
    border-left: 3px solid oklch(0.62 0.08 145 / 0.6);
    border-radius: 0.3rem;
    padding: 0.75rem 1rem;
  }
  .tended-list li {
    display: grid;
    grid-template-columns: 1.3rem 1fr auto;
    gap: 0.5rem;
    align-items: baseline;
    padding: 0.2rem 0;
    font-size: 0.9rem;
  }
  .tended-list li + li {
    border-top: 1px dashed oklch(0.62 0.08 145 / 0.3);
  }
  .tended-list .glyph { font-size: 0.9rem; line-height: 1; }
  .tended-list .w {
    font-family: var(--font-display);
    color: var(--color-sage-900);
  }
  .tended-list .r {
    font-size: 0.75rem;
    color: var(--color-sepia);
    font-style: italic;
  }

  .garden-status {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    max-width: 22rem;
    margin: 1.25rem auto 0.5rem;
    padding: 0.75rem;
    background: var(--color-cream);
    border: 1px solid oklch(0.82 0.06 145 / 0.5);
    border-radius: 0.5rem;
  }
  .garden-status div {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }
  .garden-status .num {
    font-family: var(--font-display);
    font-size: 1.4rem;
    color: var(--color-sage-900);
    line-height: 1;
  }
  .garden-status .lbl {
    font-size: 0.65rem;
    color: var(--color-sepia);
    text-align: center;
  }
  .rhythm {
    max-width: 26rem;
    margin: 0.75rem auto 0;
    font-size: 0.85rem;
    font-style: italic;
    color: var(--color-sepia);
    line-height: 1.5;
  }

  /* --- Onboarding (first-visit only) --- */
  .onboarding {
    max-width: 30rem;
    margin: 1.5rem auto;
    padding: 1.75rem 1.5rem;
    text-align: center;
    background: var(--color-cream);
    border: 1px solid oklch(0.72 0.08 70 / 0.4);
    border-radius: 0.5rem;
    box-shadow: 0 2px 18px oklch(0.22 0.02 250 / 0.06);
  }
  .onboarding .emoji {
    font-size: 2.5rem;
    margin-bottom: 0.25rem;
    filter: drop-shadow(0 2px 2px oklch(0.62 0.08 145 / 0.25));
  }
  .onboarding h2 {
    font-family: var(--font-display);
    font-size: 1.75rem;
    color: var(--color-sage-900);
    margin: 0 0 0.5rem;
    letter-spacing: -0.01em;
  }
  .onboarding .lede {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--color-sepia);
    font-size: 1rem;
    margin: 0 0 1.25rem;
  }
  .states-intro {
    display: grid;
    gap: 0.4rem;
    margin: 1rem auto 1.25rem;
    max-width: 22rem;
    padding: 0;
    text-align: left;
  }
  .states-intro > div {
    display: grid;
    grid-template-columns: 8.5rem 1fr;
    align-items: baseline;
    gap: 0.6rem;
    padding: 0.3rem 0.5rem;
    border-radius: 0.3rem;
  }
  .states-intro > div:nth-child(1) { background: oklch(0.97 0.02 85 / 0.5); }
  .states-intro > div:nth-child(2) { background: oklch(0.93 0.04 145 / 0.3); }
  .states-intro > div:nth-child(3) { background: oklch(0.94 0.04 85 / 0.55); }
  .states-intro dt {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--color-sage-900);
    font-size: 0.92rem;
  }
  .states-intro dt span {
    font-style: normal;
    margin-right: 0.3rem;
  }
  .states-intro dd {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-ink);
  }
  .states-intro dd a {
    color: var(--color-sage-700);
    border-bottom: 1px solid currentColor;
  }
  .onboarding .rhythm {
    max-width: 26rem;
    margin: 0.5rem auto 1.5rem;
    font-size: 0.88rem;
    font-style: italic;
    color: var(--color-sepia);
    line-height: 1.55;
  }
  .onboarding .begin {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.05rem;
    padding: 0.55rem 2.2rem;
    background: linear-gradient(180deg,
      oklch(0.62 0.08 145) 0%,
      oklch(0.52 0.08 145) 100%);
    color: var(--color-cream);
    border: 1px solid oklch(0.42 0.08 145);
    border-radius: 0.4rem;
    cursor: pointer;
    letter-spacing: 0.02em;
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.2) inset,
      0 2px 8px oklch(0.42 0.08 145 / 0.3);
    transition: transform 140ms ease-out, box-shadow 140ms ease-out;
  }
  .onboarding .begin:hover {
    transform: translateY(-1px);
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.2) inset,
      0 4px 14px oklch(0.42 0.08 145 / 0.35);
  }
  .onboarding .begin:focus-visible {
    outline: 2px solid oklch(0.62 0.14 300 / 0.55);
    outline-offset: 3px;
  }
  .onboarding .small {
    margin: 1rem 0 0;
    font-size: 0.8rem;
    color: var(--color-sepia);
  }
  .onboarding .small a {
    color: var(--color-sage-700);
    border-bottom: 1px solid currentColor;
  }
  @media (max-width: 420px) {
    .states-intro > div {
      grid-template-columns: 1fr;
      gap: 0.15rem;
    }
  }
</style>
