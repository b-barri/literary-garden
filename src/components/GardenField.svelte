<script lang="ts">
  import type { Card } from "ts-fsrs";
  import { loadSessions, type SessionRecord } from "~/lib/sessions";
  import { loadAll } from "~/lib/progress";
  import { mastery, type Mastery } from "~/lib/scheduler";
  import {
    renderPlant,
    paletteStyle,
    type Species,
    type Stage,
    type SeasonName,
  } from "~/lib/flora";

  interface Word {
    id: string;
    word: string;
    primaryBookId: string;
  }
  interface Book {
    id: string;
    title: string;
    authors: string;
  }
  interface Props {
    allWords: Word[];
    books: Book[];
  }

  const { allWords, books }: Props = $props();

  const booksById = new Map(books.map((b) => [b.id, b]));
  const wordsById = new Map(allWords.map((w) => [w.id, w]));

  type Window = "day" | "week" | "month" | "year";

  let mounted = $state(false);
  let sessions = $state<SessionRecord[]>([]);
  let cards = $state<Record<string, Card>>({});
  let window = $state<Window>("week");
  /** How many windows back from "now" we're viewing. 0 = current. */
  let windowOffset = $state(0);
  let hoveredWordId = $state<string | null>(null);

  $effect(() => {
    sessions = loadSessions();
    cards = loadAll();
    mounted = true;
  });

  // --- Date math ---
  const windowBounds = $derived.by(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    switch (window) {
      case "day": {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - windowOffset);
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 1);
        break;
      }
      case "week": {
        const day = start.getDay();
        const daysSinceMon = (day + 6) % 7;
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - daysSinceMon - windowOffset * 7);
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 7);
        break;
      }
      case "month": {
        start.setHours(0, 0, 0, 0);
        start.setDate(1);
        start.setMonth(start.getMonth() - windowOffset);
        end.setTime(start.getTime());
        end.setMonth(end.getMonth() + 1);
        break;
      }
      case "year": {
        start.setHours(0, 0, 0, 0);
        start.setMonth(0, 1);
        start.setFullYear(start.getFullYear() - windowOffset);
        end.setTime(start.getTime());
        end.setFullYear(end.getFullYear() + 1);
        break;
      }
    }
    return { start, end };
  });

  const windowLabel = $derived.by(() => {
    const { start, end } = windowBounds;
    const endInclusive = new Date(end.getTime() - 1);
    const fmtDay = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const fmtYear = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    switch (window) {
      case "day":
        return start.toLocaleDateString(undefined, {
          weekday: "long", month: "long", day: "numeric", year: "numeric",
        });
      case "week":
        return `${fmtDay(start)} — ${fmtYear(endInclusive)}`;
      case "month":
        return start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      case "year":
        return String(start.getFullYear());
    }
  });

  const canGoForward = $derived(windowOffset > 0);

  // --- Seasonal palette: auto by window (day→night, week→spring, month→summer, year→autumn) ---
  // All windows share the vivid summer palette for a consistently bright garden.
  const season = $derived<SeasonName>("summer");
  const stageStyle = $derived(paletteStyle(season));

  // --- Plant placement: one plant per known word ---
  const GRID_SIZE = 8;

  /** Floral species for in-bloom words. Pressed words become a bookStump. */
  const BLOOM_SPECIES: Species[] = [
    "oak", "pine", "sakura", "sunflower", "wildflower",
    "tulip", "mushroom", "lavender", "maple", "lilypond", "berrybush",
    "lantern", "fern", "rose", "cactus", "topiary", "bamboo",
    "lavenderSpike", "fernCurl", "mossRock", "willow", "roseTrellis", "mushroomRing",
  ];

  function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  interface Placement {
    wordId: string;
    row: number;
    col: number;
    species: Species;
    stage: Stage;
    mastery: Mastery;
    lastReview: Date;
  }

  const placements = $derived.by<Placement[]>(() => {
    if (!mounted) return [];
    const { start, end } = windowBounds;
    const out: Placement[] = [];
    const occupied = new Set<string>();

    for (const w of allWords) {
      const card = cards[w.id];
      if (!card) continue;
      const m = mastery(card);
      if (m === "seedling") continue;

      // Filter by window: a word "lives" in the window it was last reviewed.
      const lr = card.last_review;
      if (!lr) continue;
      if (lr < start || lr >= end) continue;

      // Seeded placement from the word id so the same word keeps its spot.
      const seed = hashStr(w.id);
      let row = (seed >> 3) % GRID_SIZE;
      let col = seed % GRID_SIZE;
      for (let attempt = 0; attempt < GRID_SIZE * GRID_SIZE; attempt++) {
        const key = `${row},${col}`;
        if (!occupied.has(key)) break;
        col = (col + 1) % GRID_SIZE;
        if (col === 0) row = (row + 1) % GRID_SIZE;
      }
      const key = `${row},${col}`;
      if (occupied.has(key)) continue; // 64 tiles full; extras silently drop
      occupied.add(key);

      // Pressed words (stability ≥ 21 days) become reading stumps —
      // "a finished volume — pressed into the album." Bloom words take floral species.
      const species: Species = m === "pressed"
        ? "bookStump"
        : BLOOM_SPECIES[seed % BLOOM_SPECIES.length];
      const stage: Stage = m === "pressed" ? 2 : 1;

      out.push({ wordId: w.id, row, col, species, stage, mastery: m, lastReview: lr });
    }
    // Back-to-front paint order for proper isometric occlusion.
    out.sort((a, b) => (a.row + a.col) - (b.row + b.col));
    return out;
  });

  const sessionsInView = $derived.by(() => {
    if (!mounted) return [] as SessionRecord[];
    const { start, end } = windowBounds;
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    return sessions.filter((s) => s.completedAt >= startISO && s.completedAt < endISO);
  });

  const stats = $derived.by(() => {
    const pressedInView = placements.filter((p) => p.mastery === "pressed").length;
    let totalMins = 0;
    for (const s of sessionsInView) {
      // Approximate: ~12s per review + 30s per bloom/press.
      totalMins += Math.round((s.wordsReviewed * 12 + (s.wordsBloomed + s.wordsPressed) * 30) / 60);
    }
    return {
      plantCount: placements.length,
      pressedCount: pressedInView,
      totalMins,
    };
  });

  const minsLabel = $derived.by(() => {
    if (window === "day") {
      const hrs = Math.floor(stats.totalMins / 60);
      const m = stats.totalMins % 60;
      return hrs > 0 ? `${hrs} hr ${m} min` : `${m} min`;
    }
    return `${stats.totalMins.toLocaleString()} min`;
  });

  function hoverDetail(id: string | null) {
    hoveredWordId = id;
  }

  const SPECIES_NAMES: Record<Species, string> = {
    oak: "Blossom oak",
    pine: "Pine",
    sakura: "Sakura bush",
    sunflower: "Sunflower cluster",
    wildflower: "Wildflower patch",
    bookStump: "Reading stump",
    tulip: "Tulip row",
    mushroom: "Mushroom cluster",
    lavender: "Lavender",
    maple: "Maple",
    lilypond: "Lily pond",
    berrybush: "Berry bush",
    lantern: "Lantern plant",
    fern: "Fern",
    rose: "Rose bush",
    cactus: "Flowering cactus",
    topiary: "Topiary",
    bamboo: "Bamboo",
    lavenderSpike: "Lavender spike",
    fernCurl: "Fern fiddlehead",
    mossRock: "Moss rock",
    willow: "Weeping willow",
    roseTrellis: "Rose trellis",
    mushroomRing: "Mushroom fairy ring",
  };

  const MASTERY_COPY: Record<Mastery, string> = {
    seedling: "seedling",
    bloom: "in bloom",
    pressed: "pressed",
  };

  const hoveredDetail = $derived.by(() => {
    if (!hoveredWordId) return null;
    const p = placements.find((pl) => pl.wordId === hoveredWordId);
    if (!p) return null;
    const word = wordsById.get(p.wordId);
    const book = word?.primaryBookId ? booksById.get(word.primaryBookId) : null;
    return {
      species: SPECIES_NAMES[p.species],
      title: word?.word ?? "a word",
      source: book?.title ?? null,
      mastery: MASTERY_COPY[p.mastery],
      stage: p.stage,
      when: p.lastReview.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      timeOfDay: p.lastReview.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
  });
</script>

<section class="field" aria-label="the garden, a time-navigable plot">
  <!-- Time-window tabs -->
  <div class="window-tabs" role="tablist">
    {#each ["day", "week", "month", "year"] as const as w}
      <button
        type="button"
        role="tab"
        aria-selected={window === w}
        class:active={window === w}
        onclick={() => { window = w; windowOffset = 0; }}
      >
        {w}
      </button>
    {/each}
  </div>

  <!-- Date label + navigation -->
  <div class="window-label">
    <button
      type="button"
      class="nav-arrow"
      aria-label="previous {window}"
      onclick={() => (windowOffset += 1)}
    >‹</button>
    <span class="label">{windowLabel}</span>
    <button
      type="button"
      class="nav-arrow"
      aria-label="next {window}"
      disabled={!canGoForward}
      onclick={() => { if (canGoForward) windowOffset -= 1; }}
    >›</button>
  </div>

  <!-- Seasonal stage: scoped palette container. Only the plot lives in this atmosphere. -->
  <div class="plot-stage season-{season}" style={stageStyle}>
    <!-- Corner flourishes — thin gold wisteria tendrils, one per corner -->
    <svg class="corner-flourishes" viewBox="0 0 680 460" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <symbol id="flourish" viewBox="0 0 80 80">
          <g fill="none" stroke="#E8C572" stroke-width="1.2" stroke-linecap="round">
            <path d="M6 6 Q 30 10 40 30 Q 48 48 72 54" opacity="0.85"/>
            <path d="M10 18 Q 20 22 24 32" opacity="0.6"/>
            <path d="M30 10 Q 38 16 42 26" opacity="0.6"/>
          </g>
          <g fill="#E8C572" opacity="0.75">
            <circle cx="6" cy="6" r="1.6"/>
            <circle cx="24" cy="32" r="1.2"/>
            <circle cx="42" cy="26" r="1.2"/>
            <circle cx="72" cy="54" r="1.8"/>
          </g>
        </symbol>
      </defs>
      <use href="#flourish" x="10" y="10" width="80" height="80"/>
      <use href="#flourish" x="590" y="10" width="80" height="80" transform="scale(-1 1)" transform-origin="630 50"/>
      <use href="#flourish" x="10" y="370" width="80" height="80" transform="scale(1 -1)" transform-origin="50 410"/>
      <use href="#flourish" x="590" y="370" width="80" height="80" transform="scale(-1 -1)" transform-origin="630 410"/>
    </svg>

    <div class="plot-wrap">
      <svg class="plot-svg" viewBox="0 0 800 540" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grass-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--grass-top)"/>
            <stop offset="1" stop-color="var(--grass-bot)"/>
          </linearGradient>
          <linearGradient id="dirt-front-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--dirt-front-top)"/>
            <stop offset="1" stop-color="var(--dirt-front-bot)"/>
          </linearGradient>
          <linearGradient id="dirt-right-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--dirt-right-top)"/>
            <stop offset="1" stop-color="var(--dirt-right-bot)"/>
          </linearGradient>
          <pattern id="dirt-dots" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.2" fill="#2a1a0a" opacity="0.42"/>
            <circle cx="13" cy="10" r="0.9" fill="#2a1a0a" opacity="0.35"/>
            <circle cx="7" cy="14" r="0.75" fill="#2a1a0a" opacity="0.36"/>
            <circle cx="15" cy="3" r="0.5" fill="#c9a878" opacity="0.5"/>
            <circle cx="2" cy="12" r="0.4" fill="#c9a878" opacity="0.45"/>
          </pattern>
          <pattern id="grass-tufts" x="0" y="0" width="50" height="25" patternUnits="userSpaceOnUse">
            <path d="M3 22 q1 -4 3 -4 q2 0 3 4" fill="none" stroke="#5E8860" stroke-width="0.9" opacity="0.5" stroke-linecap="round"/>
            <path d="M25 18 q1 -3 3 -3 q2 0 3 3" fill="none" stroke="#5E8860" stroke-width="0.9" opacity="0.45" stroke-linecap="round"/>
            <path d="M40 23 q0.7 -3 2 -3 q1.3 0 2 3" fill="none" stroke="#5E8860" stroke-width="0.9" opacity="0.4" stroke-linecap="round"/>
          </pattern>
        </defs>

        <!-- Right dirt face -->
        <polygon points="400,400 800,200 800,320 400,520" fill="url(#dirt-right-grad)"/>
        <polygon points="400,400 800,200 800,320 400,520" fill="url(#dirt-dots)" opacity="0.75"/>
        <!-- Front dirt face -->
        <polygon points="0,200 400,400 400,520 0,320" fill="url(#dirt-front-grad)"/>
        <polygon points="0,200 400,400 400,520 0,320" fill="url(#dirt-dots)" opacity="0.75"/>
        <!-- Scalloped dirt bottom edge (front) -->
        <path d="M0,320 L0,330 Q30,342 60,330 Q90,318 120,332 Q150,346 180,334 Q210,322 240,336 Q270,350 300,338 Q330,326 360,340 Q390,354 400,520 Z" fill="var(--dirt-front-bot)" opacity="0.9"/>
        <!-- Scalloped dirt bottom edge (right) -->
        <path d="M400,520 L400,400 L800,200 L800,320 Q770,332 740,322 Q710,312 680,326 Q650,340 620,328 Q590,316 560,330 Q530,344 500,332 Q470,320 440,334 Q420,340 400,520 Z" fill="var(--dirt-right-bot)" opacity="0.5"/>

        <!-- Grass top -->
        <polygon points="400,0 800,200 400,400 0,200" fill="url(#grass-grad)"/>
        <polygon points="400,0 800,200 400,400 0,200" fill="url(#grass-tufts)"/>
        <!-- Grass edge highlight -->
        <polyline points="0,200 400,0 800,200" fill="none" stroke="#C9DEC2" stroke-width="2.5" opacity="0.7"/>
        <!-- Dirt seam dark line -->
        <polyline points="0,200 400,400 800,200" fill="none" stroke="#3D2A15" stroke-width="2" opacity="0.5"/>

        <!-- Tile grid lines — faint sage -->
        <g stroke="#5E8860" stroke-width="1" opacity="0.18" fill="none">
          {#each Array(GRID_SIZE - 1) as _, i}
            {@const k = i + 1}
            <line x1={400 - k * 50} y1={k * 25} x2={800 - k * 50} y2={200 + k * 25} />
            <line x1={400 + k * 50} y1={k * 25} x2={k * 50} y2={200 + k * 25} />
          {/each}
        </g>
      </svg>

      <!-- Plants — one per known word. Inline SVG, colored by scoped CSS vars. -->
      <div class="plants-layer">
        {#each placements as p, i (p.wordId)}
          {@const sx = 400 + (p.col - p.row) * 50}
          {@const sy = (p.col + p.row + 1) * 25}
          <button
            type="button"
            class="plant stage-{p.stage}"
            style="left: {(sx / 800) * 100}%; top: {(sy / 540) * 100}%; z-index: {5 + i}; animation-delay: {Math.min(i * 18, 1000)}ms;"
            onmouseenter={() => hoverDetail(p.wordId)}
            onmouseleave={() => hoverDetail(null)}
            onfocus={() => hoverDetail(p.wordId)}
            onblur={() => hoverDetail(null)}
          >
            {@html renderPlant(p.species, p.stage)}
            {#if p.mastery === "pressed"}
              <span class="wax-seal" aria-hidden="true">
                <svg viewBox="0 0 40 40">
                  <g transform="translate(20 20)">
                    <!-- scalloped edge suggestion -->
                    <circle r="17" fill="#A82030" stroke="#5A1018" stroke-width="1"/>
                    <circle r="17" fill="url(#seal-grad)" fill-opacity="0.55"/>
                    <circle r="13" fill="none" stroke="#FFE4C8" stroke-width="0.6" opacity="0.55"/>
                    <text x="0" y="4.5" text-anchor="middle" font-family="'Cormorant Garamond', serif" font-style="italic" font-weight="600" font-size="14" fill="#FFEBD0">P</text>
                    <!-- highlight sheen -->
                    <path d="M -8 -10 Q -4 -15 4 -14" fill="none" stroke="#FF9A88" stroke-width="1.3" opacity="0.7" stroke-linecap="round"/>
                  </g>
                  <defs>
                    <radialGradient id="seal-grad" cx="0.35" cy="0.35" r="0.8">
                      <stop offset="0%" stop-color="#E86878"/>
                      <stop offset="100%" stop-color="#5A1018"/>
                    </radialGradient>
                  </defs>
                </svg>
              </span>
            {/if}
            <span class="sr-only">
              {wordsById.get(p.wordId)?.word ?? "word"} — {MASTERY_COPY[p.mastery]},
              last reviewed {p.lastReview.toLocaleDateString()}.
            </span>
          </button>
        {/each}
      </div>

      {#if hoveredDetail}
        <div class="tooltip" role="status">
          <div class="tip-species">{hoveredDetail.title}</div>
          <div class="tip-title">{hoveredDetail.mastery}</div>
          <div class="tip-meta">
            {hoveredDetail.species}
            {#if hoveredDetail.source}· <em>{hoveredDetail.source}</em>{/if}
          </div>
          <div class="tip-when">last tended {hoveredDetail.when} · {hoveredDetail.timeOfDay}</div>
        </div>
      {/if}
    </div>

    <!-- Footer stats bar — italic mins on the left, plant + pressed totals on the right -->
    <div class="footer-row">
      <div class="mins">
        {#if !mounted || stats.plantCount === 0}
          — mins
        {:else}
          {minsLabel}
        {/if}
      </div>
      <div class="totals">
        <span class="stat" title="plants in view">
          <span class="stat-num">{stats.plantCount}</span>
          <span class="stat-icon plant-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#9fd88a" stroke-width="1.8" stroke-linecap="round">
              <path d="M12 20v-8M12 12c-4 0-6-3-5-8 4 0 6 3 5 8zM12 12c3-1 5-4 5-7-3 0-5 2-5 6z"/>
            </svg>
          </span>
        </span>
        <span class="stat" title="pressed words (fully known)">
          <span class="stat-num">{stats.pressedCount}</span>
          <span class="stat-icon book-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d4b48a" stroke-width="1.8" stroke-linecap="round">
              <path d="M6 20 L12 3 L18 20 M8 14 L16 14"/>
            </svg>
          </span>
        </span>
      </div>
    </div>
  </div>

  <!-- Below-stage caption: the gardener's prose, in the literary voice -->
  <p class="status">
    {#if !mounted}
      …
    {:else if stats.plantCount === 0}
      <em>no words known here yet — rate a word &ldquo;knew it&rdquo; to plant the first.</em>
    {:else}
      <strong>{stats.plantCount}</strong>
      {stats.plantCount === 1 ? "word" : "words"} known
      {#if stats.pressedCount > 0}· {stats.pressedCount} pressed 🏵️{/if}
    {/if}
  </p>
</section>

<style>
  .field {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1.1rem;
    padding: 1rem 0 2rem;
  }
  .field > :not(.plot-stage) { align-self: center; }

  /* --- Window tabs: pressed-leather binding with gold stitching --- */
  .window-tabs {
    display: flex;
    gap: 0;
    padding: 4px;
    background:
      linear-gradient(180deg, #3a2a1a 0%, #2a1d0f 100%);
    border: 1px solid #1a1208;
    border-radius: 8px;
    box-shadow:
      0 1px 0 rgba(255, 224, 168, 0.12) inset,
      0 -1px 0 rgba(0, 0, 0, 0.45) inset,
      0 3px 10px rgba(26, 14, 4, 0.35);
    position: relative;
  }
  .window-tabs::before {
    /* gold-stitched inner border */
    content: '';
    position: absolute;
    inset: 3px;
    border: 1px dashed #C49A52;
    border-radius: 6px;
    opacity: 0.75;
    pointer-events: none;
  }
  .window-tabs button {
    padding: 0.45rem 1.15rem;
    background: transparent;
    border: none;
    border-radius: 5px;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    color: #D8B87A;
    cursor: pointer;
    transition: color 160ms, text-shadow 160ms;
    position: relative;
    z-index: 1;
  }
  .window-tabs button:hover {
    color: #F0D89A;
    text-shadow: 0 0 10px rgba(240, 216, 154, 0.4);
  }
  .window-tabs button.active {
    background:
      linear-gradient(180deg, #E8C572 0%, #B88A3A 100%);
    color: #2A1D0F;
    text-shadow: 0 1px 0 rgba(255, 240, 200, 0.45);
    box-shadow:
      0 1px 0 rgba(255, 240, 200, 0.6) inset,
      0 -1px 0 rgba(90, 60, 10, 0.4) inset,
      0 1px 4px rgba(26, 14, 4, 0.3);
  }

  /* --- Window label + arrows --- */
  .window-label {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    font-family: var(--font-display);
    font-style: italic;
    color: var(--color-sage-900);
    font-size: 1.05rem;
  }
  .nav-arrow {
    background: transparent;
    border: none;
    color: var(--color-sage-700);
    font-size: 1.3rem;
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    transition: background 120ms, color 120ms;
    display: grid;
    place-items: center;
    line-height: 1;
  }
  .nav-arrow:hover:not(:disabled) {
    background: oklch(0.93 0.04 145 / 0.7);
    color: var(--color-sage-900);
  }
  .nav-arrow:disabled { opacity: 0.3; cursor: default; }

  /* --- Seasonal stage: the framed vista that holds the plot ---
     Carries the palette vars; background is a soft radial wash so seasons feel
     atmospheric without overwhelming the cream-paper page. */
  .plot-stage {
    position: relative;
    width: min(100%, 680px);
    margin: 0.25rem auto 0;
    padding: 5rem 1rem 0.85rem;
    background-color: var(--plot-bg);
    background-image: radial-gradient(ellipse 80% 60% at 50% 60%, oklch(0.32 0.06 150 / 0.55) 0%, transparent 70%);
    border-radius: 0.75rem;
    box-shadow:
      0 2px 0 oklch(0.22 0.02 250 / 0.04) inset,
      0 10px 30px oklch(0.22 0.02 250 / 0.15),
      0 0 0 1px rgba(196, 154, 82, 0.22) inset;
    transition: background-color 400ms ease;
    overflow: hidden;
  }
  /* Parchment grain — fractal noise, soft-light so saturation stays intact */
  .plot-stage::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    background-size: 240px 240px;
    mix-blend-mode: soft-light;
    opacity: 0.55;
    border-radius: inherit;
    z-index: 1;
  }
  /* Sunlit vignette — warms the center, darkens the edges, adds depth */
  .plot-stage::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse 70% 55% at 50% 65%, rgba(255, 236, 180, 0.18) 0%, transparent 55%),
      radial-gradient(ellipse 120% 100% at 50% 50%, transparent 55%, rgba(10, 22, 8, 0.32) 100%);
    border-radius: inherit;
    z-index: 2;
  }
  .plot-stage > * { position: relative; z-index: 3; }

  /* Corner flourishes — gold wisteria tendrils, one per corner */
  .corner-flourishes {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 4;
    opacity: 0.75;
  }

  /* --- Isometric plot --- */
  .plot-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 800 / 540;
  }
  .plot-svg {
    display: block;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 14px 22px oklch(0.1 0.02 250 / 0.4));
  }
  .plants-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* --- Plants (inline SVG) ---
     Already drawn in isometric perspective; 2D-translate to place with
     bottom-center anchored on the tile. */
  .plant {
    position: absolute;
    transform: translate(-50%, -100%);
    transform-origin: center bottom;
    background: transparent;
    border: none;
    padding: 0;
    /* Brass magnifying-glass cursor — botanist's hand-lens */
    cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><defs><radialGradient id='g' cx='0.3' cy='0.3' r='0.8'><stop offset='0%25' stop-color='%23FFF4D8' stop-opacity='0.8'/><stop offset='100%25' stop-color='%23FFE8B0' stop-opacity='0.15'/></radialGradient></defs><circle cx='12' cy='12' r='8.5' fill='url(%23g)' stroke='%23A07428' stroke-width='2'/><circle cx='12' cy='12' r='7' fill='none' stroke='%23F0D890' stroke-width='0.6' opacity='0.7'/><line x1='18' y1='18' x2='26' y2='26' stroke='%23A07428' stroke-width='3.2' stroke-linecap='round'/><line x1='18' y1='18' x2='26' y2='26' stroke='%23F0D890' stroke-width='1' stroke-linecap='round' opacity='0.7'/></svg>") 12 12, pointer;
    pointer-events: auto;
    display: block;
    filter: drop-shadow(0 5px 5px oklch(0.15 0.02 250 / 0.35));
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .plant :global(svg) { display: block; width: 100%; height: auto; }
  .plant:hover, .plant:focus-visible {
    outline: none;
    transform: translate(-50%, -103%) scale(1.06);
    z-index: 20 !important;
  }

  /* --- Wax seal — stamped beside pressed plants --- */
  .wax-seal {
    position: absolute;
    right: -18%;
    bottom: 8%;
    width: 38%;
    max-width: 44px;
    min-width: 22px;
    aspect-ratio: 1 / 1;
    pointer-events: none;
    filter: drop-shadow(0 2px 3px rgba(80, 20, 28, 0.55));
    animation: seal-press 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: 400ms;
    z-index: 5;
  }
  .wax-seal :global(svg) { width: 100%; height: 100%; }
  @keyframes seal-press {
    0%   { transform: scale(2.2) rotate(-18deg); opacity: 0; }
    55%  { transform: scale(0.85) rotate(-4deg); opacity: 1; }
    100% { transform: scale(1) rotate(-6deg); opacity: 1; }
  }
  .plant.stage-0 { width: 14%; }
  .plant.stage-1 { width: 18%; }
  .plant.stage-2 { width: 23%; }

  @keyframes grow-in {
    from { transform: translate(-50%, -90%) scale(0.2); opacity: 0; }
    to   { transform: translate(-50%, -100%) scale(1); opacity: 1; }
  }
  .plant { animation: grow-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both; }

  /* --- Tooltip: handwritten index-card feel --- */
  .tooltip {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%) rotate(-0.6deg);
    max-width: 90%;
    min-width: 14rem;
    padding: 0.85rem 1.1rem 0.9rem 2rem;
    background:
      linear-gradient(180deg, #FAF3DC 0%, #F4E8C8 100%);
    border: 1px solid rgba(120, 88, 40, 0.3);
    border-radius: 4px;
    box-shadow:
      0 1px 0 rgba(255, 255, 240, 0.6) inset,
      0 10px 26px rgba(60, 30, 10, 0.28),
      0 2px 6px rgba(60, 30, 10, 0.12);
    font-family: var(--font-display);
    color: #2A1F10;
    text-align: left;
    z-index: 40;
    pointer-events: none;
  }
  /* red margin rule, like a ledger card */
  .tooltip::before {
    content: '';
    position: absolute;
    left: 1.2rem;
    top: 0.3rem;
    bottom: 0.3rem;
    width: 1px;
    background: rgba(178, 40, 40, 0.35);
  }
  /* dashed inner frame, like a hand-stamped border */
  .tooltip::after {
    content: '';
    position: absolute;
    inset: 4px;
    border: 1px dashed rgba(120, 88, 40, 0.28);
    border-radius: 3px;
    pointer-events: none;
  }
  .tip-species {
    font-style: italic;
    font-size: 1.1rem;
    font-weight: 500;
    color: #1A1308;
    letter-spacing: 0.01em;
    line-height: 1.15;
  }
  .tip-title {
    font-family: var(--font-body);
    font-style: normal;
    font-size: 0.7rem;
    font-weight: 500;
    color: #8A5A28;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-top: 0.2rem;
  }
  .tip-meta {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.82rem;
    color: #5A4028;
    margin-top: 0.35rem;
    padding-top: 0.3rem;
    border-top: 1px dotted rgba(120, 88, 40, 0.35);
  }
  .tip-meta em { color: #8A2828; font-style: italic; }
  .tip-when {
    font-family: var(--font-body);
    font-size: 0.68rem;
    color: #7A5A28;
    opacity: 0.85;
    margin-top: 0.3rem;
    font-style: italic;
    letter-spacing: 0.02em;
  }

  /* --- Footer stats inside the stage --- */
  .footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 0.35rem 0.25rem;
    margin-top: 0.1rem;
    border-top: 1px solid oklch(0.97 0.02 85 / 0.1);
    color: var(--color-cream);
  }
  .mins {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.1rem;
    color: var(--color-cream);
  }
  .totals {
    display: flex;
    gap: 1rem;
    align-items: center;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 500;
  }
  .stat { display: inline-flex; align-items: center; gap: 0.4rem; }
  .stat-num { color: var(--color-cream); }
  .stat-icon {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 1.5px solid oklch(0.97 0.02 85 / 0.3);
    display: grid; place-items: center;
  }
  .stat-icon :global(svg) { width: 13px; height: 13px; }
  .plant-icon { background: #1a3a1a; }
  .book-icon { background: #2a1d10; }

  /* --- Below-stage status line (in the paper voice) --- */
  .status {
    font-family: var(--font-display);
    font-size: 0.92rem;
    color: var(--color-sepia);
    text-align: center;
    margin: 0.5rem 0 0;
    font-style: italic;
  }
  .status strong { font-style: normal; color: var(--color-sage-900); font-weight: 500; }

  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  /* --- Mobile --- */
  @media (max-width: 560px) {
    .plot-stage { padding: 3rem 0.5rem 0.55rem; }
    .window-tabs button { padding: 0.3rem 0.7rem; font-size: 0.85rem; }
    .window-label { font-size: 0.95rem; gap: 0.5rem; }
    .plant.stage-0 { width: 17%; }
    .plant.stage-1 { width: 23%; }
    .plant.stage-2 { width: 29%; }
    .mins { font-size: 0.95rem; }
    .totals { gap: 0.7rem; font-size: 0.85rem; }
  }
</style>
