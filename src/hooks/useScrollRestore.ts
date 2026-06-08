"use client";

import { useEffect, useCallback } from "react";
import type { FilterState } from "@/domain/types";
import { filterHash } from "@/domain/filter-url";

function storageKey(filter: FilterState): string {
  return `riff:list:${filterHash(filter)}`;
}

/**
 * Save/restore scroll position for the list page.
 * - Call `saveScroll()` before navigating away.
 * - On mount, restores scrollY from sessionStorage (once data is ready).
 */
export function useScrollRestore(filter: FilterState, ready: boolean) {
  // Restore scroll position when ready
  useEffect(() => {
    if (!ready) return;
    const key = storageKey(filter);
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const y = Number(saved);
      if (Number.isFinite(y) && y > 0) {
        // Use requestAnimationFrame to ensure DOM has painted
        requestAnimationFrame(() => {
          window.scrollTo(0, y);
        });
      }
      sessionStorage.removeItem(key);
    }
  }, [filter, ready]);

  // Save current scroll position
  const saveScroll = useCallback(() => {
    const key = storageKey(filter);
    sessionStorage.setItem(key, String(window.scrollY));
  }, [filter]);

  return { saveScroll };
}
