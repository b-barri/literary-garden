<script lang="ts">
  import type { Card } from "ts-fsrs";
  import { loadAll } from "~/lib/progress";
  import { mastery } from "~/lib/scheduler";
  import { assignIllustration, illustrationSvg } from "~/lib/illustration";

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
  let mounted = $state(false);

  $effect(() => {
    const cards = loadAll();
    const list: Array<{ word: Word; card: Card; pressedAt: Date }> = [];
    for (const w of allWords) {
      const card = cards[w.id];
      if (!card) continue;
      if (mastery(card) !== "pressed") continue;
      list.push({
        word: w,
        card,
        pressedAt: card.last_review ?? card.due,
      });
    }
    // Newest pressings first
    list.sort((a, b) => b.pressedAt.getTime() - a.pressedAt.getTime());
    pressed = list;
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
</script>

{#if !mounted}
  <p class="loading" aria-live="polite">opening the album…</p>
{:else if pressed.length === 0}
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
  <p class="count">
    {pressed.length} pressing{pressed.length === 1 ? "" : "s"}
    from {grouped.length} book{grouped.length === 1 ? "" : "s"}
  </p>
  <div class="albums">
    {#each grouped as group (group.book?.id ?? "unknown")}
      <section class="album">
        <header>
          {#if group.book?.coverUrl}
            <img class="cover" src={group.book.coverUrl} alt="" />
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

<style>
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
</style>
