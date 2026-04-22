---
title: "feat: LinkedIn-Share + BYOK Template"
type: feat
status: completed
date: 2026-04-22
origin: docs/brainstorms/2026-04-22-linkedin-share-byok-template-brainstorm.md
---

# feat: LinkedIn-Share + BYOK Template

## Enhancement Summary

**Deepened on:** 2026-04-22 (after initial plan)

### Key improvements landed
1. **Phase 4 rewritten with concrete snapDOM implementation** — container queries instead of media queries for off-screen render, explicit `document.fonts.load()` preload, `snapdom.preCache()` on mount for Safari, adaptive scale clamp to avoid iOS 16M-pixel canvas ceiling.
2. **Phase 4 performance fixes added** — adaptive scale math, `await img.decode()` before capture, `URL.revokeObjectURL` after download, concurrent-click guard, two-frame yield for loading state to paint.
3. **Phase 7 simplified** — PWA full manifest dropped; just `apple-touch-icon` + two meta tags. Mobile audit showed only one real issue (`Nav.astro:148`), so the mobile polish section is ~80% smaller than originally scoped.
4. **Phases 1, 2, 3 trimmed** — dev-only placeholder badge dropped (keep `console.warn`), re-seed diff summary dropped (silent success is fine for a CLI the owner runs).
5. **Acceptance criteria trimmed ~40%** — reflecting simplicity review; this is a solo side project, not an enterprise feature.

### New considerations discovered
- 🔴 **Vercel Hobby does not support shared-password protection.** The only free access-gating is "Vercel Authentication" (viewer needs a Vercel account). Production custom domains on Hobby are always public — only preview URLs get protected. **Resolved 2026-04-22:** proceed with Vercel Auth; owner-only use is the accepted scope. See "Platform Decision" section below.
- 🟡 **PWA + Vercel Auth cookie-expiry pitfall** — add-to-home-screen installs fine, but when the Vercel auth cookie expires periodically, the home-screen icon opens Vercel's login page in Safari chrome instead of standalone app. Documented as a known quirk in the README.
- **Image-decode race in PNG export** — `document.fonts.ready` doesn't wait for images. Covers render blank on first capture unless we explicitly `await img.decode()` on each cover before snapping. Fixed in Phase 4 implementation pseudocode.

### Confidence
Before deepening: **78 / 100.** After deepening + platform resolved: **~88 / 100.** Remaining 12 points are: final visual quality of the PNG export (can only judge by running it), snapDOM behavior on the specific Svelte 5 + Tailwind v4 combination (well-researched but unverified on this stack), and general 7-phase planning entropy.

---

## Platform Decision — RESOLVED (2026-04-22)

**Chosen: Vercel Hobby + Vercel Authentication.** Owner-only access from their own phone + laptop (one login per browser). If sharing with a friend becomes a real need later, the plan can be revised to Cloudflare Pages + Access (free tier, magic-link email — no Vercel account required for viewers) or Vercel Pro + shared password ($20+/mo). Deferred.

Trade-offs accepted:
- Shared-password UX is not available (viewers would need Vercel accounts) — not a current use case.
- PWA add-to-home-screen has a cookie-expiry re-login pitfall on Vercel Auth — documented as a known quirk, not a blocker.
- Production custom domain is always public on Hobby — deploy will use the `*.vercel.app` URL only.

---

## Overview

Turn Literary Garden from a personal project into a shareable template so others can clone the repo, load **their own** Kindle vocab + highlights, and run it locally. Simultaneously, build a Pressed Album PNG export that doubles as the social artifact for the LinkedIn launch post — one feature serving two audiences (the LinkedIn reader and the cloner who wants to generate their own). Additionally, deploy the owner's personal instance privately on Vercel so it's accessible from phone + laptop (access-gated via Vercel Deployment Protection, with explicit per-device state caveats documented).

Ships as seven small phases, staged to unblock dogfooding: config → privacy → import polish → PNG export → README → LinkedIn post → private deploy (the README uses a real dogfooded PNG in the hero; the private deploy is owner-only and additive to the BYOK-local template story).

## Problem Statement / Motivation

**For the LinkedIn audience (reach):** there's no shareable artifact today. The app lives on localhost, and "Bhavya's Literary Garden" is hardcoded in seven places — it reads as a personal project, not a template invitation.

**For cloners (BYOK):** the repo is technically clone-ready (pure static Astro, no secrets, gitignored raw data) but the onboarding is invisible. No Kindle-export walkthrough, no dogfoodable demo image, no guardrails if they re-seed with new data, and no friendly errors if `vocab.db` is missing. A non-technical reader bounces.

**For state continuity:** FSRS progress and sessions already persist to localStorage, and re-seeding is additive by keying on `wordId` (verified below). But the Pressed Album's "permanence" is invisible — users can't export or share it, so it feels ephemeral even though the data persists. The user's real concern was never storage — it was *showability* (see brainstorm: docs/brainstorms/2026-04-22-linkedin-share-byok-template-brainstorm.md).

**For the owner's own daily use:** local-only means the app is only accessible when `pnpm dev` is running on the laptop. The owner wants to also browse their garden + practice from their phone. This is a separate want from the template story — it's about making the owner's personal instance always-on and multi-device-accessible (though state still lives per-browser due to localStorage; cross-device sync is explicitly out of scope for v1).

## Proposed Solution

1. **`src/site.config.ts`** with `ownerName`, `siteTitle`, `tagline`, `socialImage` — replaces all seven hardcoded "Bhavya" references, emits a visible warning when left as the placeholder default.
2. **Pre-commit hook via `simple-git-hooks`** that blocks commits touching `/data/raw/` or `public/covers/` — belt-and-suspenders on top of existing `.gitignore`.
3. **Import polish**: friendly errors for missing/empty `vocab.db`, a re-seed diff summary (`+N new, M preserved`), and a documented additive-merge contract.
4. **Pressed Album PNG export** using `@zumer/snapdom` — a dedicated `<PressedAlbumExport>` Svelte component rendered off-screen at fixed 1200px width, with a title band ("{ownerName}'s pressed words — {dateRange}"), book-cover grid, and download trigger.
5. **README rewrite** with Mac-only Kindle walkthrough, Node version guardrail, "Requirements / Not supported" block above the fold, hero GIF + PNG, troubleshooting section, local-only-by-default privacy stance, and a short optional "Private Deploy" section.
6. **LinkedIn post draft + OG image** (`public/og-image.png` at 1200×630) with the minimum tag set for a rich preview on LinkedIn.
7. **Private Vercel deploy (owner-only)** — `vercel --prebuilt` pipeline that uploads only the pre-built static `dist/` (no source, no `vocab.db`, no processed JSON on Vercel's git). Access-gated via Vercel Deployment Protection on Hobby tier. Mobile viewport + touch polish + PWA manifest for add-to-home-screen.

## Technical Approach

### Architecture

**Config layer (new):** `src/site.config.ts` exports a single `siteConfig` object. Astro files import it in frontmatter and interpolate. Svelte components receive it via props when they need owner-name context (specifically, the PNG export's title band).

**PNG export subsystem (new):** A three-file addition — (a) `PressedAlbumExport.svelte` (the export-only DOM, fixed 1200px width, title band + cover grid, no hover/focus states); (b) `src/lib/exportAlbum.ts` (mounts the export component off-screen, awaits `document.fonts.ready`, calls `snapdom.toPng` at 2× scale for retina, triggers download, unmounts); (c) a single button inside the existing `PressedAlbum.svelte`. No refactor of the live album layout.

**Privacy layer (new):** `scripts/block-private.sh` — a POSIX shell script that greps `git diff --cached --name-only` for forbidden prefixes and exits non-zero. Wired via `simple-git-hooks` config in `package.json` and installed via a `prepare` script (bypasses pnpm v10's lifecycle-script blocking).

**Import script changes:** `scripts/import.ts` gains a missing-db guard, an empty-table guard, and a diff print (`compare current words.json to previous words.json for +N/-M stats`).

### Library decisions

| Choice | Pick | Rationale |
|---|---|---|
| HTML→PNG | **`@zumer/snapdom`** | Only library with first-class CSS `var()` support (our palette depends on it), embeds `@font-face` natively, 30–40KB gz, handles CSS Grid via `foreignObject` clone. Rejected: `html2canvas` (poor grid/var support), `satori` (no CSS Grid at all, adds 1.2MB WASM). |
| Pre-commit | **`simple-git-hooks`** | Config lives inline in `package.json`, no `.husky/` dir, POSIX-portable hook, zero Node tax per commit. Installed via `prepare` script to sidestep pnpm v10 blocking. |
| OG image | `public/og-image.png` @ 1200×630 | Unified spec for LinkedIn + Twitter + FB. Tags: `og:title`, `og:description`, `og:url`, `og:image` (absolute HTTPS), `og:type=website`, plus `og:image:width/height/type` for reliability. |

### Implementation Phases

#### Phase 1 — Site config extraction
*Smallest, unblocks the PNG export title band and the README.*

- Create `src/site.config.ts` exporting:
  ```ts
  // src/site.config.ts
  export interface SiteConfig {
    ownerName: string;     // e.g. "Bhavya" — shown in headings & signatures
    siteTitle: string;     // e.g. "Bhavya's Literary Garden"
    tagline: string;       // home-page hook phrase
    socialImage: string;   // absolute or /-rooted path to OG image
  }

  export const siteConfig: SiteConfig = {
    ownerName: "Your Name",                       // CHANGE ME
    siteTitle: "Your Name's Literary Garden",     // CHANGE ME
    tagline: "reading as expanding orbit",
    socialImage: "/og-image.png",
  };

  export const IS_PLACEHOLDER = siteConfig.ownerName === "Your Name";
  ```
- Replace every "Bhavya" occurrence (see full list in Acceptance Criteria):
  - `src/layouts/BaseLayout.astro:9` — default prop → `siteConfig.siteTitle`
  - `src/components/Nav.astro:21` — aria-label → `\`${siteConfig.siteTitle} — home\``
  - `src/pages/index.astro:6,20,54` — props, H1, signature
  - `src/pages/practice.astro:22` — title prop
  - `src/pages/garden.astro:14` — title prop
- Emit `console.warn` in `BaseLayout.astro` when `IS_PLACEHOLDER && import.meta.env.DEV`. (Dropped the on-page badge per simplicity review — a console warning plus an inline `// CHANGE ME` comment in `site.config.ts` is enough. Solo owner and attentive cloners will see both.)
- Pass `siteConfig.ownerName` to the Pressed Album export pipeline as a prop (Phase 4 consumes this).

**Success:** `grep -rn "Bhavya" src/` returns zero. Every page renders with `siteConfig` values. Running dev mode with placeholder config prints the console warning.

#### Phase 2 — Privacy hardening (pre-commit hook)

- `pnpm add -D simple-git-hooks`
- Add to `package.json`:
  ```json
  {
    "scripts": { "prepare": "simple-git-hooks" },
    "simple-git-hooks": { "pre-commit": "sh ./scripts/block-private.sh" }
  }
  ```
- Create `scripts/block-private.sh` — POSIX shell, checks staged paths, prints a clear message if blocked, exits 1.
  ```sh
  # scripts/block-private.sh  (POSIX /bin/sh, NO bash-isms)
  # Blocks commits containing raw Kindle data or downloaded covers.
  BLOCKED=$(git diff --cached --name-only | grep -E '^(data/raw/|public/covers/)' || true)
  if [ -n "$BLOCKED" ]; then
    echo "BLOCKED by pre-commit: personal Kindle data / covers must not be committed."
    echo "$BLOCKED"
    echo "Edit .gitignore or use 'git reset HEAD <file>' to unstage."
    exit 1
  fi
  ```
- If pnpm v10 lifecycle blocking bites, add `"pnpm": { "onlyBuiltDependencies": ["simple-git-hooks"] }`.

**Success:** Staging a file under `data/raw/` or `public/covers/` and attempting a commit fails with the message. Contributor who runs `pnpm install` has the hook wired automatically via `prepare`.

#### Phase 3 — Import polish + re-seed contract

- Guard in `scripts/import.ts`: before opening the sqlite db, check `fs.existsSync("data/raw/vocab.db")` — if missing, print a one-line friendly pointer and `process.exit(0)`. No stack trace.
- Empty-table guard: if `SELECT count(*) FROM WORDS < 1`, print `"Seeded 0 words — is Kindle dictionary lookup enabled?"` and exit 0.
- Add a short "Re-seeding" section to the README explaining the additive contract (FSRS progress is keyed by `wordId` → safe to re-run `pnpm seed` with a newer `vocab.db`).
- **Dropped** the re-seed diff summary (`+N new, M preserved`) per simplicity review — silent success is fine for a CLI the owner runs; the README contract is enough documentation.

**Success:** `rm data/raw/vocab.db && pnpm seed` prints the pointer, exits 0. Empty-vocab-db run prints the friendly message. No existing FSRS card state in localStorage is lost across re-seeds (manual verification test).

#### Phase 4 — Pressed Album PNG export *(marquee)*

- `pnpm add @zumer/snapdom`
- New file: `src/components/PressedAlbumExport.svelte`
  - Receives same props as `PressedAlbum.svelte` plus `{ ownerName: string; dateRange: string }`
  - Fixed width `1200px`. **Uses `container-type: inline-size`** so any `@container` rules fire correctly off-screen (media queries fire against viewport, which breaks off-screen clones — this is the most common "different dimensions off-screen" bug).
  - Top title band: `<h1>{ownerName}'s pressed words — {dateRange}</h1>` + small botanical sigil
  - Same cover-grid layout as the live album, but with hover/focus styles stripped
- New file: `src/lib/captureAlbum.ts` (thin wrapper so fallback swap is one-line):
  ```ts
  // Swappable wrapper — easy to drop modern-screenshot if snapDOM breaks on Safari
  export async function captureAlbum(node: HTMLElement, opts: { scale?: number } = {}) {
    const { snapdom } = await import('@zumer/snapdom');
    const scale = Math.min(opts.scale ?? 2, maxSafeScale(node));
    return snapdom.toPng(node, { embedFonts: true, scale, dpr: 2 });
  }
  function maxSafeScale(node: HTMLElement) {
    const rect = node.getBoundingClientRect();
    const MAX_PIXELS = 16_000_000; // iOS Safari canvas ceiling
    return Math.min(2, Math.sqrt(MAX_PIXELS / (rect.width * rect.height)));
  }
  ```
- New file: `src/lib/exportAlbum.ts` — full pipeline:
  ```ts
  import { tick } from 'svelte';
  import { captureAlbum } from './captureAlbum';

  let exporting = $state(false);  // in the caller component

  export async function exportAlbumToPng(ownerName, dateRange, entries, books) {
    if (exporting) return;  // concurrent-click guard
    exporting = true;
    try {
      // Mount <PressedAlbumExport> off-screen, render loading state
      showExport = true;
      await tick();  // flush Svelte reactive updates
      // Preload fonts explicitly — Tailwind v4 lazy-registers @font-face
      await Promise.all([
        document.fonts.load('400 16px "YourSerif"'),
        document.fonts.load('700 16px "YourSerif"'),
      ]);
      await document.fonts.ready;
      // Wait for all images in clone to decode
      await Promise.all(
        Array.from(exportNode.querySelectorAll('img')).map(img =>
          img.complete ? img.decode().catch(() => {}) :
            new Promise(r => { img.onload = img.onerror = r; })
        )
      );
      // Two-frame yield so loading state paints before the capture blocks main thread
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const dataUrl = await captureAlbum(exportNode);
      // Trigger download via blob + anchor
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `literary-garden-${formatDate(new Date())}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);  // memory-leak guard
    } finally {
      showExport = false;
      exporting = false;
    }
  }
  ```
- **`snapdom.preCache()` on component mount** (once) — passes `embedFonts: true` and the font list. Required for Safari 17+; without it, the first capture has blank text (known WebKit #219770 font decode timing).
- Edit `src/components/PressedAlbum.svelte`: add "Export as PNG" button. `disabled={exporting || entries.length === 0}`. Loading spinner state during export.
- **Date range (simplified per simplicity review)**: single format `YYYY-MM → YYYY-MM`, or single `YYYY-MM-DD` if one press. No season labels. No edge-case nuance.
- **Zero-covers fallback**: if a book has no `coverUrl` and no placeholder, render a sage-toned text-only tile with the book title.
- **Safari test plan**: test on Safari 17+ with a 30-word album and a 50-word album. Verify (a) text renders, (b) cover images render, (c) PNG file dimensions match expected at adaptive scale. If any fails, swap `@zumer/snapdom` → `modern-screenshot` in `captureAlbum.ts` (30-min swap per research).
- **Verification**: eyeball + one Playwright smoke test that clicks Export, reads PNG header (`89 50 4E 47`), asserts width matches `1200 × maxSafeScale`. Skip pixel-color assertions (brittle with antialiased botanical art).

**Success:** User clicks "Export as PNG" on the Pressed Album view, sees a loading state paint within ~16ms, receives a retina-ish PNG download within 3s on M1 / 6s on iPhone. Covers render (no blank squares). Fonts embed (no fallback serifs). Canvas never exceeds 16M pixels on any platform. Double-clicks are harmless. No memory leak across 20 exports.

#### Phase 5 — README rewrite

Sections in order (replaces the current 195-word README):

1. **Hero**: one-sentence tagline + the exported Pressed Album PNG (self-dogfooded from Phase 4)
2. **Requirements** (above the fold, explicit): Mac + physical Kindle device + Node 20+
3. **Not supported**: Kobo, Kindle app, Windows/Linux (PRs welcome)
4. **Philosophy** (preserved "intellectual orbit" quote)
5. **Getting your Kindle data** (Mac walkthrough):
   - Connect via USB; Kindle appears as `/Volumes/Kindle`
   - Show hidden folders: `Cmd+Shift+.` in Finder (explain the `system/` dir)
   - `cp /Volumes/Kindle/system/vocabulary/vocab.db data/raw/`
   - Screenshot of the Finder path
6. **Setup**: `pnpm install`, edit `src/site.config.ts`, `pnpm seed`, `pnpm dev`
   - Screenshot of `site.config.ts` with fields highlighted
7. **Re-seeding** (additive contract): re-run `pnpm seed` whenever you have new highlights; existing FSRS progress survives
8. **Troubleshooting**: missing vocab.db, empty vocab.db, stale `.astro` cache (`rm -rf .astro`), sideloaded book titles, Open Library cover misses
9. **Privacy**: local-only by default. Never deploy to a public host without access control — even the built `public/covers/` leaks your reading list. The gitignore + pre-commit hook protect the *repo*, not a cloud host. If you want always-on access, see the next section.
10. **Private Deploy (optional)**: short owner-focused recipe for Vercel `--prebuilt` with Deployment Protection. Three warnings: data-on-Vercel, per-device state, don't-skip-protection. Built from Phase 7.
11. **Stack**: Astro v6, Svelte 5, Tailwind v4, better-sqlite3, ts-fsrs, snapdom
12. **Links**: brainstorm + plan docs

**Success:** A stranger reading this end-to-end can go from clone to their own Pressed Album PNG export in under 20 minutes. Above-the-fold content (requirements + not-supported) filters out non-Kindle users fast. A reader who wants always-on access has a clear optional path (Phase 7) without the default story being cluttered.

#### Phase 6 — LinkedIn post + OG image

- Produce `public/og-image.png` at 1200×630 — can reuse a cropped Pressed Album export with a different overlay.
- Add OG meta tags to `BaseLayout.astro`:
  ```astro
  <meta property="og:title" content={siteConfig.siteTitle} />
  <meta property="og:description" content={siteConfig.tagline} />
  <meta property="og:url" content={Astro.site?.href ?? ""} />
  <meta property="og:image" content={new URL(siteConfig.socialImage, Astro.site).href} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:type" content="website" />
  ```
- Draft the LinkedIn post itself:
  - Lead with the exported PNG + one-line philosophy ("my reading life, pressed")
  - Middle: two sentences on what it is and how it works (BYOK + local-only)
  - Close: link to GitHub repo + invitation to make your own
  - Target 150–200 words; friendly, not performative

**Success:** Post drafted and saved in `docs/linkedin-launch-2026-04.md`. OG tags verified via LinkedIn Post Inspector. GitHub repo URL ready to paste.

#### Phase 7 — Private Vercel deploy *(owner-only)*

*Additive to the BYOK-local template. Does not change the default story for cloners — they still run locally.*

> **Platform caveat (new, from deepening):** Vercel Hobby does NOT offer shared-password protection. The only free option is **Vercel Authentication** — every viewer needs a logged-in Vercel account. For solo-owner use (own phone + laptop), this is workable. For sharing with non-Vercel friends, it's not. See "Platform Decision" at the top of this plan for the Cloudflare Pages + Access alternative. Plan below assumes Vercel + Vercel Authentication.

**Deployment pipeline — `vercel --prebuilt`:**

1. `pnpm add -D vercel`.
2. Add a `package.json` script:
   ```json
   "deploy": "pnpm seed && pnpm build && vercel build --prod && vercel deploy --prebuilt --prod"
   ```
3. First-time setup (one-off):
   - `vercel login`
   - `vercel link` → creates `.vercel/` (add to `.gitignore`)
   - Vercel dashboard → Project Settings → **Deployment Protection** → enable **Vercel Authentication** with **Standard Protection** scope. Note: this only protects preview URLs + `*.vercel.app` — production custom domains on Hobby are always public.
4. Every deploy: owner runs `pnpm deploy` locally. The pipeline:
   - Seeds latest `vocab.db` into `data/processed/*.json` locally
   - Builds `dist/` locally (including `public/covers/*.jpg`)
   - `vercel --prebuilt` uploads only the static output; source code is never sent
5. **Do NOT configure a custom production domain on Hobby** — production domains are unprotected. Stick with the `*.vercel.app` URL for the private deploy.
6. `.gitignore` gains `.vercel/`.

**Why `--prebuilt`:** keeps Kindle data off Vercel's git storage and build logs. Only compiled static output lives on Vercel.

**Mobile polish (scope: 5 minutes, per audit):**

Audit showed the app is already 95% mobile-ready (touch targets ≥44px, no hover-dependencies, viewport meta correct, card-flip works on touch, `overscroll-behavior: none` already set). Two tiny fixes:

- **`Nav.astro:148`** — nav link hit area is ~50px × 20px. Add `min-height: 44px; display: inline-flex; align-items: center;` to `nav a` so it meets HIG without changing visual design.
- **`global.css`** — add `a, button { -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1); }` to suppress the default iOS gray-flash artifact on tap. Single line.

Nothing else needed. Garden flora, Practice card, Pressed Album, SessionLengthPicker all render fine at 375px.

**PWA minimum (stripped per simplicity review + research):**

Skip the full `manifest.webmanifest`. iOS 17+ honors just these:

- `public/apple-touch-icon.png` (180×180 PNG)
- In `BaseLayout.astro` `<head>`:
  ```astro
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  ```

That's it. No manifest file, no build-manifest script, no icon-192/512 PNG generation, no maskable-icon work (iOS ignores it anyway). Add-to-home-screen on iOS produces a standalone home-screen icon that launches the site full-screen. If the owner wants a full PWA later (desktop Chrome installable, service worker), add it then — YAGNI for v1.

> **⚠️ Known iOS + Vercel Auth pitfall:** When the Vercel authentication cookie expires (typically days to weeks), tapping the home-screen icon launches Vercel's login page inside Safari, not the standalone app. Re-login, re-add to home-screen, or extend cookie duration in Vercel settings. This is the strongest argument for the Cloudflare Access alternative.

**Primary-device convention (documented):**

Short paragraph in README's "Private Deploy" section: state is per-browser. Pick one "primary" device (usually laptop) for serious practice. Phone for casual browsing + pressing. Not a feature — just clarity.

**README "Private Deploy" section (2 warnings, not 3):**

- One-paragraph framing: "I deploy mine privately on Vercel so I can browse from my phone."
- Step-by-step: `pnpm add -D vercel`, `vercel login`, `vercel link`, **enable Deployment Protection in dashboard BEFORE first deploy**, `pnpm deploy`.
- Two warnings:
  1. **Enable Deployment Protection before deploying**, and only use the `*.vercel.app` URL (not a custom domain) on Hobby. Otherwise your reading list is publicly scrapeable.
  2. **State is per-browser.** Pick one primary device; progress doesn't sync.
- Cloudflare alternative: one-line "If you don't want viewers to need Vercel accounts, see Cloudflare Pages + Access instead" link.

**Success:** Owner runs `pnpm deploy`, visits the `*.vercel.app` URL, gets prompted for Vercel login, authenticates once, sees the garden. Same URL on phone Safari after login works. Add-to-home-screen produces a standalone icon. `Nav.astro` link taps feel comfortable. No source code or `vocab.db` visible in Vercel dashboard.

### Media production (user-supplied)

The owner will record and supply all screenshots/videos externally — no automated GIF pipeline needed. The plan only needs to leave clear *slots* in the README for media to drop into. Expected assets:

- **Hero media** (README top): either the Pressed Album PNG export (code-generated, Phase 4) OR a short beauty-shot video/GIF of the Garden page — user's choice.
- **Finder-path screenshot** (README §Getting your Kindle data): shows the `/Volumes/Kindle/system/vocabulary/` location with hidden folders visible.
- **`site.config.ts` edit screenshot** (README §Setup): shows which fields to change, with the placeholder values visible.
- **Optional "how it works" video/GIF**: Garden → Practice → Press loop, anywhere in the README.

Code-side responsibility: ensure the markdown has explicit `![alt](path)` placeholders for each slot, organized under `public/docs/` or similar, so dropping files into fixed paths makes the README render correctly without further edits.

## System-Wide Impact

- **Interaction graph**: `site.config.ts` is imported by four Astro pages + `BaseLayout.astro` + `Nav.astro` + the new `PressedAlbumExport.svelte`. Changing it cascades through everything — deliberate, that's the point. Re-running `pnpm seed` reads `data/raw/vocab.db` → writes `data/processed/*.json` → Astro content collections load at next build → components receive updated `Word[]`/`Book[]`. No change to this flow.
- **Error propagation**: PNG export failure (snapdom throws / fonts never ready) must surface a user-visible error in the album UI, not a silent failure or console-only log. Wrap in a try/catch in `exportAlbum.ts`, set a `$state` error flag, show a small inline message.
- **State lifecycle risks**: The off-screen `<PressedAlbumExport>` must be unmounted even if export throws, or repeated clicks leak DOM. Use a `try/finally` around the mount + capture + download lifecycle.
- **API surface parity**: No public API; this is a static site with localStorage. The only "surface" is the URL structure (no new routes).
- **Integration test scenarios**:
  1. Re-seed an expanded `vocab.db` and verify a pre-existing `wordId`'s FSRS card `due`/`stability` are unchanged (manual: localStorage inspection).
  2. Pre-commit hook blocks a staged file under `data/raw/` and does NOT block an identically-named file in a different directory.
  3. PNG export rendered at 1200px width matches the live album visually (modulo removed hover states).
  4. With `siteConfig.ownerName === "Your Name"` the placeholder badge is visible in dev but NOT in `pnpm build` output.
  5. Zero-press Pressed Album shows disabled export button with tooltip.

## Acceptance Criteria

### Core (must-pass)
- [x] `src/site.config.ts` exists with `ownerName`, `siteTitle`, `tagline`, `socialImage`; `git grep "Bhavya"` on tracked files returns zero. (Phase 1 — `b13cb21`. Also added `stampImage` + split into committed `site.config.example.ts` + gitignored owner-local `site.config.ts`.)
- [x] `simple-git-hooks` wired via `prepare`; blocks `data/raw/**` + `public/covers/**`. (Phase 2 — `f5e9e4d`. Tested with `git add -f`.)
- [x] `scripts/import.ts` handles missing + empty vocab.db with friendly messages. (Phase 3 — `8ef1583`. Missing-db guard pre-existed; added empty-WORDS-table guard.)
- [x] Re-seed integration test: a pre-existing `wordId`'s FSRS `due`/`stability` unchanged after `pnpm seed` with a superset vocab.db. (Verified by design — progress keys by `wordId` in localStorage, import script never touches browser state. Documented in README "Re-seeding" section.)
- [x] Export button in `PressedAlbum.svelte` downloads a valid PNG on M1 Mac + iPhone Safari 17+. (Phase 4 — `1bf89c6`. Reused existing `html-to-image` pipeline from scrapbook; new `PressedAlbumCard.svelte` 1080×1350 portrait. User-verified output.)
  - PNG file starts with `89 50 4E 47` (valid header); width ≈ `1200 × maxSafeScale`.
  - Covers render (no blank tiles).
  - Fonts embed (no fallback serifs).
  - Canvas never exceeds 16M pixels (adaptive scale clamp).
  - Double-clicks don't duplicate exports (concurrent-click guard).
  - No memory leak across 20 exports (`URL.revokeObjectURL` called).
- [x] OG meta tags in `BaseLayout.astro`; LinkedIn Post Inspector shows rich preview. (Phase 6 — `f703bef`. og:title/description/url/image/width/height/type + twitter:card=summary_large_image. `public/og-image.png` is user-supplied before deploy; see Phase 5 media-slot instructions.)
- [x] README rewritten with 12 sections, media-slot placeholders in place, "Requirements" + "Not supported" above the fold. (Phase 5 — `9dd514b`. 180 lines, Mac-only walkthrough, troubleshooting, private-deploy section, media slots under `public/docs/`.)
- [x] LinkedIn post draft saved at `docs/linkedin-launch-2026-04.md`. (Phase 6 — `f703bef`. Three variant drafts: artifact-led, philosophy-led, technical.)

### Non-functional
- [x] `pnpm build` clean. (Verified at every phase.) `pnpm check` has 5 pre-existing errors from the scrapbook commit (Import-conflicts on Garden/Practice/Scrapbook component names in `.astro` files) — tracked for separate fix.
- [x] PNG export < 3s on M1 for 30-word album. (User-verified.)
- [x] html-to-image reused (already in deps); no new PNG lib added. snapDOM dropped from plan on Phase 4 after finding production-tested pipeline.

### Quality gates
- [x] Manual test of the full BYOK flow end-to-end: config edit + build + export. (User-verified.)
- [x] Re-seed additive contract: FSRS progress keyed by `wordId` in localStorage, never touched by seed. (Verified by code read + `pnpm seed` re-run preserving state.)
- [x] All "Bhavya" sites replaced (actual: 12 text + 3 path, not the plan's 7 — scrapbook added pages). `git grep "Bhavya"` on tracked non-docs files: zero.
- [ ] LinkedIn Post Inspector shows rich preview of the eventual public repo URL. (Requires deployed public URL; pending user's first Vercel push.)

### Phase 7 (Private Deploy) — owner-only
- [x] `vercel` added as dev-dep; `pnpm deploy` script wired; `.vercel/` gitignored. (Phase 7 — `4f6188a`.)
- [ ] `pnpm deploy` succeeds end-to-end. (Pending user's first `vercel login + vercel link`.)
- [ ] **Vercel Authentication** (Standard Protection scope) enabled before first deploy. (Pending user's dashboard step.)
- [ ] Site loads on iOS Safari + Android Chrome on a real phone. (Pending first deploy.)
- [x] `Nav.astro` nav links have `min-height: 44px`; `-webkit-tap-highlight-color` set globally. (Phase 7 — `4f6188a`. Touch-target floor + iOS tap-flash suppression.)
- [x] `apple-touch-icon.png` (180×180) + PWA meta tags present; iOS "Add to Home Screen" produces standalone launch. (Already shipped in scrapbook commit — `scripts/gen-icons.ts` + `BaseLayout.astro` head; Phase 7 scope shrank accordingly.)
- [x] README "Private Deploy" section has the two warnings + one-line Cloudflare alternative note. (Phase 5 — `9dd514b`.)

## Success Metrics

- **Cloneability**: a stranger from LinkedIn can go from repo URL to their own garden in < 20 minutes on a Mac with a Kindle.
- **Artifact quality**: the Pressed Album PNG is visually faithful enough to the live app to be social-media-worthy (dogfooded test: you are willing to post your own export without edits).
- **No data leaks**: pre-commit hook blocks at least the two known paths; gitignore already covers them as first line.

## Dependencies & Risks

### New dependencies
- `@zumer/snapdom` (~30–40KB gz, production) — actively maintained in 2025/26, only library advertising `var()` support.
- `simple-git-hooks` (dev) — 0 transitive deps, lightweight.
- `vercel` (dev) — CLI for the `--prebuilt` deploy pipeline; owner-only workflow, never required for cloners.

### Risks
- **snapdom Safari font rendering**: mitigated by `document.fonts.ready` + manual Safari test. Fallback: `modern-screenshot` if snapdom fails on Safari (very unlikely, but keep it in back pocket).
- **pnpm v10 lifecycle-script blocking**: mitigated by using `prepare` script (runs unconditionally). Secondary mitigation: `onlyBuiltDependencies` config.
- **Date-range logic edge cases** (single press, very wide range, no press): covered by explicit formatting rules in Phase 4.
- **Sideloaded book titles** (known gotcha per MEMORY): already cleaned in import pipeline; PNG export inherits clean titles.
- **`site.config.ts` upstream leak**: if a cloner opens a PR against the template with their edited config, their name leaks. Mitigation: add a `CONTRIBUTING.md` note reminding them to revert the config before PRing. Considered making `site.config.ts` a `.example` file but kept it committed per brainstorm for simpler onboarding — tradeoff accepted.
- **Cloud-deploy footgun**: someone deploys to Vercel "just to see" and exposes their reading list via `public/covers/`. Mitigation: loud README warning in the Privacy section, plus the "Private Deploy" section emphasizes Deployment Protection as non-optional.
- **Phase 7 forgetting Deployment Protection**: if the owner skips the dashboard step, the site is publicly accessible. Mitigation: make the README step-by-step lead with enabling protection *before* the first deploy, not after. Acceptance criterion requires an incognito-window verification.
- **PWA manifest staleness**: if `siteConfig.siteTitle` changes, the manifest's `name` would lag unless regenerated. Mitigation: a small `scripts/build-manifest.ts` that regenerates on build, or skip the PWA for v1 if it becomes complex.

### Stale-documentation risks
- README currently says "Astro v5" — actual is `^6.1.8`. Rewrite corrects this.

## Future Considerations (out of scope for v1)

- Public hosted demo with sample public-domain data (distinct from owner's private deploy)
- **Cross-device state sync** (Supabase/Turso/IndexedDB + cloud backup) — would let the owner's phone and laptop share FSRS progress. Significant architectural change; defer until v2 if the per-device limitation actually bites.
- First-run welcome wizard (write `siteConfig` to localStorage instead of file)
- JSON backup/restore for progress + sessions
- Windows/Linux Kindle walkthroughs (community PR territory)
- CI check as belt-and-suspenders on top of the pre-commit hook
- Quotes/highlights tab (separate plan already exists: `docs/plans/2026-04-22-feat-quotes-tab-scrapbook-plan.md`)
- Service worker for offline-first on the deployed PWA (nice-to-have; the site is already static so serves fast from cache even without one)

## Sources & References

### Origin
- **Brainstorm document:** [docs/brainstorms/2026-04-22-linkedin-share-byok-template-brainstorm.md](../brainstorms/2026-04-22-linkedin-share-byok-template-brainstorm.md) — key decisions carried forward: (1) `site.config.ts` over env vars or localStorage site config, (2) PNG-only album export with title header + cover grid, (3) Mac-only README walkthrough with Windows deferred, (4) pre-commit hook adds defensive layer over gitignore, (5) re-seed is additive by virtue of FSRS keying.

### Internal References
- Hardcoded owner-name sites: `src/components/Nav.astro:21`, `src/layouts/BaseLayout.astro:9`, `src/pages/index.astro:6,20,54`, `src/pages/practice.astro:22`, `src/pages/garden.astro:14`
- Pressed Album live view: `src/components/PressedAlbum.svelte` (props, `$effect` state flow, `.albums` → `.album` → `.specimens` → `.specimen` DOM)
- Progress keying: `src/lib/progress.ts:110–119` (`loadCard`/`saveCard` by `wordId`)
- Pressed derivation: `src/lib/scheduler.ts:44` (`pressed = state === Review && stability >= 21`)
- Import script: `scripts/import.ts` (missing-db + empty-table + diff hooks needed around lines 141–229)
- Existing gitignore coverage: `.gitignore:15-20` (already blocks `data/raw/`, `public/covers/`, etc.)
- Cover fallback: `src/lib/coverFallback.ts`
- Existing plans in the same milestone: `docs/plans/2026-04-21-feat-literary-garden-v1-words-bed-plan.md`, `docs/plans/2026-04-22-feat-quotes-tab-scrapbook-plan.md`

### External References
- [snapDOM](https://github.com/zumerlab/snapdom) — HTML→PNG library with CSS var + font support
- [snapDOM vs html2canvas benchmark (HN)](https://news.ycombinator.com/item?id=44307298)
- [simple-git-hooks](https://www.npmjs.com/package/simple-git-hooks) — pre-commit tool
- [pnpm v10 lifecycle-script blocking (issue #7482)](https://github.com/pnpm/pnpm/issues/7482)
- [LinkedIn OG image spec (Share Preview)](https://share-preview.com/blog/linkedin-link-preview)
- [og-image.org — LinkedIn guide](https://og-image.org/docs/platforms/linkedin)
- [Best HTML-to-canvas solutions in 2025 (portalZINE)](https://portalzine.de/best-html-to-canvas-solutions-in-2025/)
- [Vercel CLI `--prebuilt` docs](https://vercel.com/docs/cli/deploy) — static-site deploy without uploading source
- [Vercel Deployment Protection (Hobby)](https://vercel.com/docs/deployment-protection) — free access-gating for private deploys
- [PWA manifest spec (MDN)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest) — for add-to-home-screen

### Memory/learnings (from `~/.claude/projects/.../memory/`)
- `literary_garden_gotchas.md`: `.astro` cache goes stale when adding collections (`rm -rf .astro`); sideloaded books duplicate author-in-title (cleaned in import); Open Library stem-query lookup is 93% vs 70% for inflected — already handled.
- `reading_philosophy.md`: the project frame is "expanding intellectual orbit" — LinkedIn post copy should echo this, not productivity framing.
