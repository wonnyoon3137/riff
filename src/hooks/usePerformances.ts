"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type {
  FilterState,
  PerformanceListResponse,
} from "@/domain/types";
import { filterToQuery, filterHash } from "@/domain/filter-url";
import {
  LIST_GC_TIME,
  LIST_STALE_TIME,
  PERFORMANCES_MAX_PAGES,
} from "@/lib/query-config";

const ROWS_PER_PAGE = 30;

async function fetchPerformances(
  filter: FilterState,
  page: number,
): Promise<PerformanceListResponse> {
  const params = filterToQuery(filter);
  params.set("page", String(page));
  params.set("rows", String(ROWS_PER_PAGE));

  const res = await fetch(`/api/performances?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch performances: ${res.status}`);
  }
  return res.json() as Promise<PerformanceListResponse>;
}

export function usePerformances(filter: FilterState) {
  const normalizedKey = filterHash(filter);

  return useInfiniteQuery<
    PerformanceListResponse,
    Error,
    { pages: PerformanceListResponse[]; pageParams: number[] },
    [string, string],
    number
  >({
    queryKey: ["performances", normalizedKey],
    queryFn: ({ pageParam }) => fetchPerformances(filter, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    // 목록 캐시(kopis "목록 5~10분"). gcTime은 D8 복귀 왕복 동안 누적 페이지가
    // 살아남아 재요청 0으로 복원되도록 한다(query-config 참조).
    staleTime: LIST_STALE_TIME,
    gcTime: LIST_GC_TIME,
    // maxPages 미설정: 상한 페이지 윈도잉은 D8 복원/D2 무한스크롤과 충돌하므로
    // 메모리 상한은 gcTime으로 관리한다(상세 근거: query-config PERFORMANCES_MAX_PAGES).
    maxPages: PERFORMANCES_MAX_PAGES,
  });
}
