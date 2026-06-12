/**
 * #13 (T-02) — 지역 다중 병합 페이지네이션 정확도/부하 검증 하네스
 *
 * 범위(R5): 시도(sido) 레벨 병합만. 구군은 v0.2 보류 — 검증 대상 아님.
 *
 * 목적: D4 다중 지역 선택 시 BFF 병합 페이지네이션이
 *   (a) 누락(omission) 없이,
 *   (b) 중복(duplication) 없이
 * 클라이언트 페이지를 만들어내는지, 그리고 KOPIS 호출 수(부하)를 검증한다.
 *
 * 서비스키 없이 실행 가능 — KOPIS 응답을 결정적 합성 데이터로 시뮬레이션한다.
 * (실측 부하는 #12 rate-limit-probe 로 별도 측정; 여기선 "호출 수" = 알고리즘적 부하)
 *
 * 실행: pnpm tsx scripts/measure/region-merge-verify.ts
 *
 * 핵심 발견(현행 route.ts 알고리즘):
 *   각 지역을 cpage=page 로 호출하고, 병합 후 항상 slicePage(..., 1, rows) 한다.
 *   → 지역별 페이지 경계와 "전역 정렬 병합" 경계가 어긋나
 *     클라이언트 page>1 에서 누락·중복이 발생한다.
 *   올바른 알고리즘: 모든 지역을 1..page 까지(또는 충분히) fetch 후 전역 병합·정렬하고
 *     slicePage(merged, page, rows) 로 전역 오프셋을 자른다.
 */

import { mergePerformances, slicePage } from "../../src/server/kopis/merge";
import type { PerformanceSummary, SortOrder } from "../../src/domain/types";

// ---- 합성 KOPIS 데이터: 지역별 시작일 오름차순 정렬된 공연 목록 ----
function makeRegionData(
  region: string,
  count: number,
  seed: number,
): PerformanceSummary[] {
  const out: PerformanceSummary[] = [];
  for (let i = 0; i < count; i++) {
    // 시작일을 지역마다 interleave 되도록 분산 → 전역 정렬 시 지역이 섞인다.
    const dayOffset = (i * 7 + seed) % 28;
    const day = String(1 + dayOffset).padStart(2, "0");
    out.push({
      id: `${region}-${String(i).padStart(3, "0")}`,
      title: `${region} 공연 ${i}`,
      period: { from: `2026-07-${day}`, to: `2026-07-${day}` },
      venueName: `${region} 공연장`,
      genreLabel: "뮤지컬",
      state: "UPCOMING",
    });
  }
  // 시작일 ASC 정렬(KOPIS 응답 가정은 정렬 보장 없으나, 정렬돼 있어도 버그 발생함을 보이기 위해)
  out.sort((a, b) => a.period.from.localeCompare(b.period.from));
  return out;
}

/** 지역별 KOPIS 응답 페이지를 흉내낸다(cpage/rows 슬라이스). */
function kopisRegionPage(
  all: PerformanceSummary[],
  cpage: number,
  rows: number,
): PerformanceSummary[] {
  const start = (cpage - 1) * rows;
  return all.slice(start, start + rows);
}

// ---- 현행 route.ts 알고리즘 (버그 재현) ----
function currentAlgo(
  regions: PerformanceSummary[][],
  clientPage: number,
  rows: number,
  sort: SortOrder,
  fetchMultiplier: number,
): { items: PerformanceSummary[]; calls: number } {
  const fetchRows = rows * fetchMultiplier;
  let calls = 0;
  const regionResults = regions.map((all) => {
    calls++;
    return kopisRegionPage(all, clientPage, fetchRows); // cpage = clientPage
  });
  const merged = mergePerformances(regionResults, sort);
  const { items } = slicePage(merged, 1, rows); // 항상 page 1
  return { items, calls };
}

// ---- 올바른 알고리즘 (제안 수정) ----
function correctAlgo(
  regions: PerformanceSummary[][],
  clientPage: number,
  rows: number,
  sort: SortOrder,
): { items: PerformanceSummary[]; calls: number } {
  // 전역 page*rows 개를 보장하려면 각 지역에서 page*rows 개까지 누적 fetch.
  // 여기선 단순화를 위해 지역 KOPIS rows<=100 가정 하에 page*rows 를 한 번에 요청.
  const need = clientPage * rows;
  let calls = 0;
  const regionResults = regions.map((all) => {
    calls++;
    return kopisRegionPage(all, 1, need); // 1페이지부터 need 개
  });
  const merged = mergePerformances(regionResults, sort);
  const { items } = slicePage(merged, clientPage, rows); // 전역 오프셋
  return { items, calls };
}

/** 검증의 기준(ground truth): 모든 지역 전량 병합 후 전역 슬라이스. */
function groundTruth(
  regions: PerformanceSummary[][],
  clientPage: number,
  rows: number,
  sort: SortOrder,
): PerformanceSummary[] {
  const merged = mergePerformances(regions, sort);
  return slicePage(merged, clientPage, rows).items;
}

function idsOf(items: PerformanceSummary[]): string[] {
  return items.map((i) => i.id);
}

function main() {
  const ROWS = 30;
  const FETCH_MULTIPLIER = 2; // route.ts 값
  const SORT: SortOrder = "START_ASC";
  const PAGES = 4;

  // 시도 3개 병합(서울/경기/부산 가정), 지역별 80개씩.
  const regions = [
    makeRegionData("11", 80, 0),
    makeRegionData("41", 80, 3),
    makeRegionData("26", 80, 5),
  ];

  console.log("#13 지역 다중 병합 페이지네이션 검증 (시도 레벨, R5)");
  console.log(
    `지역=${regions.length} 각 80건 / rows=${ROWS} / multiplier=${FETCH_MULTIPLIER} / sort=${SORT}\n`,
  );

  // 전역 정렬 기준에서 누락/중복 누적 추적.
  const truthSeen = new Set<string>();
  const currentSeen = new Set<string>();
  let currentDupAcrossPages = 0;
  let currentMissingTotal = 0;
  let mismatchPages = 0;

  for (let page = 1; page <= PAGES; page++) {
    const truth = groundTruth(regions, page, ROWS, SORT);
    const cur = currentAlgo(regions, page, ROWS, SORT, FETCH_MULTIPLIER);
    const correct = correctAlgo(regions, page, ROWS, SORT);

    const truthIds = idsOf(truth);
    const curIds = idsOf(cur.items);
    const correctIds = idsOf(correct.items);

    // 현행: 이전 페이지에서 이미 본 id 가 다시 나오면 중복(across-page).
    for (const id of curIds) {
      if (currentSeen.has(id)) currentDupAcrossPages++;
      currentSeen.add(id);
    }
    for (const id of truthIds) truthSeen.add(id);

    const curMatchesTruth =
      JSON.stringify(curIds) === JSON.stringify(truthIds);
    const correctMatchesTruth =
      JSON.stringify(correctIds) === JSON.stringify(truthIds);
    if (!curMatchesTruth) mismatchPages++;

    console.log(`--- client page ${page} ---`);
    console.log(`  ground-truth ids[0..3]: ${truthIds.slice(0, 4).join(",")} ...`);
    console.log(
      `  현행 route.ts        : ${curMatchesTruth ? "✅ 일치" : "❌ 불일치"} (KOPIS 호출 ${cur.calls}회)`,
    );
    console.log(
      `  제안 수정            : ${correctMatchesTruth ? "✅ 일치" : "❌ 불일치"} (KOPIS 호출 ${correct.calls}회)`,
    );
    if (!curMatchesTruth) {
      const missing = truthIds.filter((id) => !curIds.includes(id));
      const extra = curIds.filter((id) => !truthIds.includes(id));
      currentMissingTotal += missing.length;
      console.log(
        `     누락(이 페이지에 와야 하나 빠짐): ${missing.length}건 ${missing.slice(0, 5).join(",")}`,
      );
      console.log(`     오배치(엉뚱하게 들어옴): ${extra.length}건`);
    }
  }

  console.log("\n=== 요약 ===");
  console.log(`전체 ${PAGES} 페이지 중 현행 알고리즘 불일치 페이지: ${mismatchPages}`);
  console.log(`현행: 페이지 간 중복(같은 공연 재노출) 총 ${currentDupAcrossPages}건`);
  console.log(`현행: 누락(전역 정렬 기준 빠진 항목) 총 ${currentMissingTotal}건`);
  console.log(
    "\n부하(호출 수): 현행/제안 모두 page 당 지역 수 N 회 = O(N). 시도 최대 17 → 페이지당 ≤17 호출.",
  );
  console.log(
    "→ 동시성 상한(§7.2 기본 5)과 #12 실측 결과로 병렬 호출 batch 크기를 조정할 것.",
  );

  if (mismatchPages > 0) {
    console.log(
      "\n결론: 현행 다중지역 페이지네이션은 page>1 에서 누락·중복 발생(정확도 결함).",
    );
    console.log(
      "수정안: 모든 지역을 1..page 까지 누적 fetch → 전역 병합·정렬 → slicePage(merged, page, rows).",
    );
    process.exit(2); // 결함 검출됨을 종료코드로 신호
  }
}

main();
