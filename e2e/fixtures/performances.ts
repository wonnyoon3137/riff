import type { Page, Route } from "@playwright/test";
import type {
  Performance,
  PerformanceListResponse,
  PerformanceSummary,
} from "../../src/domain/types";

/**
 * 결정론적 BFF 픽스처.
 *
 * 응답 shape은 도메인 타입(PerformanceListResponse / Performance)을 그대로
 * 따른다 — 프론트 훅(usePerformances / usePerformanceDetail)이 소비하는 계약과
 * 1:1로 맞춰 경계면 정합성을 보장한다.
 */

const DATE_FROM = "2026-06-01";
const DATE_TO = "2026-06-30";

function summary(
  id: string,
  title: string,
  overrides: Partial<PerformanceSummary> = {},
): PerformanceSummary {
  return {
    id,
    title,
    period: { from: DATE_FROM, to: DATE_TO },
    venueName: "테스트 공연장",
    area: "서울",
    genreLabel: "뮤지컬",
    genre: "MUSICAL",
    state: "ONGOING",
    // posterUrl은 의도적으로 비움 → next/image 원격 도메인 의존 제거(결정론).
    ...overrides,
  };
}

/** 지역코드별 식별 가능한 아이템 집합 (D4 병합 검증용) */
const REGION_ITEMS: Record<string, PerformanceSummary[]> = {
  // 서울(11)
  "11": [
    summary("SEOUL-1", "서울 공연 A", { area: "서울" }),
    summary("SEOUL-2", "서울 공연 B", { area: "서울" }),
  ],
  // 부산(26)
  "26": [
    summary("BUSAN-1", "부산 공연 A", { area: "부산" }),
    summary("BUSAN-2", "부산 공연 B", { area: "부산" }),
  ],
};

/** 전국(지역 미지정) 기본 목록 — D8/필터→상세 플로우용. 페이지네이션 지원. */
const NATIONWIDE_PAGE_1: PerformanceSummary[] = Array.from(
  { length: 30 },
  (_, i) =>
    summary(`PERF-${String(i + 1).padStart(3, "0")}`, `공연 ${i + 1}번`, {
      area: i % 2 === 0 ? "서울" : "경기",
    }),
);

const NATIONWIDE_PAGE_2: PerformanceSummary[] = Array.from(
  { length: 30 },
  (_, i) =>
    summary(`PERF-${String(i + 31).padStart(3, "0")}`, `공연 ${i + 31}번`, {
      area: i % 2 === 0 ? "서울" : "경기",
    }),
);

function detailFor(id: string, title: string): Performance {
  return {
    ...summary(id, title),
    venueId: "FC001",
    venueAddress: "서울특별시 종로구 테스트로 1",
    ageGuidance: "만 7세 이상",
    runtime: "120분",
    cast: "홍길동, 김철수",
    story: "테스트 공연 줄거리 원문 보존 확인용 텍스트.",
    priceGuidance: "R석 100,000원 / S석 80,000원",
    introImages: [],
    bookings: [{ name: "인터파크", url: "https://example.com/booking" }],
  };
}

function listResponse(
  items: PerformanceSummary[],
  page: number,
  hasNext: boolean,
  totalApprox?: number,
): PerformanceListResponse {
  return {
    items,
    page,
    rows: 30,
    hasNext,
    ...(totalApprox !== undefined ? { totalApprox } : {}),
  };
}

/**
 * 모든 `/api/performances*` 호출을 픽스처로 응답한다.
 * - 목록(`/api/performances?...`): region 파라미터로 병합 시뮬레이션, page로 페이징.
 * - 상세(`/api/performances/:id`): 클릭한 항목 id를 그대로 반영.
 */
export async function mockPerformanceApi(page: Page): Promise<void> {
  await page.route("**/api/performances**", async (route: Route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    // 상세: /api/performances/<id>
    const detailMatch = pathname.match(/\/api\/performances\/([^/]+)$/);
    if (detailMatch) {
      const id = decodeURIComponent(detailMatch[1]);
      const known = findKnownSummary(id);
      const body = detailFor(id, known?.title ?? `공연 ${id}`);
      await route.fulfill({ json: body });
      return;
    }

    // 목록
    const regionParam = url.searchParams.get("region");
    const pageNum = Number(url.searchParams.get("page")) || 1;

    if (regionParam) {
      // D4: 여러 시도코드 병합 (중복제거는 BFF 책임이지만 픽스처는 고유 id만 제공)
      const codes = regionParam.split(",").map((seg) => seg.split(":")[0]);
      const merged = codes.flatMap((code) => REGION_ITEMS[code] ?? []);
      await route.fulfill({
        json: listResponse(merged, 1, false, merged.length),
      });
      return;
    }

    // 전국 기본 목록 (페이지네이션)
    if (pageNum >= 2) {
      await route.fulfill({
        json: listResponse(NATIONWIDE_PAGE_2, 2, false, 60),
      });
      return;
    }
    await route.fulfill({
      json: listResponse(NATIONWIDE_PAGE_1, 1, true, 60),
    });
  });
}

function findKnownSummary(id: string): PerformanceSummary | undefined {
  const all = [
    ...NATIONWIDE_PAGE_1,
    ...NATIONWIDE_PAGE_2,
    ...Object.values(REGION_ITEMS).flat(),
  ];
  return all.find((s) => s.id === id);
}

export const fixtures = {
  REGION_ITEMS,
  NATIONWIDE_PAGE_1,
  NATIONWIDE_PAGE_2,
};
