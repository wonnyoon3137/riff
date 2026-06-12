import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUERY_OPTIONS,
  DETAIL_GC_TIME,
  DETAIL_STALE_TIME,
  LIST_GC_TIME,
  LIST_STALE_TIME,
  PERFORMANCES_MAX_PAGES,
} from "@/lib/query-config";

const MIN = 60 * 1000;

describe("query-config 캐시 값 (#17 / data-model §7.3 + kopis 캐싱 권장)", () => {
  it("목록은 kopis 권장 '5~10분' 범위 안이다", () => {
    expect(LIST_STALE_TIME).toBe(5 * MIN);
    expect(LIST_GC_TIME).toBe(10 * MIN);
    // gcTime ≥ staleTime: 신선 만료 후에도 캐시가 폐기 전까지 D8 복원에 쓰인다.
    expect(LIST_GC_TIME).toBeGreaterThanOrEqual(LIST_STALE_TIME);
  });

  it("상세는 kopis 권장 '30~60분' 범위 안이며 목록보다 길다", () => {
    expect(DETAIL_STALE_TIME).toBe(30 * MIN);
    expect(DETAIL_GC_TIME).toBe(60 * MIN);
    expect(DETAIL_STALE_TIME).toBeGreaterThan(LIST_STALE_TIME);
    expect(DETAIL_GC_TIME).toBeGreaterThan(LIST_GC_TIME);
  });

  it("전역 디폴트는 목록 기준값을 사용하고 포커스 refetch를 끈다", () => {
    expect(DEFAULT_QUERY_OPTIONS.staleTime).toBe(LIST_STALE_TIME);
    expect(DEFAULT_QUERY_OPTIONS.gcTime).toBe(LIST_GC_TIME);
    expect(DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus).toBe(false);
    expect(DEFAULT_QUERY_OPTIONS.retry).toBe(1);
  });

  it("maxPages는 D8 복원/D2 무한스크롤 충돌 때문에 미설정(undefined)이다", () => {
    expect(PERFORMANCES_MAX_PAGES).toBeUndefined();
  });
});
