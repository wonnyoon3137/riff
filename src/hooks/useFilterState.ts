"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { FilterState } from "@/domain/types";
import {
  defaultFilterState,
  filterToQuery,
  queryToFilter,
} from "@/domain/filter-url";

const DEBOUNCE_MS = 300;

export function useFilterState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize from URL
  const [filter, setFilterInternal] = useState<FilterState>(() =>
    queryToFilter(searchParams),
  );

  // Sync URL -> state on external navigation (e.g., browser back)
  useEffect(() => {
    const fromUrl = queryToFilter(searchParams);
    setFilterInternal(fromUrl);
  }, [searchParams]);

  // Debounced URL update
  const setFilter = useCallback(
    (next: FilterState | ((prev: FilterState) => FilterState)) => {
      setFilterInternal((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;

        // Debounce URL sync
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          const params = filterToQuery(resolved);
          const qs = params.toString();
          const path = qs ? `/?${qs}` : "/";
          router.replace(path, { scroll: false });
        }, DEBOUNCE_MS);

        return resolved;
      });
    },
    [router],
  );

  const resetFilter = useCallback(() => {
    const def = defaultFilterState();
    setFilterInternal(def);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    router.replace("/", { scroll: false });
  }, [router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { filter, setFilter, resetFilter };
}
