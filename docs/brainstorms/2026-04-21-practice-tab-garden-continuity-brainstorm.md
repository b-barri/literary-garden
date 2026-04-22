# Practice Tab — Garden Continuity & Session Control

**Date:** 2026-04-21
**Scope:** Practice tab (`/practice`) — aesthetic overhaul + one functional addition
**Status:** Brainstorm complete, ready for planning

---

## What We're Building

Two changes to the practice tab:

1. **Aesthetic continuity with the home page** — bring the watercolor-paper background, wisteria accent, and ornamental `✦` flourish language into the practice tab so it stops feeling like a utilitarian tab and starts feeling like another room of the same garden. Applies to the page surround, the card front face, and the card back face.

2. **Session length control** — a selector at the start of each session ("5 / 10 / 20 cards") so the ritual scales to the time available instead of being a fixed queue.

**Out of scope for this round (parked or deferred):**
- Making this an installable app (PWA / Capacitor / native) — deferred to a later brainstorm; the primary friction ("one-tap access, reliable offline") will be the lever there.
- Pre-session rituals (breath, quote, blank-page moment).
- Richer post-session ceremony (printable / shareable "pressed flower" moment).
- Any changes to motion/flip/swipe micro-interactions — user explicitly approves the current feel.

---

## Why This Approach

- **User friction surveyed:** primary pain point on the practice tab is "access / on-the-go," *not* the flow itself. That's a platform concern, not a redesign concern — so the practice tab itself doesn't need a rebuild, it needs polish + cohesion.
- **Aesthetic pain points surveyed:** the *page, the card front,* and the *card back* all feel under-dressed relative to the home page. Motion feels fine.
- **Direction chosen:** "Garden continuity" — reuse the home page's visual language rather than invent a new one. Lowest-risk, highest-cohesion. User rejected a dark/grimoire direction as off-tone with the site.
- **YAGNI:** we explicitly rejected a formal pre-session ritual, a celebration redesign, and session-wide redesign. One aesthetic direction + one small functional control is enough for this round.

---

## Key Decisions

### 1. Aesthetic direction: Garden continuity (not herbarium, not letter, not minimalism)

The practice tab gets the **same watercolor paper treatment as the home page**. Specifically:
- Same layered `radial-gradient` wisteria/sage/sepia washes + SVG noise tooth on the page background.
- Same ornamental `✦` flourish pattern (a hairline–fleuron–hairline divider) as the home page uses between sections.
- A small wisteria drape element echoing the home page header — not the full canopy, a restrained version (e.g., top corner accent, or small wisteria motif near the session header).
- Cards remain cream with sage borders (current), but sit **on** the watercolor paper so the paper reads through around them.
- Front + back face of the card each gain **one** subtle botanical decoration that signals garden without adding visual noise (e.g., a pressed-flower corner mark, a wisteria hairline between sections).

### 2. Functional addition: Session length selector

Before the first card of a session, show a small selector:
- **5 cards** (a sprig — 2 min)
- **10 cards** (a posy — default, current behavior — 4–5 min)
- **20 cards** (a bouquet — deep session)

The selector should feel garden-native (botanical labels per option, not just numbers). User picks once; queue is sliced to that length from the existing SRS build. "Today's garden is tended" screen still fires when the chosen count is reached.

**Persistence:** remember the last chosen length in localStorage so the default next session matches the user's recent rhythm.

**Parking:** no need for mid-session "add 5 more" — if user has time, they can just click Practice again later in the day (the queue will be empty if they exhausted it).

### 3. Deliberately NOT in scope

- Mastery-state card treatments (already exist — seedling/bloom/pressed filters). Not touching.
- Rating buttons redesign. Fine as-is.
- Card stack layout / swipe mechanics. Fine as-is.
- Practice flow logic (queue build, SRS math, progress persistence). Fine as-is.
- `PressedAlbum` (garden tab). Out of scope.

---

## Open Questions

*(none — everything above is user-decided)*

## Resolved Questions

1. **App vs. website?** → Parked. Primary friction is "one-tap access on the go" — will be addressed in a separate brainstorm about PWA / Capacitor / native options.
2. **Which part of the tab feels flattest?** → Page, front face, and back face of the card all need lifting. Motion is fine.
3. **Aesthetic direction?** → Garden continuity (home-page language). Not herbarium, not letter, not minimalism.
4. **Other flow changes?** → Only session length control. Explicitly not: pre-session ritual, richer complete screen.

---

## Next Step

Run `/ce:plan docs/brainstorms/2026-04-21-practice-tab-garden-continuity-brainstorm.md` to turn this into an implementation plan.
