import type { Page, Route } from "@playwright/test";
import type {
  MatchedArtist,
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

/** 구군코드별 아이템 (구군 드릴다운 검증용, v4 #45) */
const GUGUN_ITEMS: Record<string, PerformanceSummary[]> = {
  // 서울 강남구(1168)
  "1168": [
    summary("GANGNAM-1", "강남 공연 A", { area: "서울" }),
    summary("GANGNAM-2", "강남 공연 B", { area: "서울" }),
  ],
  // 서울 서초구(1165)
  "1165": [
    summary("SEOCHO-1", "서초 공연 A", { area: "서울" }),
  ],
};

// ── 아티스트 관련 픽스처 (F8 아티스트 필터 E2E, v4 #60) ──────────
interface ArtistSearchItem {
  id: string;
  name: string;
  aliases?: string[];
}

const ARTISTS: ArtistSearchItem[] = [
  { id: "artist-1", name: "홍길동", aliases: ["길동"] },
  { id: "artist-2", name: "김철수" },
  { id: "artist-3", name: "홍길순" },
];

/** 아티스트 ID -> 출연 공연 ID 집합. BFF 교차 필터 시뮬레이션. */
const ARTIST_PERFORMANCES: Record<string, Set<string>> = {
  "artist-1": new Set(["PERF-001", "PERF-003", "PERF-005"]),
  "artist-2": new Set(["PERF-002", "PERF-004"]),
};

/** 상세 응답에 포함할 matchedArtists (공연 ID → 매칭 아티스트). */
const DETAIL_MATCHED_ARTISTS: Record<string, MatchedArtist[]> = {
  "PERF-001": [
    { id: "artist-1", name: "홍길동", role: "주연", rawExtract: "홍길동" },
  ],
  "PERF-003": [
    { id: "artist-1", name: "홍길동", role: "조연", rawExtract: "홍길동" },
  ],
  "PERF-002": [
    { id: "artist-2", name: "김철수", role: "주연", rawExtract: "김철수" },
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
    matchedArtists: DETAIL_MATCHED_ARTISTS[id] ?? [],
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
    const qParam = url.searchParams.get("q");
    const artistParam = url.searchParams.get("artist");

    // F8: 아티스트 교차 필터 헬퍼
    const applyArtistFilter = (items: PerformanceSummary[]): PerformanceSummary[] => {
      if (!artistParam) return items;
      const ids = ARTIST_PERFORMANCES[artistParam];
      if (!ids) return [];
      return items.filter((s) => ids.has(s.id));
    };

    // F5: 공연명 검색(?q=). BFF가 q>=2자일 때만 부착하므로 픽스처도 동일 가정.
    // 제목 부분일치로 필터(전국 풀에서). 결과는 단일 페이지로 응답.
    if (qParam) {
      const matched = applyArtistFilter(
        NATIONWIDE_PAGE_1.filter((s) => s.title.includes(qParam)),
      );
      await route.fulfill({
        json: listResponse(matched, 1, false, matched.length),
      });
      return;
    }

    if (regionParam) {
      // D4: 여러 시도/구군코드 병합 (중복제거는 BFF 책임이지만 픽스처는 고유 id만 제공)
      // 구군 드릴다운(v4): "11:1168" 형식이면 구군 아이템을 먼저 탐색, 없으면 시도 폴백.
      const segments = regionParam.split(",");
      const merged: PerformanceSummary[] = [];
      const seenIds = new Set<string>();
      for (const seg of segments) {
        const [sido, gugun] = seg.split(":");
        const items = gugun
          ? (GUGUN_ITEMS[gugun] ?? REGION_ITEMS[sido] ?? [])
          : (REGION_ITEMS[sido] ?? []);
        for (const item of items) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            merged.push(item);
          }
        }
      }
      const regionFiltered = applyArtistFilter(merged);
      await route.fulfill({
        json: listResponse(regionFiltered, 1, false, regionFiltered.length),
      });
      return;
    }

    // F8: 아티스트 필터 단독 (전국)
    if (artistParam) {
      const all = [...NATIONWIDE_PAGE_1, ...NATIONWIDE_PAGE_2];
      const filtered = applyArtistFilter(all);
      await route.fulfill({
        json: listResponse(filtered, 1, false, filtered.length),
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

/**
 * `/api/artists/search?q=` 호출을 픽스처로 응답한다 (F8 아티스트 자동완성).
 */
export async function mockArtistSearchApi(page: Page): Promise<void> {
  await page.route("**/api/artists/search**", async (route: Route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      await route.fulfill({ json: { items: [] } });
      return;
    }
    const matched = ARTISTS.filter(
      (a) =>
        a.name.includes(q) ||
        (a.aliases?.some((alias) => alias.includes(q)) ?? false),
    );
    await route.fulfill({ json: { items: matched } });
  });
}

function findKnownSummary(id: string): PerformanceSummary | undefined {
  const all = [
    ...NATIONWIDE_PAGE_1,
    ...NATIONWIDE_PAGE_2,
    ...Object.values(REGION_ITEMS).flat(),
    ...Object.values(GUGUN_ITEMS).flat(),
  ];
  return all.find((s) => s.id === id);
}

export const fixtures = {
  REGION_ITEMS,
  GUGUN_ITEMS,
  NATIONWIDE_PAGE_1,
  NATIONWIDE_PAGE_2,
  ARTISTS,
  ARTIST_PERFORMANCES,
  DETAIL_MATCHED_ARTISTS,
};
