import { describe, it, expect, beforeEach } from "vitest";
import {
  listBookmarks,
  isBookmarked,
  addBookmark,
  removeBookmark,
  toggleBookmark,
  bookmarkCount,
  clearBookmarks,
  BOOKMARKS_STORAGE_KEY,
} from "@/lib/bookmarks/bookmarks";

describe("bookmarks storage (#284)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(listBookmarks()).toEqual([]);
    expect(bookmarkCount()).toBe(0);
  });

  it("adds a bookmark and reports it", () => {
    addBookmark("1");
    expect(isBookmarked("1")).toBe(true);
    expect(listBookmarks()).toEqual(["1"]);
    expect(bookmarkCount()).toBe(1);
  });

  it("add is idempotent (no duplicates)", () => {
    addBookmark("1");
    addBookmark("1");
    expect(listBookmarks()).toEqual(["1"]);
  });

  it("removes a bookmark", () => {
    addBookmark("1");
    addBookmark("2");
    removeBookmark("1");
    expect(isBookmarked("1")).toBe(false);
    expect(listBookmarks()).toEqual(["2"]);
  });

  it("remove is idempotent for missing ids", () => {
    addBookmark("1");
    removeBookmark("999");
    expect(listBookmarks()).toEqual(["1"]);
  });

  it("toggle adds then removes and returns state", () => {
    expect(toggleBookmark("5")).toBe(true);
    expect(isBookmarked("5")).toBe(true);
    expect(toggleBookmark("5")).toBe(false);
    expect(isBookmarked("5")).toBe(false);
  });

  it("persists across reads (round-trip through localStorage)", () => {
    addBookmark("a");
    addBookmark("b");
    // Simulate a fresh read from storage
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(listBookmarks().sort()).toEqual(["a", "b"]);
  });

  it("clears all bookmarks", () => {
    addBookmark("a");
    addBookmark("b");
    clearBookmarks();
    expect(listBookmarks()).toEqual([]);
    expect(bookmarkCount()).toBe(0);
  });

  it("tolerates corrupted storage gracefully", () => {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, "{not json");
    expect(listBookmarks()).toEqual([]);
    addBookmark("1");
    expect(listBookmarks()).toEqual(["1"]);
  });
});
