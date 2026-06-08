import type { PerformanceSummary, SortOrder } from "@/domain/types";

/**
 * 다중 지역 병렬 호출 결과를 병합한다 (D4).
 * 1. mt20id 기준 중복 제거
 * 2. sort 기준 정렬 (prfpdfrom ASC/DESC)
 */
export function mergePerformances(
  results: PerformanceSummary[][],
  sort: SortOrder,
): PerformanceSummary[] {
  // 중복 제거 (mt20id 기준, 먼저 나온 것 유지)
  const seen = new Set<string>();
  const merged: PerformanceSummary[] = [];
  for (const batch of results) {
    for (const item of batch) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }

  // 정렬: prfpdfrom 기준
  merged.sort((a, b) => {
    const cmp = a.period.from.localeCompare(b.period.from);
    return sort === "START_ASC" ? cmp : -cmp;
  });

  return merged;
}

/**
 * 병합된 배열에서 page 슬라이스를 잘라낸다.
 * @returns { items, hasNext }
 */
export function slicePage(
  all: PerformanceSummary[],
  page: number,
  rows: number,
): { items: PerformanceSummary[]; hasNext: boolean } {
  const start = (page - 1) * rows;
  const items = all.slice(start, start + rows);
  return { items, hasNext: start + rows < all.length };
}
