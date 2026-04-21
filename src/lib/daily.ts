/**
 * Daily practice queue.
 *
 * The daily queue is an in-memory derivation from:
 *   1. the full words corpus (static, from content collections)
 *   2. the user's FSRS progress (from localStorage)
 *   3. today's date (in the user's local timezone)
 *
 * Rules (plan § Phase 3 > Daily selection logic):
 *   - Due reviews first (oldest `due` first), capped at 2× newCardsPerDay = 10.
 *   - Then up to NEW_PER_DAY = 5 seedlings.
 *   - Seedling order is a deterministic shuffle seeded by YYYY-MM-DD, so a
 *     refresh mid-session doesn't re-draw the 5.
 *   - Pressed cards (stability ≥ 21, state === Review) are *never* in the queue —
 *     they live in /album and are not due for active practice in v1.
 */

import type { Card } from "ts-fsrs";
import { State } from "ts-fsrs";
import { mastery, isDue } from "./scheduler";
import { loadAll } from "./progress";

export const NEW_PER_DAY = 5;
export const REVIEW_CAP = NEW_PER_DAY * 2; // 10

export interface QueueItem<T> {
  word: T;
  card: Card;
  origin: "review" | "new";
}

/**
 * mulberry32 — tiny deterministic PRNG. Seeded from a 32-bit integer derived
 * from the date string so the daily draw is stable across refreshes.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

/** YYYY-MM-DD in the user's local timezone. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rnd = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Build today's queue. `getCard(wordId)` lets callers inject a card lookup
 * (we default to localStorage via loadAll but this keeps the function pure-
 * testable without a window global).
 */
export function buildQueue<T extends { id: string }>(
  allWords: T[],
  cardsByWordId: Record<string, Card>,
  now: Date = new Date(),
): QueueItem<T>[] {
  const today = todayKey(now);
  const seed = hashString(today);

  const reviews: QueueItem<T>[] = [];
  const seedlings: T[] = [];

  for (const word of allWords) {
    const card = cardsByWordId[word.id];
    if (!card) {
      seedlings.push(word);
      continue;
    }
    const m = mastery(card);
    if (m === "pressed") continue; // archived — lives in /album
    if (m === "seedling") {
      seedlings.push(word);
      continue;
    }
    // m === "bloom" → check if due
    if (isDue(card, now)) {
      reviews.push({ word, card, origin: "review" });
    }
  }

  // Reviews: oldest due first. Use last_review or due as sort key; earlier due = more overdue.
  reviews.sort((a, b) => {
    const da = a.card.due.getTime();
    const db = b.card.due.getTime();
    return da - db;
  });
  const cappedReviews = reviews.slice(0, REVIEW_CAP);

  // Seedlings: deterministic shuffle by date seed, then take NEW_PER_DAY.
  const shuffledSeedlings = shuffleWithSeed(seedlings, seed);
  const newItems: QueueItem<T>[] = shuffledSeedlings
    .slice(0, NEW_PER_DAY)
    .map((word) => ({
      word,
      card: (cardsByWordId[word.id] ??
        // fresh empty card for display purposes; not persisted until user rates
        ({
          due: now,
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: 0,
          reps: 0,
          lapses: 0,
          state: State.New,
        } as Card)),
      origin: "new" as const,
    }));

  return [...cappedReviews, ...newItems];
}

/**
 * Convenience for the Svelte component: read localStorage, build queue, return.
 * Browser-only.
 */
export function buildQueueFromProgress<T extends { id: string }>(
  allWords: T[],
  now: Date = new Date(),
): QueueItem<T>[] {
  const cards = loadAll();
  return buildQueue(allWords, cards, now);
}
