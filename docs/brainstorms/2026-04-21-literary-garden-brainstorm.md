---
date: 2026-04-21
topic: literary-garden
---

# Literary Garden — a digitized intellectual orbit from Kindle clippings

## What We're Building

A personal "literary garden" built from the user's Kindle data — specifically `My Clippings.txt` (highlights + notes) and the Kindle Vocabulary Builder database (`vocab.db`). The garden has two beds, unified by aesthetic, separated by function:

1. **Words bed** (inward practice) — Daily habit: learn 5 new words per day with their meanings and usage. Every word already has a sentence it was encountered in (from Kindle), which becomes the raw material for genuine mastery. Each word's visual appearance reflects its learning state — the growth of the card *is* the growth of the knowledge.
2. **Quotes bed** (outward presentation) — Highlighted passages and notes, surfaced for personal wandering and — critically — turned into beautiful shareable artifacts. Scope to be refined in a follow-up brainstorm once the words bed is planted.

The guiding philosophy: *everyone has their own intellectual orbit that one needs to expand, through travel or reading*. This garden is the digital form of that orbit — tended, revisited, and sometimes shared as a postcard.

## Why This Approach

Chose **Approach C: Garden + Printables** — a static-site digital garden for daily use, with a monthly printable PDF as a tactile shareable.

- Pure static (Approach A) misses the tangible artifact that matches the user's literary sensibility.
- Full web app (Approach B) risks spending energy on infrastructure instead of aesthetics.
- **Approach C** keeps static-site simplicity for the daily surface and adds the printable as the tactile counterpart. A postcard is more memorable than a URL.

## Key Decisions

- **Audience:** Me-first with selective per-card sharing. Private practice drives design; public surface is a deliberate window.
- **Architecture principle — function differs, form unifies:** Words and quotes share the garden's aesthetic (botanical, sage/rose, foliage borders) but occupy visually distinct beds with different interactions.
- **Daily habit — words bed:** 5 new cards per day, passive-recall SRS (self-rate: knew it / blurry / didn't know), FSRS-style scheduler. Card UI: word + book-cover art on the front; meaning + example sentence on the back.
- **State-as-aesthetic (core design principle):** The word card's visual state *is* the mastery readout. Three states:
  - **🌱 Seedling** — new, not yet reviewed. Pale, ink-outline, small.
  - **🌸 In bloom** — actively being learned. Full botanical illustration, deeply colored.
  - **🏵️ Pressed** — mature / graduated. Moves to a "pressed flower" album; preserved and occasionally resurfaced, but out of the active practice deck.
- **Quotes bed (deferred):** Private-by-default, per-card share links when the user wants to send one. Scope (theming, browsing, share artifacts) to be refined in a follow-up brainstorm.
- **Aesthetic direction:** Botanical / illustrated. Sage and rose palette, foliage borders, pressed-flower feel. Same visual language across both beds, with card shape/treatment differentiating word vs. quote.
- **Data sources:** `My Clippings.txt` (flat text) + `vocab.db` (SQLite) from Kindle. Book covers / author metadata enriched via Open Library or similar in a secondary pass. User-initiated imports — drop files in, re-run the importer.
- **Storage:** Local-first. Content as files in a repo. SRS state in localStorage initially; promote to a small KV layer later only if cross-device sync becomes a real need.
- **Monthly printable:** Algorithmically curated (most-revisited / most-shared / starred). Quote-centric with a small "words learned this month" spread. Belongs to the quotes-bed milestone, not v1.

## First Seed (v1 scope)

Plant the **words bed** first, fully — this is where the garden's visual identity (state-as-aesthetic) and the daily habit both land on day one.

v1 includes:

1. An **importer** that parses `My Clippings.txt` and `vocab.db`, normalizes records, and enriches books with cover art.
2. A **word card UI** with the three botanical states (seedling / in bloom / pressed) visible at a glance.
3. A **daily practice surface** — 5 new words/day + scheduled reviews, passive-recall rating, state transitions wired to FSRS intervals.
4. A **pressed flower album** — the gentle archive for mature words.
5. The **botanical aesthetic** in its first real form: palette, typography, illustration style, foliage dividers. This is the anchor the quotes bed will later extend.

Quote surfaces (homepage wander, per-book pages, themed browse, share links, printable) are deferred to a follow-up brainstorm + plan cycle, scoped after v1 is being used daily.

## Resolved Questions

- **Vocab mastery depth** → Passive-recall flashcards. Card front: word + book cover. Card back: meaning + example sentence from Kindle context. Daily target: 5 new words.
- **Quote + Word relationship** → Same garden, visually separated beds. Different functions (inward practice vs. outward sharing) with a shared aesthetic. Architecture principle: *function differs, form unifies.*
- **Monthly printable contents** → Algorithmic "most loved" selection, quote-centric with a small words spread. Belongs to the quotes-bed milestone.
- **Shareable scope** → Private by default; per-card public share links for quotes. Word practice stays personal.
- **State visualization** → Three-state botanical progression: seedling → in bloom → pressed. State-as-aesthetic is a core design principle, not a decoration.
- **First seed** → Words bed complete (importer, flashcards, state visuals, pressed-flower album, aesthetic anchor). Quotes bed gets its own brainstorm + plan after v1 ships.

## Open Questions (for the quotes-bed brainstorm, later)

- How are quotes themed? User-tagged, auto-tagged via LLM, or browse-only by book?
- Is the shareable artifact a static image (postcard style), a URL to a rendered page, or both?
- Does the monthly printable become the anchor ritual for the quotes bed, or is there a daily quote surface too?

## Next Steps

→ Run `/ce:plan` to produce the implementation plan for the v1 words bed.
