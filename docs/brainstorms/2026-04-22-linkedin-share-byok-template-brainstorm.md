---
title: LinkedIn-Share + BYOK Template
date: 2026-04-22
status: brainstorm
---

# Brainstorm: LinkedIn-Share + BYOK Template

## What We're Building

Turn Literary Garden from a personal project into a shareable template so others can clone the repo, load **their own** Kindle vocab + highlights, and run it locally. Simultaneously, produce a LinkedIn post that uses the app's own "Pressed Album" export as the social object — the same export feature that ships for readers becomes the artifact the LinkedIn post shows off.

Scope:

1. **Parameterize owner identity** — replace hardcoded "Bhavya" (currently in ~6 files: `BaseLayout.astro`, `Nav.astro`, `index.astro` heading + signature, `practice.astro`, `garden.astro`) with a single `site.config.ts` constant (`ownerName`, `siteTitle`, optional `year`).
2. **Onboarding README** — a clear "Getting your Kindle data" walkthrough (where `vocab.db` lives on a Kindle, how to copy it over USB), plus an animated GIF of the app in use, plus a troubleshooting section (missing definitions, stale cover cache, sideloaded book titles).
3. **Pressed Album PNG export** — a button on the Pressed Album view that renders the album to a single PNG image the user can download, save, or post. This is the social object.
4. **Additive re-seeding (documented)** — when the user re-runs `pnpm seed` with a newer `vocab.db`, new words get seeded; existing words keep their FSRS card state and session history (already works because progress is keyed by `wordId`). Document this contract in README so it's a known guarantee.
5. **LinkedIn post craft** — draft a post that leads with the aesthetic (screenshots + pressed-album export) and links to the repo. Target audience is book-lovers broadly, knowing that the self-host subset will skew technical.

Out of scope for this pass: hosted demo, sample public-domain data bundle, first-run welcome wizard, JSON backup/restore, cross-device cloud sync.

## Why This Approach

- **The album export does double duty.** It solves the user's "can't share my pressed album" concern *and* gives LinkedIn readers a tangible "you could make one of these" artifact. One feature, two audiences.
- **The state story is already solid.** FSRS progress, sessions, session-length, and garden flora already persist to localStorage. The brainstorm confirmed that re-seeding is naturally additive (keys by `wordId`), so no merge engine is needed — just documentation and reassurance.
- **YAGNI on non-technical onboarding.** The user picked "Option 3 + BYOK" knowing it keeps a real install step. Building a first-run welcome wizard or hosted sample-data demo would triple the scope without matching the user's accepted audience tradeoff.
- **Parameterization is small and high-signal.** Six files is an afternoon of work, but the perceived effect ("this is a template, not Bhavya's personal site") is large.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Owner config location | `src/site.config.ts` (committed, edited once by user) | Simpler than env vars or localStorage site config; matches Astro conventions; one file to edit. |
| `site.config.ts` fields | `ownerName`, `siteTitle`, `tagline`, `socialImage` | All four are worth configuring in v1: covers headings/signature, tab title, home-page hook, and LinkedIn OG card. |
| Album export format | PNG only | Keepsake ritual. PDF/JSON out of scope for v1. |
| PNG layout | Title header band (owner + date range) + grid of covers with pressed words overlaid | Works as a social poster. Bounds the visual design to "scrapbook page" aesthetic. |
| Re-seed model | Additive-only, driven by `pnpm seed` re-run | Already behaves this way because progress keys by `wordId`. Just needs to be documented as a guarantee. |
| Hosted demo | None | Privacy-preserving (no one's Kindle data online), smaller scope, respects user's Option 3 + BYOK framing. |
| Target audience | "Non-technical in spirit" — LinkedIn post reaches readers; repo reaches the semi-technical subset who will clone | Honest, accepts the tradeoff made during brainstorm. |
| LinkedIn post artifact | Pressed Album PNG export (self-dogfooded) | Unifies the feature work and the social deliverable. |
| README walkthrough scope | Mac only | Matches owner's own setup; Windows/Linux deferred to "contributions welcome" footnote. |
| Privacy hardening | Pre-commit hook that blocks commits touching `/data/raw/` or private cover paths | Opinionated safety for anyone who clones; doesn't rely on user discipline alone. Gitignore already in place as first line. |

## Resolved Questions

1. **Pressed Album PNG content** → Title header band (owner name + date range, e.g. "Bhavya's pressed words — Spring 2026") over a grid of book covers with the pressed word overlaid on each. Social-poster feel.
2. **`site.config.ts` fields** → `ownerName`, `siteTitle`, `tagline`, `socialImage` (all four).
3. **README platforms** → Mac-only Kindle walkthrough; Windows/Linux noted as "contributions welcome."
4. **Privacy** → Add a pre-commit hook that blocks commits touching `/data/raw/` or private cover paths. Retain existing gitignore.

## Open Questions

1. **GIF in README** — deferred. Decide during planning / dogfooding: beauty shot (garden page) vs full loop (garden → practice → press) vs two GIFs. Produce during implementation and pick based on what looks good.

## Recommended Next Step

Proceed to `/ce:plan` with this brainstorm, focusing the first plan on: site.config.ts extraction, Pressed Album PNG export implementation, and the README rewrite (with placeholder GIF slot). The LinkedIn post draft can happen in parallel or as a final phase once the PNG export is working and can be self-dogfooded.
