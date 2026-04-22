<script lang="ts">
  import GardenField from "./GardenField.svelte";
  import PressedAlbum from "./PressedAlbum.svelte";

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

  type View = "field" | "album";
  let view = $state<View>("field");
</script>

<div class="garden-root">
  {#if view === "field"}
    <GardenField {allWords} {books} />
  {:else}
    <PressedAlbum {allWords} {books} />
  {/if}

  <!-- View-toggle pill, always at the bottom -->
  <div class="view-toggle" role="tablist" aria-label="garden view">
    <button
      type="button"
      role="tab"
      aria-selected={view === "field"}
      class:active={view === "field"}
      onclick={() => (view = "field")}
      title="the field"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 21V10" />
          <path d="M12 13C9 12 7 10 7 7c3 0 5 2 5 5z" fill="currentColor" fill-opacity="0.3" />
          <path d="M12 13c3-1 5-3 5-6-3 0-5 2-5 5" fill="currentColor" fill-opacity="0.3" />
          <circle cx="12" cy="7" r="1.5" fill="currentColor" />
        </g>
      </svg>
      <span>field</span>
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={view === "album"}
      class:active={view === "album"}
      onclick={() => (view = "album")}
      title="the album"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="1.5" />
          <path d="M4 9h16" />
          <path d="M9 4v16" />
        </g>
      </svg>
      <span>album</span>
    </button>
  </div>
</div>

<style>
  .garden-root {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  .view-toggle {
    display: inline-flex;
    align-self: center;
    gap: 0.25rem;
    padding: 0.35rem;
    margin: 1rem auto 0;
    background: oklch(0.97 0.02 85 / 0.85);
    border: 1px solid oklch(0.45 0.07 145 / 0.25);
    border-radius: 999px;
    box-shadow: 0 2px 8px oklch(0.22 0.02 250 / 0.06);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
  .view-toggle button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.9rem;
    background: transparent;
    border: none;
    border-radius: 999px;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.88rem;
    color: var(--color-sage-700);
    cursor: pointer;
    transition: background 140ms, color 140ms;
  }
  .view-toggle button:hover { color: var(--color-sage-900); }
  .view-toggle button.active {
    background: oklch(0.62 0.08 145 / 0.9);
    color: var(--color-cream);
  }
  .view-toggle svg { display: block; }
</style>
