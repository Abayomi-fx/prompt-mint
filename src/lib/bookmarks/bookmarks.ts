/**
 * Bookmark / favorites storage (#284).
 *
 * Self-contained, localStorage-backed favorites primitive. The marketplace
 * already ships a server-backed "saved prompts" feature (see
 * lib/marketplace/saveApi + FetchAllPrompts), which is wallet-gated. This
 * module is the issue's requested self-contained alternative: it works
 * without a wallet or backend and is fully unit-testable.
 *
 * Storage uses a single versioned key so the shape can evolve safely.
 */

export const BOOKMARKS_STORAGE_KEY = "prompt-mint:bookmarks:v1";

function safeRead(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // De-duplicate and coerce to strings defensively.
    return Array.from(new Set(parsed.map((v) => String(v))));
  } catch {
    return [];
  }
}

function safeWrite(ids: string[]): boolean {
  try {
    localStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(ids)))
    );
    return true;
  } catch {
    return false;
  }
}

/** Returns all bookmarked prompt ids. */
export function listBookmarks(): string[] {
  return safeRead();
}

/** Whether a prompt id is bookmarked. */
export function isBookmarked(promptId: string): boolean {
  return safeRead().includes(promptId);
}

/** Adds a bookmark (idempotent). Returns the new list. */
export function addBookmark(promptId: string): string[] {
  const ids = safeRead();
  if (!ids.includes(promptId)) {
    ids.push(promptId);
    safeWrite(ids);
  }
  return ids;
}

/** Removes a bookmark (idempotent). Returns the new list. */
export function removeBookmark(promptId: string): string[] {
  const next = safeRead().filter((id) => id !== promptId);
  safeWrite(next);
  return next;
}

/** Toggles a bookmark. Returns true if now bookmarked, false otherwise. */
export function toggleBookmark(promptId: string): boolean {
  if (isBookmarked(promptId)) {
    removeBookmark(promptId);
    return false;
  }
  addBookmark(promptId);
  return true;
}

/** Number of prompts the current user has bookmarked. */
export function bookmarkCount(): number {
  return safeRead().length;
}

/** Clears all bookmarks. */
export function clearBookmarks(): boolean {
  try {
    localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
