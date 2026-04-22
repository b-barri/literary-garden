---
title: LinkedIn launch post — Literary Garden
date: 2026-04-22
status: draft
---

# LinkedIn launch post — Literary Garden

**Intended media:** the Pressed Album PNG export from your own garden (the `save as image` button under `/garden` → Pressed section) — ideally showing 6 real pressed words with covers, so readers see the artifact they could make for themselves.

**Posting cadence:** one post, no threads. Link to the GitHub repo in-post, not in a comment (LinkedIn's algorithm no longer penalizes external links as heavily in 2026, and a comment-linked post reads evasive).

---

## Draft A — "the artifact as the hook" (recommended)

*(Preview text, ~150 words. Paste image first, then text.)*

> Every book you read widens your intellectual orbit. I wanted a way to see the *shape* of that orbit — not as a reading log, but as a garden that keeps growing.
>
> This is what mine looks like right now.
>
> Each word is something I looked up on my Kindle once, then revisited until it stuck. After 21 days of stable recall, it *presses* — like a flower pressed between the pages of a book. The image above is a pressed-album export from my own garden.
>
> It's a small static site, runs entirely on your laptop, reads from your Kindle's vocab.db. No cloud, no tracking, no one else's reading life on display.
>
> I open-sourced it as a template. If you read on a Kindle and the idea of a garden for your own words appeals to you — clone and grow your own.
>
> 🌱 github.com/[your-handle]/literary-garden

---

## Draft B — "philosophy-led" (alternate)

*(Same image. ~140 words.)*

> I've been sitting with an idea for a while: that a book is a letter from a stranger who has lived what you have not, and that reading — more than travel — is what actually widens the shape of your thought.
>
> I wanted an honest object for that. Not a reading tracker, not a Goodreads-adjacent profile. Something tended like a garden: words you looked up on your Kindle start as seedlings, bloom while you're learning them, and press after 21 days of proven memory.
>
> So I built one. It runs locally on your laptop from your own Kindle data; nothing leaves the machine.
>
> The image above is a snapshot of mine. If you want your own, the whole thing is on GitHub as a template.
>
> 🌱 github.com/[your-handle]/literary-garden

---

## Draft C — "technical flex" (for dev-heavy audience)

*(Same image. ~120 words. Reads more as a side-project-showcase than a philosophy piece.)*

> A weekend project that grew: turn your Kindle's `vocab.db` into a botanically-illustrated spaced-repetition garden.
>
> - Astro v6 + Svelte 5, pure static site.
> - FSRS spaced-repetition; state in localStorage.
> - Import from Kindle → words bed + scrapbook of highlights.
> - Export any pressed word set as a shareable PNG (the image above).
> - Optional private deploy to Vercel with auth-gated access.
>
> It's a template — clone it, point it at your own vocab.db, and you've got a personal reading garden running locally in ~15 minutes on a Mac.
>
> 🌱 github.com/[your-handle]/literary-garden

---

## Placeholder replacements before posting

Search-and-replace these:

- `[your-handle]` → your GitHub handle (both drafts)
- Paste your repo URL once it's public and protected
- **If deploying to Vercel publicly without Auth** — don't. Re-read the repo's Privacy section.

## Posting logistics

1. **Image first.** The Pressed Album export is the hero; body text goes below. LinkedIn composer lets you attach one image to text — do that.
2. **Alt text.** Add descriptive alt for accessibility: e.g., *"A scrapbook-style export card showing six pressed words from books I've read in 2026, laid out in a 2x3 grid with cover thumbnails and the title 'Bhavya's literary garden — Apr 2026.'"*
3. **No hashtags** in 2026 — they read try-hard on LinkedIn now. If you must, 1–2 max (`#reading` `#opensource`). Not `#buildinpublic`, `#indiehackers`, etc.
4. **Engage in the first hour.** Reply to the first 3–5 comments — drives reach. Don't start by asking for feedback in the post; let the image + idea do the work.

## Follow-up ideas (not this post)

- A second post a week later: "I've been using it for a week — here are the three weirdest words I pressed, and the books they came from." (Reuses the export artifact, adds narrative.)
- If engagement is strong: a blog post walkthrough on the technical choices (html-to-image, FSRS, Astro v6, local-first).
- If multiple people clone and customize it: a showcase post with screenshots of others' gardens.
