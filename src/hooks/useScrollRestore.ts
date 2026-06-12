"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FilterState } from "@/domain/types";
import {
  decideRestoreStep,
  listRestoreKey,
  parseRestore,
  serializeRestore,
} from "@/domain/list-restore";

interface ScrollRestoreArgs {
  /** 현재 적용 필터 (저장/복원 키 + 스냅샷). */
  filter: FilterState;
  /** 데이터(최소 1페이지)가 준비됐는지. */
  ready: boolean;
  /** 현재 캐시에 로드된 페이지 수. */
  loadedPages: number;
  /** 더 가져올 페이지가 있는지. */
  hasNextPage: boolean;
  /** 추가 페이지를 가져오는 중인지. */
  isFetchingNextPage: boolean;
  /** 다음 페이지 로드 트리거. */
  fetchNextPage: () => void;
  /** 근사 총 건수(스냅샷 보관용). */
  totalCount?: number;
}

/**
 * 목록 스크롤 + 로드 페이지 수 복원 (D2/D8).
 *
 * #23 수정: 과거에는 scrollY만 저장·복원했다. 무한 스크롤로 2페이지 이상
 * 로드한 상태에서 복귀하면, 콘텐츠 높이가 확보되기 전에 scrollTo가 실행돼
 * 위치가 클램프됐다. 이제 `loadedPages`를 함께 저장하고, 복원 시 그 페이지
 * 수만큼 `fetchNextPage`로 채운 뒤(콘텐츠 높이 확보) scrollTo를 실행한다.
 */
export function useScrollRestore({
  filter,
  ready,
  loadedPages,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  totalCount,
}: ScrollRestoreArgs) {
  // 진행 중인 복원 작업(저장된 스냅샷). null이면 복원 비활성.
  const pendingRef = useRef<{ scrollY: number; loadedPages: number } | null>(
    null,
  );
  // 동일 키에 대해 스냅샷을 한 번만 읽도록 가드.
  const initializedKeyRef = useRef<string | null>(null);

  // 1) ready가 되면 스냅샷을 한 번 읽어 복원 작업을 시작한다.
  useEffect(() => {
    if (!ready) return;
    const key = listRestoreKey(filter);
    if (initializedKeyRef.current === key) return;
    initializedKeyRef.current = key;

    const snapshot = parseRestore(sessionStorage.getItem(key));
    if (!snapshot) {
      pendingRef.current = null;
      return;
    }
    // 스냅샷 소비(1회성). 더는 재진입 시 복원하지 않는다.
    sessionStorage.removeItem(key);
    if (snapshot.scrollY <= 0 && snapshot.loadedPages <= 1) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = {
      scrollY: snapshot.scrollY,
      loadedPages: snapshot.loadedPages,
    };
  }, [filter, ready]);

  // 2) 복원 진행: 필요한 페이지를 채우고, 충분하면 scrollTo.
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || !ready) return;
    if (isFetchingNextPage) return; // 로드 완료 대기

    const step = decideRestoreStep(
      { loadedPages: pending.loadedPages },
      loadedPages,
      hasNextPage,
    );

    if (step.action === "fetch") {
      fetchNextPage();
      return;
    }

    // 콘텐츠 높이 확보됨 → 페인트 후 스크롤.
    const targetY = pending.scrollY;
    pendingRef.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, targetY);
      });
    });
  }, [
    ready,
    loadedPages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  // 이탈 시 현재 스크롤 + 로드 페이지 수 저장.
  const saveScroll = useCallback(() => {
    const key = listRestoreKey(filter);
    sessionStorage.setItem(
      key,
      serializeRestore({
        filter,
        scrollY: window.scrollY,
        loadedPages: Math.max(1, loadedPages),
        totalCount,
      }),
    );
  }, [filter, loadedPages, totalCount]);

  return { saveScroll };
}
