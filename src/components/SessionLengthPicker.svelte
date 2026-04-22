<script lang="ts">
  interface Props {
    onchoose: (length: number) => void;
    rememberedLength?: number | null;
    available: number;
  }

  const { onchoose, rememberedLength = null, available }: Props = $props();

  const options = [
    { length: 5,  label: "sprig",    hint: "a small handful",   glyph: "🌱" },
    { length: 10, label: "posy",     hint: "the usual rhythm",  glyph: "🌸" },
    { length: 20, label: "bouquet",  hint: "a deeper session",  glyph: "🏵️" },
  ];
</script>

<section class="picker" aria-labelledby="picker-title">
  <header class="picker-head">
    <h2 id="picker-title">how deep into the garden today?</h2>
    <p class="picker-sub">
      {#if available === 1}
        one word waits to be tended.
      {:else}
        {available} words wait to be tended.
      {/if}
      {#if rememberedLength}
        <span class="remembered">· last time: {rememberedLength}</span>
      {/if}
    </p>
  </header>

  <div class="options" role="group" aria-label="session length">
    {#each options as opt (opt.length)}
      {@const actual = Math.min(opt.length, available)}
      <button
        type="button"
        class="option"
        class:recommended={opt.length === (rememberedLength ?? 10)}
        onclick={() => onchoose(opt.length)}
      >
        <span class="glyph" aria-hidden="true">{opt.glyph}</span>
        <span class="label">{opt.label}</span>
        <span class="count">
          {#if opt.length > available}
            {actual}{#if actual !== opt.length} · all that's waiting{/if}
          {:else}
            {opt.length} cards
          {/if}
        </span>
        <span class="hint">{opt.hint}</span>
      </button>
    {/each}
  </div>
</section>

<style>
  .picker {
    max-width: 28rem;
    margin: 1.5rem auto 0;
    text-align: center;
  }
  .picker-head {
    margin-bottom: 1.75rem;
  }
  .picker-head h2 {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    font-size: clamp(1.4rem, 4vw, 1.85rem);
    color: var(--color-sage-900);
    letter-spacing: -0.01em;
    margin: 0;
    line-height: 1.15;
  }
  .picker-sub {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-style: italic;
    color: var(--color-sepia);
    margin: 0.6rem 0 0;
  }
  .remembered {
    opacity: 0.75;
    font-size: 0.82rem;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .option {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 1.25rem 0.75rem 1.15rem;
    background: linear-gradient(180deg, var(--color-leather-mid) 0%, var(--color-leather-dark) 100%);
    border: 1px solid var(--color-leather-dark);
    border-radius: 0.5rem;
    color: var(--color-gold-light);
    font-family: var(--font-body);
    cursor: pointer;
    transition: transform 160ms, box-shadow 160ms, filter 160ms;
    box-shadow:
      0 1px 0 rgba(255, 224, 168, 0.1) inset,
      0 -1px 0 rgba(0, 0, 0, 0.4) inset,
      0 3px 10px rgba(26, 14, 4, 0.28);
  }
  /* gold-stitched dashed inner frame */
  .option::before {
    content: '';
    position: absolute;
    inset: 4px;
    border: 1px dashed var(--color-gold);
    border-radius: 0.35rem;
    opacity: 0.55;
    pointer-events: none;
    transition: opacity 160ms;
  }
  .option:hover {
    transform: translateY(-2px);
    filter: brightness(1.15);
    box-shadow:
      0 1px 0 rgba(255, 224, 168, 0.18) inset,
      0 -1px 0 rgba(0, 0, 0, 0.4) inset,
      0 6px 18px rgba(40, 20, 10, 0.4);
  }
  .option:hover::before { opacity: 0.9; }
  /* Recommended — gold-leaf fill with dark ink text */
  .option.recommended {
    background: linear-gradient(180deg, var(--color-gold-light) 0%, var(--color-gold-deep) 100%);
    color: var(--color-leather-dark);
    border-color: var(--color-gold-deep);
    box-shadow:
      0 1px 0 rgba(255, 240, 200, 0.55) inset,
      0 -1px 0 rgba(90, 60, 10, 0.35) inset,
      0 3px 12px rgba(180, 130, 60, 0.35);
  }
  .option.recommended::before {
    border-color: var(--color-leather-dark);
    opacity: 0.35;
  }
  .option:focus-visible {
    outline: 2px solid var(--color-gold-light);
    outline-offset: 2px;
  }

  .glyph {
    font-size: 1.5rem;
    line-height: 1;
    filter: drop-shadow(0 1px 2px rgba(40, 20, 10, 0.4));
    position: relative;
    z-index: 1;
  }
  .label {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.25rem;
    color: var(--color-gold-light);
    line-height: 1;
    margin-top: 0.1rem;
    letter-spacing: 0.01em;
    position: relative;
    z-index: 1;
  }
  .option.recommended .label { color: var(--color-leather-dark); }
  .count {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.82rem;
    color: var(--color-gold);
    letter-spacing: 0.02em;
    position: relative;
    z-index: 1;
  }
  .option.recommended .count { color: var(--color-leather-warm); }
  .hint {
    font-size: 0.7rem;
    color: var(--color-gold);
    letter-spacing: 0.03em;
    font-style: italic;
    opacity: 0.75;
    line-height: 1.2;
    position: relative;
    z-index: 1;
  }
  .option.recommended .hint { color: var(--color-leather-warm); opacity: 0.8; }

  @media (max-width: 560px) {
    .picker { margin-top: 0.75rem; }
    .picker-head { margin-bottom: 1.25rem; }
    .options {
      grid-template-columns: 1fr;
      gap: 0.6rem;
      max-width: 20rem;
      margin: 0 auto;
    }
    .option {
      flex-direction: row;
      gap: 0.9rem;
      padding: 0.9rem 1rem;
      text-align: left;
      justify-content: flex-start;
    }
    .option > .glyph { font-size: 1.4rem; }
    .option > .label { margin-top: 0; }
    .option > .count { margin-left: auto; }
    .option > .hint { display: none; }
  }
</style>
