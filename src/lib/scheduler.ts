/**
 * Thin wrapper around ts-fsrs.
 *
 * The outside world uses three passive-recall ratings and three visual
 * "mastery" states — botanical, not algorithmic. This module is the only
 * place those translations live.
 *
 * Mastery rule (from the plan):
 *   🌱 seedling = state === New (never reviewed)
 *   🌸 in bloom = state ∈ {Learning, Relearning} OR (state === Review && stability < 21)
 *   🏵️ pressed = state === Review && stability >= 21
 *
 * Stability-based, not interval-based — stability is the underlying memory
 * strength; interval fluctuates with the retention target. 21 days matches
 * Anki's long-standing "mature" threshold.
 */

import { fsrs, createEmptyCard, Rating, State, type Card } from "ts-fsrs";

const PRESSED_STABILITY_DAYS = 21;

const scheduler = fsrs();

export type PassiveRating = "again" | "hard" | "good";
export type Mastery = "seedling" | "bloom" | "pressed";

const ratingMap = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
} as const satisfies Record<PassiveRating, Rating>;

export function emptyCard(): Card {
  return createEmptyCard();
}

export function nextState(card: Card, rating: PassiveRating, now: Date = new Date()): Card {
  const grade = ratingMap[rating];
  return scheduler.next(card, now, grade).card;
}

export function mastery(card: Card): Mastery {
  if (card.state === State.New) return "seedling";
  if (card.state === State.Review && card.stability >= PRESSED_STABILITY_DAYS) return "pressed";
  return "bloom";
}

/** Is this card due for review now? Seedlings are always eligible (they've never been reviewed). */
export function isDue(card: Card, now: Date = new Date()): boolean {
  if (card.state === State.New) return true;
  return card.due.getTime() <= now.getTime();
}
