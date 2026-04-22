# Plan — Practice Tab Garden Continuity + Session Length Selector

**Date:** 2026-04-21
**Source brainstorm:** `docs/brainstorms/2026-04-21-practice-tab-garden-continuity-brainstorm.md`
**Scope:** Two buckets — (A) aesthetic continuity with the home page, (B) a session-length selector.

---

## Bucket A — Aesthetic continuity

### A.1 — Extract watercolor paper background to a shared class
**Why:** Currently the watercolor layered-gradient + SVG-noise background lives inside `src/pages/index.astro`'s scoped `<style>`. To reuse it on practice (and later on garden), lift it to `src/styles/global.css` as a utility class.
**Files:**
- `src/styles/global.css` — add `.watercolor-paper` rule (copy the 5 radial-gradients + SVG noise + `background-attachment: fixed` from `index.astro` lines 115-127).
- `src/pages/index.astro` — replace the inline `.page` CSS with `class="page watercolor-paper"`, drop the duplicated declarations.

**Risk:** `background-attachment: fixed` can interact with iOS Safari scrolling; home page currently uses it, so the risk is already accepted.

### A.2 — Apply watercolor background to practice page
**Why:** Page itself currently defaults to plain cream from `html { background: var(--color-cream) }`.
**Files:**
- `src/pages/practice.astro` — wrap the existing `<header>` + `<Practice/>` inside a `<div class="page watercolor-paper">` so the washes paint the full-height background.

### A.3 — Add small wisteria + flourish to practice header
**Why:** Home page's visual signature is the wisteria drape + `✦` flourish. Practice header should echo that in a restrained way (not a full canopy — this is a working space).
**Files:**
- `src/pages/practice.astro`:
  - Above the `<header class="page-head">`, add a small top-right wisteria sprig (~120px wide, same `/wisteria-header.png`, `mix-blend-mode: multiply`, `object-position: right top`, clipped so only the right corner draping shows).
  - Below the `.subtitle` but above the `<Practice/>` component, add the same `.flourish` + `✦` ornament used in `index.astro`.

### A.4 — Card front face: botanical accent
**Why:** Front face reads utilitarian against the watercolor page. Give it one subtle botanical touch, not full decoration.
**Files:**
- `src/components/WordCard.svelte`:
  - Add a small `.card-botanical` SVG in the bottom-left of `.face-front` — a simple 3-leaf sprig in sage at 25% opacity, positioned absolutely behind the `.book` citation.
  - No other layout changes.
- `src/lib/illustration.ts` — optionally add a single shared sprig SVG string that WordCard imports, so it's reused (YAGNI check: only if we end up using it in ≥2 places; otherwise inline it in WordCard).

### A.5 — Card back face: flourish divider
**Why:** The back header currently uses a hard `border-bottom: 1px solid sage` to separate the word/phonetic from the definitions. Swap that for the `✦` ornamental rule so the back feels like a page in a letter, not a form.
**Files:**
- `src/components/WordCard.svelte`:
  - Remove the `border-bottom` from `.back-header`.
  - Below the `.back-word` + `.back-phonetic`, insert a `<div class="back-flourish">` with the same three-span `rule–fleur–rule` markup as index.astro's `.flourish`.
  - Style scoped to this component with sepia/sage colors to match the existing back-face palette.

### A.6 — Make card slightly translucent
**Why:** Home page paper is 78% opaque cream with `backdrop-filter: blur(1px)` so the watercolor washes bleed through at the edges. Card should do the same so it reads as part of the garden, not pasted on top.
**Files:**
- `src/components/WordCard.svelte`:
  - `.face-front` and `.face-back` backgrounds: change `var(--color-cream)` → `oklch(0.97 0.02 85 / 0.82)`.
  - Add `backdrop-filter: blur(2px)` on both faces.

**Risk:** 3D flipped elements + `backdrop-filter` are shaky on Safari < 17. Mitigation: test on Safari after; if artifacts, drop `backdrop-filter` and keep just translucency.

---

## Bucket B — Session length selector

### B.1 — New component `SessionLengthPicker.svelte`
**Why:** Surface a 3-option picker before the first card renders.
**Files:**
- `src/components/SessionLengthPicker.svelte` (new):
  - Props: `onchoose: (length: number) => void`, `rememberedLength?: number` (to show a subtle "last time: 10" hint).
  - Three buttons labeled **sprig / 5**, **posy / 10**, **bouquet / 20** — botanical label above a small numeric subline.
  - Each button has a tiny leaf/flower SVG glyph, styled like the home page's doorways (`.door` pattern — sage border, Cormorant italic, hover lift).
  - Click → `onchoose(length)`.
  - Styling mirrors the home page's `.doorways` grid so the visual language is shared.

### B.2 — Wire into `Practice.svelte`
**Why:** Picker needs to gate the first card render; choice needs to slice the queue and persist.
**Files:**
- `src/components/Practice.svelte`:
  - New state: `let chosenLength = $state<number | null>(null)`.
  - New derived: `rememberedLength` read from `localStorage.getItem("literary-garden:session-length:v1")`.
  - On mount, after `buildQueueFromProgress` finishes: if `queue.length === 0`, skip picker (empty-state handles it). Otherwise render `<SessionLengthPicker>` instead of the card stack until `chosenLength !== null`.
  - On `onchoose(n)`: set `chosenLength = n`, `localStorage.setItem(...)`, and `queue = queue.slice(0, n)` so the existing `currentIndex`/done logic works unchanged.
  - Keep the session-header (`{currentIndex + 1} / {queue.length}`) as-is — it'll now show the sliced total, which is what the user expects.

### B.3 — Edge cases
- `queue.length < chosenLength` — `slice()` naturally returns the shorter queue. No special handling.
- Re-visiting `/practice` mid-session — today there's no persistence of `currentIndex` across reloads, so picker re-shows. Accept that (user can re-pick or pick the same length).
- "Rests" / "all available" fallback — YAGNI; the three options cover the brainstorm scope.

---

## Implementation order (smallest steps first)

1. **A.1** — Extract `.watercolor-paper` to global.css (pure refactor, no visual change).
2. **A.2** — Apply it to practice page (visual change: practice gets the watercolor bg).
3. **A.3** — Add wisteria sprig + flourish to practice header.
4. **A.6** — Make card translucent (check Safari before more work).
5. **A.5** — Swap back-header border for flourish divider.
6. **A.4** — Add subtle botanical sprig behind `.book` on front face.
7. **B.1** — Build `SessionLengthPicker.svelte` (isolated — can be tested with a storybook-like demo if needed).
8. **B.2** — Wire into `Practice.svelte`, test the gate → pick → slice flow.
9. Manual verification on `/practice` in Chrome + Safari, mobile-width.

Each step is independently committable and independently revertable. No step requires data migration or touches persistent state beyond the new `session-length:v1` localStorage key.

---

## Files touched (summary)

| File | Change |
|---|---|
| `src/styles/global.css` | + `.watercolor-paper` utility class |
| `src/pages/index.astro` | Swap inline watercolor CSS for the utility class (refactor, no visual change) |
| `src/pages/practice.astro` | Wrap content in `.watercolor-paper`; add wisteria sprig + `✦` flourish in header |
| `src/components/WordCard.svelte` | Translucent faces + backdrop-blur; `✦` flourish on back-header; small sprig on front face |
| `src/components/SessionLengthPicker.svelte` | New component |
| `src/components/Practice.svelte` | Add picker gate + queue slicing + localStorage persistence |

No changes to: `lib/scheduler.ts`, `lib/progress.ts`, `lib/daily.ts`, `lib/illustration.ts` (possible minor add for shared sprig), `scripts/import.ts`, data files, or routing.

---

## Not in this plan (explicit)

- PWA / app packaging — separate brainstorm.
- Pre-session ritual, richer complete screen, motion changes, PressedAlbum — brainstorm says explicitly out of scope.
- Mid-session "add more cards" / streak / reminders — explicitly parked.
- Font loading changes — current Cormorant + Lora + Inter stack remains; no new fonts.

---

## Resolved calibrations

1. **Wisteria on practice header:** top-right corner, clipped (ribbon-style margin ornament).
2. **Card opacity:** ~92% cream with slight backdrop-blur — the card is the focal reading surface; watercolor just tints the edges.

## Open questions before implementation

None.
