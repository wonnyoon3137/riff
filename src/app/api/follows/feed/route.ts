import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFollowedArtistIds } from "@/server/users/repo";
import { getPerformancesByArtist } from "@/server/artists/repo";
import { kopisGet, KopisApiError } from "@/server/kopis/client";
import { toPerformanceSummary } from "@/server/kopis/normalize";
import { mapWithConcurrency } from "@/server/kopis/concurrency";
import type { KopisPblprfrListItem } from "@/server/kopis/raw-types";
import type { PerformanceSummary } from "@/domain/types";

// 인증 사용자별 피드 → 항상 동적.
export const dynamic = "force-dynamic";

// 3개 기간(30일씩)으로 KOPIS 31일 제한(D3) 우회 → 총 90일 커버.
const FEED_CONCURRENCY = 3;
const FEED_ROWS = 60; // 기간당 KOPIS 조회 건수
const FEED_PERIOD_DAYS = 30; // 기간당 일 수
const FEED_PERIOD_COUNT = 3; // 기간 수 (30×3 = 90일)

export interface FollowingFeedResponse {
  performances: PerformanceSummary[];
  /** 팔로잉 아티스트가 1명 이상 있는지 여부. UI 빈 상태 2종 구분에 사용. */
  hasFollowedArtists: boolean;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toKopisDate(date: Date): string {
  // "yyyy-MM-dd" → "yyyyMMdd"
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * GET /api/follows/feed — 팔로잉 아티스트의 다가오는 공연 피드(F11).
 *
 * 1. follows 테이블에서 artist_ids 수집.
 * 2. performance_artists 테이블에서 mt20ids Set 구축.
 * 3. KOPIS pblprfr를 3개 기간(30일씩)으로 분할 병렬 호출.
 * 4. mt20id Set 교차 필터 + 공연완료 제외 + 시작일 ASC 정렬 + 중복 제거.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. 팔로잉 artist_ids
  const artistIds = getFollowedArtistIds(userId);
  if (artistIds.length === 0) {
    return NextResponse.json<FollowingFeedResponse>({
      performances: [],
      hasFollowedArtists: false,
    });
  }

  // 2. artist별 mt20ids 수집 → Set
  const mt20idSet = new Set<string>();
  for (const artistId of artistIds) {
    try {
      const pas = getPerformancesByArtist(String(artistId));
      for (const pa of pas) mt20idSet.add(pa.mt20id);
    } catch {
      // artists.db 에러 시 해당 아티스트 건너뜀(graceful degradation)
    }
  }
  if (mt20idSet.size === 0) {
    return NextResponse.json<FollowingFeedResponse>({
      performances: [],
      hasFollowedArtists: true,
    });
  }

  // 3. 오늘 ~ +90일을 3개 기간(30일씩)으로 분할
  const today = new Date();
  const periods = Array.from({ length: FEED_PERIOD_COUNT }, (_, i) => ({
    stdate: toKopisDate(addDays(today, i * FEED_PERIOD_DAYS)),
    eddate: toKopisDate(addDays(today, i * FEED_PERIOD_DAYS + FEED_PERIOD_DAYS - 1)),
  }));

  // 4. 기간별 KOPIS 병렬 호출
  let periodResults: PerformanceSummary[][];
  try {
    periodResults = await mapWithConcurrency(
      periods,
      FEED_CONCURRENCY,
      async (period) => {
        try {
          const items = await kopisGet<KopisPblprfrListItem>("/pblprfr", {
            stdate: period.stdate,
            eddate: period.eddate,
            cpage: 1,
            rows: FEED_ROWS,
          });
          return items.map(toPerformanceSummary);
        } catch (err) {
          if (err instanceof KopisApiError && err.resultCode === "04") {
            return []; // NODATA — 해당 기간 공연 없음
          }
          throw err;
        }
      },
    );
  } catch (err) {
    console.error("[/api/follows/feed]", err);
    return NextResponse.json(
      { error: "공연 정보를 불러올 수 없습니다." },
      { status: 502 },
    );
  }

  // 5. mt20id 교차 필터 + 공연완료 제외 + 시작일 ASC 정렬 + 중복 제거
  const seen = new Set<string>();
  const performances = periodResults
    .flat()
    .filter((p) => mt20idSet.has(p.id) && p.state !== "ENDED")
    .sort((a, b) => a.period.from.localeCompare(b.period.from))
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

  return NextResponse.json<FollowingFeedResponse>({
    performances,
    hasFollowedArtists: true,
  });
}
