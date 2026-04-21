/**
 * localStorage-backed progress store for the words bed.
 *
 * One canonical card per {lang}:{word}. Schema version is stamped at the top
 * level so future migrations can be intentional, not accidental.
 *
 * Runs only in the browser — guarded to stay SSR-safe.
 */

import type { Card } from "ts-fsrs";
import { emptyCard } from "./scheduler";

const STORAGE_KEY = "literary-garden:progress:v1";
const SCHEMA_VERSION = 1 as const;

interface SerializedCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

interface Store {
  version: typeof SCHEMA_VERSION;
  cards: Record<string, SerializedCard>;
}

function emptyStore(): Store {
  return { version: SCHEMA_VERSION, cards: {} };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStore(): Store {
  if (!isBrowser()) return emptyStore();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Store;
    if (parsed.version !== SCHEMA_VERSION) {
      // Migration stub — future versions plug in here. For v1 we archive and reset.
      archiveCorruptStore(raw, `unknown-version-${parsed.version}`);
      return emptyStore();
    }
    return parsed;
  } catch {
    archiveCorruptStore(raw, "parse-error");
    return emptyStore();
  }
}

function writeStore(store: Store): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    // Quota, private mode, storage disabled. Surface via custom event so the UI can warn.
    window.dispatchEvent(new CustomEvent("garden:storage-failed", { detail: err }));
  }
}

function archiveCorruptStore(raw: string, reason: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY}:corrupt:${Date.now()}:${reason}`, raw);
  } catch {
    // best effort — if even this write fails, we accept the loss silently
  }
}

function serialize(card: Card): SerializedCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString(),
  };
}

function deserialize(row: SerializedCard): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

/** Load a card's state. Returns a fresh empty card if it's never been reviewed. */
export function loadCard(wordId: string): Card {
  const row = readStore().cards[wordId];
  return row ? deserialize(row) : emptyCard();
}

export function saveCard(wordId: string, card: Card): void {
  const store = readStore();
  store.cards[wordId] = serialize(card);
  writeStore(store);
}

export function loadAll(): Record<string, Card> {
  const store = readStore();
  return Object.fromEntries(
    Object.entries(store.cards).map(([id, row]) => [id, deserialize(row)]),
  );
}

/** Danger — for dev tools only. */
export function clearAll(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
