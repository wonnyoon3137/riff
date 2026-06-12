"use client";

import { useQuery } from "@tanstack/react-query";
import type { Performance } from "@/domain/types";
import { DETAIL_GC_TIME, DETAIL_STALE_TIME } from "@/lib/query-config";

async function fetchPerformanceDetail(
  mt20id: string,
): Promise<Performance> {
  const res = await fetch(`/api/performances/${mt20id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch performance detail: ${res.status}`);
  }
  return res.json() as Promise<Performance>;
}

export function usePerformanceDetail(mt20id: string) {
  return useQuery<Performance, Error>({
    queryKey: ["performance", mt20id],
    queryFn: () => fetchPerformanceDetail(mt20id),
    enabled: !!mt20id,
    // 상세는 거의 불변 → 길게 캐시(kopis "상세 30~60분", query-config 참조).
    staleTime: DETAIL_STALE_TIME,
    gcTime: DETAIL_GC_TIME,
  });
}
