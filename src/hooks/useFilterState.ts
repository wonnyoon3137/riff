"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FilterState } from "@/domain/types";
import {
  defaultFilterState,
  filterToQuery,
  queryToFilter,
} from "@/domain/filter-url";

const DEBOUNCE_MS = 300;

/**
 * 필터 URL 동기화는 `router.replace`가 아니라 native `history.replaceState`로
 * 쓴다(nextjs-patterns: "URL 쿼리 동기화(replaceState+debounce)").
 *
 * 이유(#22): `router.replace`는 라우터 전환을 시작하므로, 카드 클릭의 상세
 * 네비게이션과 같은 틱에 겹치면 서로를 덮어쓰는 레이스가 난다.
 * `history.replaceState`는 라우터 전환 없이 현재 히스토리 엔트리의 URL만
 * 갱신하므로 네비게이션과 경합하지 않는다. 뒤로가기 진입 시에는 페이지가
 * 다시 마운트되며 `useSearchParams`가 URL을 읽어 필터를 복원한다.
 */
function writeUrl(path: string): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", path);
}

export function useFilterState() {
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 보류 중인 URL 동기화 작업(타이머가 아직 실행되지 않은 경우).
  const pendingSyncRef = useRef<(() => void) | null>(null);

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

        // URL 동기화 작업을 보류 큐에 등록(flush 가능하도록).
        const sync = () => {
          const params = filterToQuery(resolved);
          const qs = params.toString();
          const path = qs ? `/?${qs}` : "/";
          writeUrl(path);
        };
        pendingSyncRef.current = sync;

        // Debounce URL sync (D6: 즉시반영 300ms)
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          pendingSyncRef.current = null;
          sync();
        }, DEBOUNCE_MS);

        return resolved;
      });
    },
    [],
  );

  /**
   * 보류 중인 debounce URL 동기화를 즉시 실행한다(#22).
   * 카드 클릭 등 다른 네비게이션 직전에 호출해, 보류 중이던
   * `router.replace`가 이후 네비게이션을 덮어쓰는 레이스를 제거한다.
   */
  const flushFilter = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingSyncRef.current) {
      const sync = pendingSyncRef.current;
      pendingSyncRef.current = null;
      sync();
    }
  }, []);

  const resetFilter = useCallback(() => {
    const def = defaultFilterState();
    setFilterInternal(def);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingSyncRef.current = null;
    writeUrl("/");
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { filter, setFilter, resetFilter, flushFilter };
}
