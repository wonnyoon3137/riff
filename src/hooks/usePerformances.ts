"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type {
  FilterState,
  PerformanceListResponse,
} from "@/domain/types";
import { filterToQuery, filterHash } from "@/domain/filter-url";

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
  });
}
