import { describe, it, expect } from "vitest";
import { mergePerformances, slicePage } from "@/server/kopis/merge";
import type { PerformanceSummary, SortOrder } from "@/domain/types";

/**
 * #13 (T-02) — 지역 다중 병합 페이지네이션 정확도 회귀 테스트.
 * 범위(R5): 시도 레벨 병합만. 구군은 v0.2 보류.
 *
 * 이 테스트는 두 가지를 고정한다:
 *  1) 올바른 페이지네이션(전량 누적 fetch → 전역 병합 → 전역 slice)은 누락/중복이 없다.
 *  2) 현행 route.ts 방식(지역별 cpage=page 호출 후 항상 slicePage(...,1,...))은
 *     page>1 에서 ground-truth 와 어긋난다(정확도 결함을 명시적으로 박제).
 */

function regionData(region: string, count: number, seed: number): PerformanceSummary[] {
  const out: PerformanceSummary[] = [];
  for (let i = 0; i < count; i++) {
    const day = String(1 + ((i * 7 + seed) % 28)).padStart(2, "0");
    out.push({
      id: `${region}-${String(i).padStart(3, "0")}`,
      title: `${region} ${i}`,
      period: { from: `2026-07-${day}`, to: `2026-07-${day}` },
      venueName: `${region} 장`,
      genreLabel: "뮤지컬",
      state: "UPCOMING",
    });
  }
  out.sort((a, b) => a.period.from.localeCompare(b.period.from));
  return out;
}

function kopisPage(all: PerformanceSummary[], cpage: number, rows: number) {
  const start = (cpage - 1) * rows;
  return all.slice(start, start + rows);
}

function groundTruth(
  regions: PerformanceSummary[][],
  page: number,
  rows: number,
  sort: SortOrder,
) {
  return slicePage(mergePerformances(regions, sort), page, rows).items.map((i) => i.id);
}

function correctAlgo(
  regions: PerformanceSummary[][],
  page: number,
  rows: number,
  sort: SortOrder,
) {
  const need = page * rows;
  const fetched = regions.map((all) => kopisPage(all, 1, need));
  return slicePage(mergePerformances(fetched, sort), page, rows).items.map((i) => i.id);
}

function currentRouteAlgo(
  regions: PerformanceSummary[][],
  page: number,
  rows: number,
  sort: SortOrder,
  multiplier: number,
) {
  const fetchRows = rows * multiplier;
  const fetched = regions.map((all) => kopisPage(all, page, fetchRows));
  return slicePage(mergePerformances(fetched, sort), 1, rows).items.map((i) => i.id);
}

describe("#13 지역 다중 병합 페이지네이션 (시도 레벨, R5)", () => {
  const regions = [
    regionData("11", 80, 0),
    regionData("41", 80, 3),
    regionData("26", 80, 5),
  ];
  const ROWS = 30;
  const SORT: SortOrder = "START_ASC";

  it("올바른 알고리즘: 모든 페이지가 누락/중복 없이 ground-truth 와 일치", () => {
    const seen = new Set<string>();
    for (let page = 1; page <= 4; page++) {
      const got = correctAlgo(regions, page, ROWS, SORT);
      expect(got).toEqual(groundTruth(regions, page, ROWS, SORT));
      for (const id of got) {
        expect(seen.has(id)).toBe(false); // 페이지 간 중복 없음
        seen.add(id);
      }
    }
  });

  it("현행 route.ts 방식: page>1 에서 ground-truth 와 어긋남(결함 박제)", () => {
    // page 1 은 우연히 일치할 수 있으나 page 2 는 누락 발생.
    const page2Current = currentRouteAlgo(regions, 2, ROWS, SORT, 2);
    const page2Truth = groundTruth(regions, 2, ROWS, SORT);
    expect(page2Current).not.toEqual(page2Truth);

    // 결함의 본질: 전역 page-2 윈도우에 와야 할 항목이 현행 결과에서 빠진다.
    const missing = page2Truth.filter((id) => !page2Current.includes(id));
    expect(missing.length).toBeGreaterThan(0);
  });
});
