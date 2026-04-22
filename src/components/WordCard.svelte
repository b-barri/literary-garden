<script lang="ts">
  import type { Card } from "ts-fsrs";
  import { nextState, mastery, type Mastery, type PassiveRating } from "~/lib/scheduler";
  import { placeholderCoverSrc } from "~/lib/coverFallback";

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
    bookId: string;
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
    bookId,
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

  // --- Swipe-to-rate gesture state ---
  //
  // Tactile paper-card feel borrowed from Tinder/Hinge:
  //  • velocity-based commit (a flick counts even if short)
  //  • spring snap-back (easeOutBack — settles with a whisper of overshoot)
  //  • momentum exit (card flies off in the user's flick direction, with
  //    exit duration inversely proportional to release velocity)
  //  • lift + shadow during drag (card rises from the deck)
  //  • haptic nudge when the user crosses the commit threshold

  let dragging = $state(false);
  let exiting = $state(false);
  let dx = $state(0);
  let dy = $state(0);
  let startX = 0;
  let startY = 0;
  let dragDetected = false;
  let hapticFired = false;

  // Moving-window velocity tracking. We keep the last ~100 ms of samples
  // and compute px/s from the oldest to newest. This robustly handles
  // both slow drags (velocity ~ 0, falls through to distance commit) and
  // fast flicks (velocity > threshold, commits even on small dx).
  type Sample = { x: number; t: number };
  let samples: Sample[] = [];

  // Exit trajectory. Set on release if committing; drives the CSS
  // transition timing so a flick feels faster than a slow deliberate push.
  let exitDx = $state(0);
  let exitMs = $state(280);

  const DRAG_START_PX = 6;
  const DECISION_PX = 110;
  const VELOCITY_THRESHOLD = 500; // px/s — a confident flick
  const MAX_ROT_DEG = 16;
  const DRAG_SCALE = 1.015; // subtle "lift off deck" cue
  const VELOCITY_WINDOW_MS = 100;

  function pushSample(x: number) {
    const now = performance.now();
    samples.push({ x, t: now });
    while (samples.length > 0 && now - samples[0].t > VELOCITY_WINDOW_MS) {
      samples.shift();
    }
  }

  function computeVelocity(): number {
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = last.t - first.t;
    if (dt < 1) return 0;
    return ((last.x - first.x) / dt) * 1000; // px/s
  }

  // Reset flipped + swipe state when the card's word changes (Practice flow swaps cards).
  $effect(() => {
    void wordId;
    flipped = false;
    dragging = false;
    exiting = false;
    dx = 0;
    dy = 0;
    dragDetected = false;
  });

  const state: Mastery = $derived(mastery(card));

  const recentLookup = $derived(lookups[0]);
  const shouldPadWithDictExample = $derived(
    !!recentLookup && recentLookup.usage.length < 30,
  );
  const allMeanings = $derived(definition?.meanings ?? []);
  const firstExample = $derived(
    allMeanings.map((m) => m.example).find((e): e is string => !!e) ?? null,
  );

  function flip() {
    flipped = !flipped;
  }

  function rate(rating: PassiveRating) {
    const nextCard = nextState(card, rating);
    onrated(nextCard, rating);
    flipped = false;
  }

  // --- Pointer handlers for swipe-to-rate ---
  //
  // We attach move/up/cancel listeners to `window` on pointerdown and
  // detach them on release. This is the bulletproof gesture pattern:
  //   - setPointerCapture has a known iOS Safari bug with 3D-transformed
  //     descendants (pointermove stops firing mid-gesture)
  //   - Pure element-level bubbling breaks when the user's finger moves
  //     over a sibling element with its own pointer-events rules
  //   - Window-level listeners during-drag capture every movement
  //     regardless of what element is under the finger, matching the
  //     mental model users have ("the card follows my finger anywhere")
  //
  // We explicitly preventDefault on pointermove once dragDetected is true,
  // which stops iOS from committing the gesture to browser scroll and
  // keeps our handler in control.

  function onPointerDown(e: PointerEvent) {
    if (exiting) return;
    const target = e.target as HTMLElement;
    // Let rating buttons handle their own clicks
    if (target.closest(".rate")) return;
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    dragDetected = false;
    hapticFired = false;
    samples = [{ x: e.clientX, t: performance.now() }];
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const ndx = e.clientX - startX;
    const ndy = e.clientY - startY;
    if (
      !dragDetected &&
      (Math.abs(ndx) > DRAG_START_PX || Math.abs(ndy) > DRAG_START_PX * 2)
    ) {
      dragDetected = true;
    }
    // Once drag is detected, prevent the browser from claiming the gesture
    // (scroll, pull-to-refresh, overscroll back-nav on iOS Safari).
    if (dragDetected) e.preventDefault();

    pushSample(e.clientX);
    dx = ndx;
    dy = ndy * 0.12; // subtle vertical follow; horizontal is the real commit axis

    // Single haptic tick the moment the user crosses into commit territory.
    // Not looping — one confirmation, not a buzz. Best on Android Chrome;
    // iOS Safari is a no-op (Apple hasn't shipped Vibration API), but
    // costs us nothing to call.
    if (!hapticFired && Math.abs(ndx) >= DECISION_PX) {
      hapticFired = true;
      if ("vibrate" in navigator) navigator.vibrate(8);
    }
  }

  // Direction: "right" = good, "left" = again. `momentum` is the release
  // velocity in px/s used to scale the exit duration so flicks feel fast
  // and deliberate pushes feel weighty.
  function commitSwipe(direction: "left" | "right", momentum: number) {
    const rating: PassiveRating = direction === "right" ? "good" : "again";
    exiting = true;

    // Exit duration: 180 ms at high velocity (fast flick), 320 ms at low
    // velocity (deliberate push). Clamped to keep the range sensible.
    const speed = Math.abs(momentum);
    exitMs = Math.max(180, Math.min(320, 320 - speed * 0.15));

    // Exit position: window width + extra so the card clears viewport even
    // on wide screens. Preserves the current rotation via the derived
    // transform so the exit looks continuous with the drag.
    const exitDistance = window.innerWidth + 140;
    exitDx = direction === "right" ? exitDistance : -exitDistance;
    dx = exitDx;

    setTimeout(() => {
      const nextCard = nextState(card, rating);
      onrated(nextCard, rating);
      // state resets via the $effect watching wordId
    }, exitMs - 40);
  }

  function teardownDrag() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    pushSample(e.clientX);
    const v = computeVelocity();
    teardownDrag();

    if (!dragDetected) {
      // treat as tap → flip
      dx = 0;
      dy = 0;
      flip();
      return;
    }

    // Commit if EITHER the distance passes threshold OR the user flicked
    // with intent (velocity > threshold, moving in a committed direction).
    // Distance-and-velocity-agree prevents spurious commits when the
    // user drags left slowly then releases with a small rightward jitter.
    const distancePasses = Math.abs(dx) > DECISION_PX;
    const velocityPasses =
      Math.abs(v) > VELOCITY_THRESHOLD && Math.sign(v) === Math.sign(dx || v);

    if (distancePasses || velocityPasses) {
      commitSwipe(dx > 0 || (dx === 0 && v > 0) ? "right" : "left", v);
    } else {
      // Snap back — spring eased, not linear. CSS transition handles the
      // animation since we flip off the .dragging class and let the
      // default transition curve run.
      dx = 0;
      dy = 0;
    }
  }

  function onPointerCancel(_e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    dragDetected = false;
    teardownDrag();
    dx = 0;
    dy = 0;
  }

  // Derived transforms & hint opacities
  // Rotation eases toward MAX as dx grows — using a tanh curve instead of
  // linear gives a nicer feel (quick tilt at small drags, levels off at
  // extreme drags so the card doesn't spin wildly).
  const rotation = $derived(
    MAX_ROT_DEG * Math.tanh(dx / 160),
  );
  // Lift scale: 1 at rest, DRAG_SCALE when dragging. Binary flip based on
  // state — the CSS transition smooths it to a gentle lift.
  const liftScale = $derived(dragging ? DRAG_SCALE : 1);
  // Hint opacity via smoothstep — cubic ease so chips fade with intent,
  // not linearly. Gives a softer approach to full-on at threshold.
  const goodHint = $derived.by(() => {
    const t = Math.max(0, Math.min(1, dx / DECISION_PX));
    return t * t * (3 - 2 * t);
  });
  const againHint = $derived.by(() => {
    const t = Math.max(0, Math.min(1, -dx / DECISION_PX));
    return t * t * (3 - 2 * t);
  });

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

<div
  class="swipe-wrapper"
  class:dragging
  class:exiting
  style="
    transform: translate3d({dx}px, {dy}px, 0) rotate({rotation}deg) scale({liftScale});
    {exiting ? `transition: transform ${exitMs}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${exitMs}ms ease-out;` : ''}
    {exiting ? 'opacity: 0;' : ''}
  "
  onpointerdown={onPointerDown}
>
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
>
  <!-- FRONT — an ex libris bookplate -->
  <div class="face face-front">
    <!-- Gold wisteria filigree in the four corners -->
    <svg class="card-flourishes" viewBox="0 0 300 400" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <symbol id="card-flourish" viewBox="0 0 60 60">
          <g fill="none" stroke="var(--color-gold)" stroke-width="1" stroke-linecap="round">
            <path d="M4 4 Q 22 8 30 22 Q 36 36 54 40" opacity="0.9"/>
            <path d="M8 14 Q 16 18 20 26" opacity="0.65"/>
            <path d="M24 10 Q 30 16 34 24" opacity="0.65"/>
          </g>
          <g fill="var(--color-gold)" opacity="0.85">
            <circle cx="4" cy="4" r="1.4"/>
            <circle cx="20" cy="26" r="1"/>
            <circle cx="34" cy="24" r="1"/>
            <circle cx="54" cy="40" r="1.5"/>
          </g>
        </symbol>
      </defs>
      <use href="#card-flourish" x="6" y="6" width="60" height="60"/>
      <use href="#card-flourish" x="234" y="6" width="60" height="60" transform="scale(-1 1)" transform-origin="264 36"/>
      <use href="#card-flourish" x="6" y="334" width="60" height="60" transform="scale(1 -1)" transform-origin="36 364"/>
      <use href="#card-flourish" x="234" y="334" width="60" height="60" transform="scale(-1 -1)" transform-origin="264 364"/>
    </svg>

    <!-- Mastery seal — stamped gold badge at top-right -->
    <span class="mastery-seal" aria-hidden="true" data-mastery={state}>
      <svg viewBox="0 0 40 40">
        <g transform="translate(20 20)">
          {#if state === "pressed"}
            <!-- Red wax with gold rim -->
            <circle r="16" fill="#A82030" stroke="#5A1018" stroke-width="1.2"/>
            <circle r="12" fill="none" stroke="#FFE4C8" stroke-width="0.5" opacity="0.5"/>
            <text x="0" y="4.2" text-anchor="middle" font-family="'Cormorant Garamond', serif" font-style="italic" font-weight="600" font-size="13" fill="#FFEBD0">P</text>
            <path d="M -7 -9 Q -3 -13 4 -12" fill="none" stroke="#FF9A88" stroke-width="1.1" opacity="0.7" stroke-linecap="round"/>
          {:else if state === "bloom"}
            <!-- Five-petal blossom stamped in gold -->
            <circle r="16" fill="url(#seal-g)" stroke="#6A4820" stroke-width="1"/>
            <g fill="#FFF2CC" opacity="0.92">
              <circle cx="0" cy="-6" r="3.2"/>
              <circle cx="5.7" cy="-1.8" r="3.2"/>
              <circle cx="3.5" cy="5" r="3.2"/>
              <circle cx="-3.5" cy="5" r="3.2"/>
              <circle cx="-5.7" cy="-1.8" r="3.2"/>
              <circle r="1.8" fill="#8A5A28"/>
            </g>
          {:else}
            <!-- Sprout silhouette stamped in gold -->
            <circle r="16" fill="url(#seal-g)" stroke="#6A4820" stroke-width="1"/>
            <g fill="none" stroke="#FFF2CC" stroke-width="1.6" stroke-linecap="round">
              <path d="M 0 7 L 0 -3"/>
              <path d="M 0 0 Q -6 -2 -7 -7 Q -2 -6 0 -1"/>
              <path d="M 0 -3 Q 5 -4 6 -9 Q 2 -7 0 -3"/>
            </g>
          {/if}
        </g>
        <defs>
          <radialGradient id="seal-g" cx="0.3" cy="0.3" r="0.9">
            <stop offset="0%" stop-color="#F4D890"/>
            <stop offset="100%" stop-color="#8A5A28"/>
          </radialGradient>
        </defs>
      </svg>
    </span>

    <!-- Book cover — tipped-in plate -->
    <div class="hero" aria-hidden="true">
      {#if coverUrl}
        <img class="cover-hero" src={coverUrl} alt="" />
      {:else}
        <figure class="cover-hero placeholder-cover">
          <img class="placeholder-bg" src={placeholderCoverSrc(bookId || bookTitle)} alt="" />
          <figcaption class="placeholder-plate">
            <span class="plate-title">{bookTitle}</span>
            {#if bookAuthors}
              <span class="plate-author">{bookAuthors}</span>
            {/if}
          </figcaption>
        </figure>
      {/if}
    </div>

    <!-- Word — letterpress title -->
    <h2 class="word" {lang}>{word}</h2>
    {#if stem !== word}
      <p class="stem" {lang}>— {stem} —</p>
    {/if}

    <!-- Book provenance -->
    <div class="book-row">
      <div class="fleuron-rule" aria-hidden="true">
        <span class="rule-line"></span>
        <span class="fleuron">✦</span>
        <span class="rule-line"></span>
      </div>
      <p class="book">
        <span class="small-caps from">from</span>
        <cite>{bookTitle}</cite>
        {#if bookAuthors}<span class="dim">· {bookAuthors}</span>{/if}
      </p>
    </div>
  </div>

  <!-- BACK -->
  <div class="face face-back">
    <header class="back-header">
      <h3 class="back-word" {lang}>{word}</h3>
      {#if definition?.phonetic}
        <span class="back-phonetic">{definition.phonetic}</span>
      {/if}
    </header>
    <div class="flourish back-flourish" aria-hidden="true">
      <span></span><span class="ornament">✦</span><span></span>
    </div>

    <div class="back-body">
      {#if allMeanings.length > 0}
        <dl class="definitions">
          {#each allMeanings as m (m.partOfSpeech + m.definition)}
            <div class="definition-row">
              <dt class="pos">{m.partOfSpeech}</dt>
              <dd class="meaning">{m.definition}</dd>
            </div>
          {/each}
        </dl>
      {:else}
        <p class="definition-missing">
          <span class="small-caps">no definition found</span>
        </p>
      {/if}

      <div class="sentences" {lang}>
        {#each lookups as lookup, i (lookup.seenAt + i)}
          <blockquote>&ldquo;{lookup.usage}&rdquo;</blockquote>
        {/each}
        {#if shouldPadWithDictExample && firstExample}
          <p class="dict-example"><span class="small-caps">also</span> {firstExample}</p>
        {/if}
      </div>
    </div>

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

  <div class="swipe-chip chip-good" style="opacity: {goodHint};" aria-hidden="true">
    ✓ knew it
  </div>
  <div class="swipe-chip chip-again" style="opacity: {againHint};" aria-hidden="true">
    ✗ didn't know
  </div>
</div>



<style>
  /* Swipe-to-rate wrapper — JS handles horizontal drag. touch-action: none
     gives the JS pointer handlers exclusive ownership of all touch
     gestures on the card; the practice surface intentionally has no
     vertical page scroll when a card is on screen, so we don't need to
     preserve browser-driven pan-y. (Previously set to pan-y, which iOS
     Safari interprets as "browser claims vertical, nothing else" —
     horizontal swipes never reached our pointerdown handler.) */
  .swipe-wrapper {
    position: relative;
    width: 100%;
    /* height: 100% is load-bearing. Since .card-scene no longer carries
       its own aspect-ratio (the stack ancestor does now), the height:100%
       chain needs to cascade through every layer between the stack-slot
       and the card itself. Without it the whole card collapses to h=0
       and you get invisible rendering with non-zero viewport impact. */
    height: 100%;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    /* translate3d in the inline transform already forces a GPU layer; this
       hint refines the promotion + lets the compositor skip layout work
       during the drag. */
    will-change: transform;
    transform: translateZ(0);
    /* Snap-back spring — easeOutBack curve. Card returns to centre with a
       whisper of overshoot (~4%) and settles. The same transition runs
       for the lift scale release since both animate the `transform`
       property. Exit animations override this via inline style. */
    transition:
      transform 0.36s cubic-bezier(0.175, 0.885, 0.32, 1.275),
      box-shadow 0.3s ease-out,
      opacity 0.28s ease-out;
  }
  .swipe-wrapper.dragging {
    /* During drag we kill the transition entirely — the card must follow
       the finger exactly 1:1, no lag. */
    transition: none;
    cursor: grabbing;
    /* Lifted-from-the-deck shadow: deeper + slightly more spread than the
       rest state. CSS-only so it doesn't reactively re-render per
       pointermove (which would cost us). */
    filter: drop-shadow(0 22px 32px rgba(22, 6, 2, 0.26));
  }
  .swipe-wrapper.exiting { pointer-events: none; }

  /* Rating hint chips — wax-seal badges that press in as the user swipes toward a decision. */
  .swipe-chip {
    position: absolute;
    top: 1.25rem;
    padding: 0.55rem 1.1rem;
    border-radius: 999px;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    font-size: 0.95rem;
    letter-spacing: 0.04em;
    pointer-events: none;
    opacity: 0;
    z-index: 5;
    box-shadow:
      0 1px 0 rgba(255, 240, 200, 0.3) inset,
      0 -1px 0 rgba(0, 0, 0, 0.25) inset,
      0 6px 14px rgba(40, 10, 16, 0.28);
  }
  .chip-good {
    right: 1rem;
    color: #FFECC8;
    background: linear-gradient(180deg, #E8C572 0%, #A07428 100%);
    border: 1px solid #6A4820;
    transform: rotate(10deg);
    text-shadow: 0 1px 0 rgba(80, 50, 10, 0.45);
  }
  .chip-again {
    left: 1rem;
    color: #FFE4D0;
    background: linear-gradient(180deg, #C84048 0%, #6A1018 100%);
    border: 1px solid #3A0A10;
    transform: rotate(-10deg);
    text-shadow: 0 1px 0 rgba(60, 10, 10, 0.55);
  }

  /* --- Card scene / flip ---
     Fills its parent exactly — the .stack ancestor owns the aspect ratio
     (3:4 desktop, 3:3.6 mobile). A separate aspect-ratio here would
     conflict and cause the card to overflow its container, which also
     put the overflowing region outside the touch-action: none zone —
     the root cause of "swipe only works on the top half of the card"
     on mobile. touch-action explicitly set so 3D-transformed descendants
     inherit the right behaviour on iOS Safari (touch-action does NOT
     inherit by default). */
  .card-scene {
    perspective: 1200px;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .card {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
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
  .card[data-flipped="true"] { transform: rotateY(180deg); }

  .face {
    position: absolute;
    inset: 0;
    padding: 1.5rem 1.25rem 1rem;
    border-radius: inherit;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  /* Parchment grain — subtle so letterpress text stays crisp */
  .face-front::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' seed='11'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    background-size: 200px 200px;
    mix-blend-mode: multiply;
    opacity: 0.18;
    border-radius: inherit;
    z-index: 1;
  }
  /* Keep content above the grain */
  .face-front > * { position: relative; z-index: 2; }
  .face-front,
  .face-back {
    background:
      linear-gradient(180deg, oklch(0.97 0.02 85 / 0.96) 0%, oklch(0.94 0.03 80 / 0.96) 100%);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    /* Leather trim: 2px dark edge outside, gold stitch inside */
    border: 2px solid var(--color-leather-dark);
    box-shadow:
      0 0 0 1px var(--color-gold) inset,
      0 0 0 4px oklch(0.97 0.02 85 / 0.96) inset,
      0 0 0 5px var(--color-gold) inset,
      0 3px 0 var(--color-leather-mid),
      0 10px 24px oklch(0.22 0.02 250 / 0.2);
    color: var(--color-ink);
  }
  .face-back { transform: rotateY(180deg); }

  /* --- Hero area --- */
  .hero {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    margin-top: 0.25rem;
    margin-bottom: 0.5rem;
  }
  .cover-hero {
    max-width: 56%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 3px;
    /* Tipped-in plate: gold hairline + warm leather shadow */
    box-shadow:
      0 0 0 1px var(--color-gold),
      0 0 0 3px rgba(250, 245, 220, 0.9),
      0 0 0 4px rgba(196, 154, 82, 0.45),
      0 2px 4px rgba(42, 29, 15, 0.22),
      0 10px 22px rgba(42, 29, 15, 0.28);
  }

  /* Placeholder cover — used when no real cover; shows a bookplate-style title */
  .placeholder-cover {
    position: relative;
    aspect-ratio: 2 / 3;
    margin: 0;
    overflow: hidden;
  }
  .placeholder-cover .placeholder-bg {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .placeholder-plate {
    position: absolute;
    left: 8%;
    right: 8%;
    bottom: 8%;
    padding: 0.4rem 0.5rem 0.45rem;
    background: oklch(0.97 0.02 85 / 0.94);
    border: 1px solid oklch(0.72 0.08 70 / 0.45);
    border-radius: 2px;
    box-shadow:
      inset 0 0 0 3px oklch(0.97 0.02 85),
      inset 0 0 0 4px oklch(0.72 0.08 70 / 0.35),
      0 2px 6px oklch(0.22 0.02 250 / 0.2);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    color: var(--color-ink);
    font-family: var(--font-display);
    line-height: 1.15;
  }
  .plate-title {
    font-style: italic;
    font-size: 0.78rem;
    letter-spacing: -0.005em;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .plate-author {
    font-size: 0.58rem;
    color: var(--color-sepia);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-style: normal;
    font-family: var(--font-body);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* --- Front face: ex libris bookplate --- */

  /* Gold wisteria flourishes in the four corners */
  .card-flourishes {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
    opacity: 0.85;
  }

  /* Mastery seal — stamped gold badge at top-right */
  .mastery-seal {
    position: absolute;
    top: 0.6rem;
    right: 0.8rem;
    width: 2rem;
    height: 2rem;
    z-index: 4;
    filter: drop-shadow(0 1px 2px rgba(60, 30, 10, 0.3));
    transform: rotate(-6deg);
  }
  .mastery-seal[data-mastery="pressed"] {
    filter: drop-shadow(0 2px 3px rgba(80, 20, 28, 0.45));
  }
  .mastery-seal svg { width: 100%; height: 100%; }

  /* Word — letterpress title */
  .word {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    font-size: clamp(2rem, 4.5vw, 2.75rem);
    color: var(--color-leather-dark);
    text-align: center;
    margin: 0.85rem 0 0;
    letter-spacing: -0.005em;
    line-height: 1;
    /* Subtle letterpress relief: light highlight + warm shadow */
    text-shadow:
      0 1px 0 rgba(255, 245, 210, 0.75),
      0 -1px 0 rgba(60, 40, 10, 0.08);
  }

  /* Stem — root form, sepia italic, em-dashed */
  .stem {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.95rem;
    color: var(--color-gold-deep);
    text-align: center;
    margin: 0.1rem 0 0;
    letter-spacing: 0.04em;
    opacity: 0.85;
  }

  /* Book provenance row */
  .book-row {
    margin-top: auto;
    padding-top: 0.85rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
  }
  .fleuron-rule {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0 0.5rem;
  }
  .fleuron-rule .rule-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--color-gold) 50%, transparent 100%);
    opacity: 0.75;
  }
  .fleuron-rule .fleuron {
    font-size: 0.9rem;
    color: var(--color-gold);
    line-height: 1;
    text-shadow: 0 1px 0 rgba(255, 245, 210, 0.6);
  }
  .book {
    font-family: var(--font-display);
    font-size: 0.82rem;
    color: var(--color-gold-deep);
    text-align: center;
    margin: 0;
    font-style: italic;
    line-height: 1.35;
    letter-spacing: 0.01em;
  }
  .book .from {
    font-size: 0.64rem;
    letter-spacing: 0.16em;
    color: var(--color-gold-deep);
    opacity: 0.7;
    margin-right: 0.3rem;
    font-style: normal;
  }
  .book cite {
    font-style: italic;
    font-weight: 500;
    color: var(--color-leather-warm);
  }
  .book .dim {
    opacity: 0.75;
    color: var(--color-gold-deep);
  }

  /* --- Mastery-state treatments ---
     The leather-and-gold chrome stays the same across states; what shifts is
     the aging of the plate itself (word tint, cover-hero filter, faint warmth). */
  .card[data-mastery="pressed"] .cover-hero {
    filter: sepia(0.25) saturate(0.85) contrast(0.95);
  }
  .card[data-mastery="pressed"] .word {
    color: var(--color-gold-deep);
    text-shadow:
      0 1px 0 rgba(255, 245, 210, 0.75),
      0 -1px 0 rgba(60, 40, 10, 0.12);
  }
  .card[data-mastery="pressed"] .face-front::before {
    /* Warmer parchment on a pressed plate — sun-aged */
    opacity: 0.28;
  }

  /* --- Back face --- */
  .back-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.25rem;
    margin-bottom: 0.1rem;
  }
  .back-flourish {
    margin: 0 auto 0.7rem;
    max-width: 14rem;
    color: var(--color-gold-deep);
    opacity: 0.75;
  }
  .back-word {
    font-family: var(--font-display);
    font-size: 1.6rem;
    color: var(--color-sage-900);
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .back-phonetic {
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-sepia);
    font-style: italic;
  }

  .back-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.25rem;
  }
  .back-body::-webkit-scrollbar { width: 4px; }
  .back-body::-webkit-scrollbar-thumb { background: oklch(0.82 0.06 145 / 0.5); border-radius: 2px; }

  .definitions {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .definition-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.6rem;
    align-items: baseline;
    padding: 0.5rem 0.6rem;
    background: oklch(0.93 0.03 80 / 0.5);
    border-radius: 0.35rem;
    border-left: 3px solid var(--color-gold);
    box-shadow: 0 1px 0 rgba(196, 154, 82, 0.18);
  }
  .pos {
    color: var(--color-sage-700);
    font-variant: small-caps;
    letter-spacing: 0.08em;
    font-size: 0.7rem;
    white-space: nowrap;
    align-self: start;
    padding-top: 0.1rem;
  }
  .meaning {
    font-family: var(--font-display);
    font-size: 0.9rem;
    line-height: 1.4;
    color: var(--color-ink);
  }

  .sentences { margin-top: 0.75rem; }
  .sentences blockquote {
    font-family: var(--font-display);
    font-size: 0.85rem;
    line-height: 1.45;
    color: oklch(0.35 0.02 250);
    padding-left: 0.65rem;
    border-left: 2px solid oklch(0.72 0.08 70 / 0.5);
    margin-bottom: 0.4rem;
    font-style: italic;
  }
  .dict-example {
    margin-top: 0.3rem;
    padding-left: 0.65rem;
    border-left: 2px dashed oklch(0.72 0.08 70 / 0.5);
    font-size: 0.78rem;
    color: oklch(0.4 0.02 250);
    font-style: italic;
  }
  .definition-missing {
    padding: 0.75rem;
    color: var(--color-sepia);
    font-size: 0.8rem;
    text-align: center;
  }
  .small-caps {
    font-variant: small-caps;
    letter-spacing: 0.08em;
    font-style: normal;
    color: var(--color-sage-700);
  }

  /* --- Rating row: pressed-leather pills with gold stitching --- */
  .ratings {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-top: auto;
    padding-top: 0.65rem;
  }
  .rate {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.55rem 0.3rem 0.5rem;
    background: linear-gradient(180deg, var(--color-leather-mid) 0%, var(--color-leather-dark) 100%);
    border: 1px solid var(--color-leather-dark);
    border-radius: 0.55rem;
    color: var(--color-gold-light);
    font-family: var(--font-body);
    cursor: pointer;
    transition: transform 0.12s, box-shadow 0.15s, filter 0.15s;
    box-shadow:
      0 1px 0 rgba(255, 224, 168, 0.12) inset,
      0 -1px 0 rgba(0, 0, 0, 0.4) inset,
      0 2px 6px rgba(26, 14, 4, 0.25);
  }
  /* dashed gold stitching inside */
  .rate::before {
    content: '';
    position: absolute;
    inset: 3px;
    border: 1px dashed var(--color-gold);
    border-radius: 0.4rem;
    opacity: 0.5;
    pointer-events: none;
    transition: opacity 0.15s;
  }
  .rate:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }
  .rate:hover::before { opacity: 0.85; }
  .rate:active { transform: translateY(1px); }
  .rate.again:hover { box-shadow: 0 0 0 1px var(--color-wax-crimson) inset, 0 3px 10px rgba(168, 32, 48, 0.35); }
  .rate.good:hover  { box-shadow: 0 0 0 1px var(--color-gold-light) inset, 0 3px 10px rgba(232, 197, 114, 0.4); }
  .rate.hard:hover  { box-shadow: 0 0 0 1px var(--color-wax-amber) inset, 0 3px 10px rgba(196, 122, 40, 0.35); }
  .rate .num {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.05rem;
    color: var(--color-gold);
    position: relative;
    z-index: 1;
  }
  .rate .lbl {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.78rem;
    color: var(--color-gold-light);
    letter-spacing: 0.02em;
    position: relative;
    z-index: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .card { transition: none; }
  }

  /* Mobile — primary use case */
  @media (max-width: 640px) {
    /* card-scene inherits dims from .stack (3:3.6 on mobile) — see base
       rule. Do NOT re-declare aspect-ratio here or it overflows. */
    .face { padding: 1rem 1rem 0.85rem; }
    .word { font-size: 1.75rem; margin-top: 0.25rem; }
    .stem { font-size: 0.85rem; }
    .book { font-size: 0.72rem; padding-top: 0.5rem; }

    .back-word { font-size: 1.35rem; }
    .definition-row { padding: 0.4rem 0.55rem; gap: 0.5rem; }
    .meaning { font-size: 0.88rem; }
    .sentences blockquote { font-size: 0.82rem; }

    .ratings { gap: 0.5rem; padding-top: 0.6rem; }
    .rate {
      min-height: 48px;
      padding: 0.6rem 0.3rem;
      border-radius: 0.6rem;
    }
    .rate .num { font-size: 1.1rem; }
    .rate .lbl { font-size: 0.72rem; }
  }
</style>
