import { useCallback, useEffect, useState } from "react";
import {
  listBookmarks,
  isBookmarked as isBookmarkedStore,
  addBookmark as addStore,
  removeBookmark as removeStore,
  toggleBookmark as toggleStore,
  clearBookmarks as clearStore,
  BOOKMARKS_STORAGE_KEY,
} from "@/lib/bookmarks/bookmarks";

export interface UseBookmarksReturn {
  bookmarks: string[];
  count: number;
  isBookmarked: (_promptId: string) => boolean;
  add: (_promptId: string) => void;
  remove: (_promptId: string) => void;
  toggle: (_promptId: string) => boolean;
  clear: () => void;
  refresh: () => void;
}

/**
 * Hook exposing the localStorage-backed bookmark/favorites primitive (#284).
 * Also syncs across tabs via the `storage` event.
 */
export function useBookmarks(): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setBookmarks(listBookmarks());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === BOOKMARKS_STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const add = useCallback((promptId: string) => {
    setBookmarks(addStore(promptId));
  }, []);

  const remove = useCallback((promptId: string) => {
    setBookmarks(removeStore(promptId));
  }, []);

  const toggle = useCallback((promptId: string) => {
    const nowBookmarked = toggleStore(promptId);
    setBookmarks(listBookmarks());
    return nowBookmarked;
  }, []);

  const clear = useCallback(() => {
    clearStore();
    setBookmarks([]);
  }, []);

  const isBookmarked = useCallback(
    (promptId: string) => bookmarks.includes(promptId),
    [bookmarks]
  );

  return {
    bookmarks,
    count: bookmarks.length,
    isBookmarked,
    add,
    remove,
    toggle,
    clear,
    refresh,
  };
}
