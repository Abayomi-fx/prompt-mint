/**
 * #277 – Prompt comparison selection state.
 *
 * Pure, framework-agnostic helpers so the add/remove/cap/min rules can be
 * unit-tested independently of React. The React hook (useComparison) and the
 * localStorage persistence layer build on top of these.
 */

export interface ComparisonPrompt {
  id: string;
  title: string;
  creator: string;
  /** Price in XLM (already converted from stroops). */
  price: number;
  category: string;
  tags?: string[];
  /**
   * Average creator/prompt rating (0-5). Not tracked on the on-chain
   * PromptRecord — ratings live in the off-chain ReviewClient — so this is
   * usually undefined and rendered as a "No ratings" placeholder rather than
   * fabricated.
   */
  rating?: number;
  /** On-chain sales count (tracked on PromptRecord.salesCount). */
  salesCount?: number;
  licenseType?: string;
  isOwned?: boolean;
  preview?: string;
}

/** Maximum prompts that can be compared at once. */
export const MAX_COMPARE = 4;
/** Minimum prompts required before the comparison view is meaningful. */
export const MIN_COMPARE = 2;

/**
 * Adds a prompt to the selection.
 * - caps the list at {@link MAX_COMPARE}
 * - ignores duplicates (by id)
 * Returns a new array (never mutates the input).
 */
export function addToComparison(
  list: ComparisonPrompt[],
  prompt: ComparisonPrompt,
): ComparisonPrompt[] {
  if (list.length >= MAX_COMPARE) return list;
  if (list.some((p) => p.id === prompt.id)) return list;
  return [...list, prompt];
}

/** Removes a prompt by id. Returns a new array. */
export function removeFromComparison(
  list: ComparisonPrompt[],
  id: string,
): ComparisonPrompt[] {
  return list.filter((p) => p.id !== id);
}

/** Toggles a prompt in/out of the selection, honouring the cap. */
export function toggleComparison(
  list: ComparisonPrompt[],
  prompt: ComparisonPrompt,
): ComparisonPrompt[] {
  return isSelected(list, prompt.id)
    ? removeFromComparison(list, prompt.id)
    : addToComparison(list, prompt);
}

export function isSelected(list: ComparisonPrompt[], id: string): boolean {
  return list.some((p) => p.id === id);
}

/** True when another prompt can still be added. */
export function canAdd(list: ComparisonPrompt[]): boolean {
  return list.length < MAX_COMPARE;
}

/** True when there are enough selections to open the comparison view. */
export function canView(list: ComparisonPrompt[]): boolean {
  return list.length >= MIN_COMPARE;
}
