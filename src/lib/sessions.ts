/**
 * Session log — records each completed practice session so the Garden view
 * can reconstruct a time-navigable plot (day / week / month / year).
 *
 * Stored in localStorage under a versioned key. All dates are ISO strings so
 * we don't deserialize Dates by hand.
 */

const SESSION_LOG_KEY = "literary-garden:sessions:v1";

export interface SessionRecord {
  /** Stable id for this session (date + random suffix). */
  id: string;
  /** ISO datetime the session was completed. */
  completedAt: string;
  /** Total cards the user rated in this session. */
  wordsReviewed: number;
  /** Words that transitioned into the "bloom" state in this session. */
  wordsBloomed: number;
  /** Words that transitioned into the "pressed" state in this session. */
  wordsPressed: number;
  /** The book that contributed the most words to this session (null if mixed/unknown). */
  dominantBookId: string | null;
  /** The word ids rated in this session (ordered). Used for tooltip. */
  wordIds: string[];
}

export function loadSessions(): SessionRecord[] {
  try {
    const raw = window.localStorage.getItem(SESSION_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SessionRecord[];
  } catch {
    return [];
  }
}

export function saveSession(record: SessionRecord): void {
  try {
    const existing = loadSessions();
    existing.push(record);
    window.localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(existing));
  } catch {
    // noop — localStorage may be unavailable (private mode, quota)
  }
}

/** Generate a stable-ish session id. */
export function makeSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Filter sessions to those completed within the given time window.
 * `start` inclusive, `end` exclusive — both ISO strings.
 */
export function sessionsInWindow(
  sessions: SessionRecord[],
  startISO: string,
  endISO: string,
): SessionRecord[] {
  return sessions.filter((s) => s.completedAt >= startISO && s.completedAt < endISO);
}
