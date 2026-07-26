import { describe, expect, it } from "vitest";
import {
  addToComparison,
  removeFromComparison,
  toggleComparison,
  isSelected,
  canAdd,
  canView,
  MAX_COMPARE,
  MIN_COMPARE,
  type ComparisonPrompt,
} from "./state";

const makePrompt = (id: string): ComparisonPrompt => ({
  id,
  title: `Prompt ${id}`,
  creator: "GABC...",
  price: 5,
  category: "Marketing",
});

describe("comparison selection state", () => {
  it("adds prompts", () => {
    const list = addToComparison([], makePrompt("1"));
    expect(list.map((p) => p.id)).toEqual(["1"]);
  });

  it("does not add duplicates", () => {
    let list = addToComparison([], makePrompt("1"));
    list = addToComparison(list, makePrompt("1"));
    expect(list).toHaveLength(1);
  });

  it("caps the selection at MAX_COMPARE (4)", () => {
    let list: ComparisonPrompt[] = [];
    for (let i = 1; i <= 6; i++) {
      list = addToComparison(list, makePrompt(String(i)));
    }
    expect(list).toHaveLength(MAX_COMPARE);
    expect(list.map((p) => p.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("removes prompts by id without mutating input", () => {
    const original = [makePrompt("1"), makePrompt("2")];
    const list = removeFromComparison(original, "1");
    expect(list.map((p) => p.id)).toEqual(["2"]);
    expect(original).toHaveLength(2); // unchanged
  });

  it("toggles prompts in and out", () => {
    let list = toggleComparison([], makePrompt("1"));
    expect(isSelected(list, "1")).toBe(true);
    list = toggleComparison(list, makePrompt("1"));
    expect(isSelected(list, "1")).toBe(false);
  });

  it("canAdd is false once full", () => {
    const full = [makePrompt("1"), makePrompt("2"), makePrompt("3"), makePrompt("4")];
    expect(canAdd(full)).toBe(false);
    expect(canAdd(full.slice(0, 3))).toBe(true);
  });

  it("canView requires at least MIN_COMPARE (2)", () => {
    expect(canView([])).toBe(false);
    expect(canView([makePrompt("1")])).toBe(false);
    expect(canView([makePrompt("1"), makePrompt("2")])).toBe(true);
    expect(MIN_COMPARE).toBe(2);
  });
});
