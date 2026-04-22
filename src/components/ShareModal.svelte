<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import type { Book, Quote } from "~/lib/types";
  import ShareCard from "./ShareCard.svelte";
  import { sharePNG, downloadPNG } from "~/lib/share";
  import { slugify } from "~/lib/slugify";
  import { siteConfig } from "~/site.config";

  interface Props {
    open: boolean;
    quote: Quote;
    book: Book;
    spineColor: string;
    titleColor: string;
    onclose: () => void;
  }

  const { open, quote, book, spineColor, titleColor, onclose }: Props = $props();

  // The card is laid out at its native 1080×1350 dimensions. A wrapper
  // with `overflow: hidden` and a fixed aspect-ratio constrains the visible
  // area; a ResizeObserver watches the wrapper and sets a CSS transform
  // on the card so it scales to fit. html-to-image reads the card's
  // offsetWidth/offsetHeight (1080×1350) regardless of the visual scale,
  // so the export is always at full native resolution.
  let previewWrap: HTMLDivElement | undefined = $state();
  let cardEl: HTMLDivElement | undefined = $state();
  let status = $state<"idle" | "generating" | "error">("idle");
  let errorMsg = $state<string | null>(null);

  // Keep the card visually fitted to its wrapper. The ResizeObserver path
  // is used instead of CSS `cqw` because the latter has an edge case where
  // the scale value isn't applied on first mount in some browsers.
  $effect(() => {
    if (!open || !previewWrap || !cardEl) return;
    const observer = new ResizeObserver(() => {
      if (!previewWrap || !cardEl) return;
      const visibleW = previewWrap.clientWidth;
      // Card's native width is 1080. Scale = visible / native.
      const scale = visibleW / 1080;
      cardEl.style.transform = `scale(${scale})`;
    });
    observer.observe(previewWrap);
    return () => observer.disconnect();
  });

  // Prefer the owner's custom stamp if present, else ship the default wax
  // seal. We probe once when the modal opens; ignore fetch errors silently.
  let stampSrc = $state("/stamp-default.svg");
  $effect(() => {
    if (!open) return;
    // Opportunistic HEAD to detect the configured owner stamp.
    // Missing file → 404 → we keep the default without error noise.
    fetch(siteConfig.stampImage, { method: "HEAD" })
      .then((r) => {
        if (r.ok) stampSrc = siteConfig.stampImage;
      })
      .catch(() => {});
  });

  // Whether the runtime will open a native share sheet. We only know after
  // share() returns — so the button always offers "share", and we reveal
  // the download fallback hint once we've confirmed share isn't available.
  let shareDidDownload = $state(false);

  const filename = $derived(
    `passage-${slugify(book.title).slice(0, 40)}-${quote.id.slice(0, 6)}`,
  );

  async function handleShare() {
    if (!cardEl) return;
    status = "generating";
    errorMsg = null;
    try {
      const result = await sharePNG(cardEl, {
        title: `from ${book.title}`,
        text: `a passage from ${book.title} by ${book.authors}`,
        filename,
      });
      // Remember whether Web Share actually fired, so we can tell the user
      // next time that their browser didn't support it and downloaded instead.
      if (result === "downloaded") shareDidDownload = true;
      status = "idle";
    } catch (err) {
      status = "error";
      errorMsg = err instanceof Error ? err.message : "share failed";
    }
  }

  async function handleDownload() {
    if (!cardEl) return;
    status = "generating";
    errorMsg = null;
    try {
      await downloadPNG(cardEl, { filename });
      status = "idle";
    } catch (err) {
      status = "error";
      errorMsg = err instanceof Error ? err.message : "download failed";
    }
  }

  function handleBackdrop(ev: MouseEvent) {
    if (ev.target === ev.currentTarget) onclose();
  }
  function handleKey(ev: KeyboardEvent) {
    if (ev.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
  <div
    class="backdrop"
    role="presentation"
    onclick={handleBackdrop}
    transition:fade={{ duration: 220, easing: cubicOut }}
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      transition:scale={{ duration: 260, start: 0.96, easing: cubicOut }}
    >
      <header class="modal-head">
        <h2 id="share-title">share this passage</h2>
        <button
          class="close"
          type="button"
          aria-label="close"
          onclick={onclose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div class="preview-wrap">
        <!-- preview-frame: fixed aspect-ratio box that clips the card.
             preview-card: 1080×1350 box holding the ShareCard. Its
             transform is set by the ResizeObserver to fit the frame.
             html-to-image reads preview-card's layout dims (1080×1350)
             so exports render at native resolution regardless of scale. -->
        <div
          class="preview-frame"
          bind:this={previewWrap}
        >
          <div class="preview-card" bind:this={cardEl}>
            <ShareCard
              {quote}
              {book}
              {spineColor}
              {titleColor}
              {stampSrc}
            />
          </div>
        </div>
      </div>

      <footer class="modal-foot">
        {#if status === "error" && errorMsg}
          <p class="error" role="alert">{errorMsg}</p>
        {/if}
        <div class="actions">
          <button
            class="secondary"
            type="button"
            onclick={handleDownload}
            disabled={status === "generating"}
          >
            {status === "generating" ? "rendering…" : "download png"}
          </button>
          <button
            class="primary"
            type="button"
            onclick={handleShare}
            disabled={status === "generating"}
          >
            {status === "generating" ? "rendering…" : "share…"}
          </button>
        </div>
        {#if shareDidDownload}
          <p class="hint">
            your browser doesn&rsquo;t support the native share sheet — the card
            downloaded instead. attach it from your files / photos.
          </p>
        {/if}
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: oklch(0.22 0.02 250 / 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    overflow: auto;
  }
  .modal {
    background: var(--color-cream);
    border: 1px solid oklch(0.72 0.08 70 / 0.4);
    border-radius: 0.6rem;
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.5) inset,
      0 20px 60px oklch(0 0 0 / 0.35);
    max-width: 48rem;
    width: 100%;
    max-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem 1rem;
    border-bottom: 1px solid oklch(0.72 0.08 70 / 0.2);
  }
  .modal-head h2 {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.35rem;
    color: var(--color-sage-900);
    margin: 0;
    letter-spacing: -0.005em;
  }
  .close {
    width: 32px;
    height: 32px;
    border: 1px solid oklch(0.72 0.08 70 / 0.35);
    border-radius: 50%;
    background: transparent;
    color: var(--color-sepia);
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 140ms, color 140ms;
  }
  .close:hover {
    background: oklch(0.93 0.04 85);
    color: var(--color-leather-dark);
  }
  .close:focus-visible {
    outline: 2px solid var(--color-wisteria-500);
    outline-offset: 2px;
  }

  /* --- Preview --- */

  .preview-wrap {
    flex: 1 1 auto;
    overflow: auto;
    padding: 1.5rem;
    background: linear-gradient(
      135deg,
      oklch(0.93 0.03 82) 0%,
      oklch(0.89 0.04 72) 100%
    );
    display: grid;
    place-items: center;
  }
  /*
     .preview-frame is the VISIBLE box — fits available width, 4:5 portrait.
     .preview-card is the LAYOUT box at native 1080×1350 (so html-to-image
     captures at full resolution), visually scaled down via a transform
     whose factor is set by the ResizeObserver in the script.

     Transforms don't affect layout, so the card's CSS box stays 1080×1350
     regardless of visual size — the wrapper's `overflow: hidden` clips the
     unscaled overflow area to the 4:5 viewport. The aspect-ratio on the
     frame plus the transform keep the visible content pixel-perfect at
     any viewport size.
   */
  .preview-frame {
    position: relative;
    width: min(100%, 440px);
    aspect-ratio: 1080 / 1350;
    margin: 0 auto;
    overflow: hidden;
    border-radius: 4px;
    box-shadow: 0 6px 18px oklch(0 0 0 / 0.15);
    background: oklch(0.93 0.03 82);
  }
  .preview-card {
    position: absolute;
    top: 0;
    left: 0;
    width: 1080px;
    height: 1350px;
    transform-origin: top left;
    /* Initial scale via CSS variable — JS updates to the precise value. */
    transform: scale(0.4);
  }

  /* --- Footer / actions --- */

  .modal-foot {
    padding: 1rem 1.5rem 1.25rem;
    border-top: 1px solid oklch(0.72 0.08 70 / 0.2);
    background: var(--color-cream);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
  button.primary,
  button.secondary {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1rem;
    padding: 0.55rem 1.5rem;
    border-radius: 0.35rem;
    cursor: pointer;
    transition:
      transform 140ms ease-out,
      box-shadow 140ms ease-out,
      background 140ms;
    letter-spacing: 0.01em;
  }
  button.primary {
    background: linear-gradient(180deg,
      oklch(0.62 0.08 145) 0%,
      oklch(0.52 0.08 145) 100%);
    color: var(--color-cream);
    border: 1px solid oklch(0.42 0.08 145);
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.2) inset,
      0 2px 8px oklch(0.42 0.08 145 / 0.3);
  }
  button.primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.2) inset,
      0 4px 14px oklch(0.42 0.08 145 / 0.35);
  }
  button.secondary {
    background: transparent;
    color: var(--color-sage-900);
    border: 1px solid oklch(0.72 0.08 70 / 0.5);
  }
  button.secondary:hover:not(:disabled) {
    background: oklch(0.93 0.04 85 / 0.5);
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  button:focus-visible {
    outline: 2px solid var(--color-wisteria-500);
    outline-offset: 3px;
  }

  .hint {
    font-size: 0.78rem;
    color: var(--color-sepia);
    font-style: italic;
    margin: 0;
    text-align: right;
  }
  .error {
    font-size: 0.85rem;
    color: oklch(0.48 0.15 25);
    margin: 0;
    font-style: italic;
  }

  /* --- Responsive --- */
  @media (max-width: 640px) {
    .modal {
      max-height: calc(100dvh - 1rem);
      border-radius: 0.4rem;
    }
    .preview-wrap { padding: 0.75rem; }
    .actions { flex-direction: column-reverse; }
    button.primary,
    button.secondary {
      width: 100%;
      padding: 0.75rem 1rem;
    }
    .hint { text-align: center; }
  }

  /* --- Reduced motion: drop all transitions --- */
  @media (prefers-reduced-motion: reduce) {
    button.primary,
    button.secondary,
    .close {
      transition: none;
    }
  }
</style>
