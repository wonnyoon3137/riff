import { NextRequest, NextResponse } from "next/server";
import { kopisGet, KopisApiError } from "@/server/kopis/client";
import { toPerformanceSummary } from "@/server/kopis/normalize";
import { mergePerformances, slicePage } from "@/server/kopis/merge";
import { queryToFilter, clampRange, isRangeExceeded } from "@/domain/filter-url";
import { GENRE_TO_SHCATE } from "@/domain/kopis-codes";
import type { KopisPblprfrListItem } from "@/server/kopis/raw-types";
import type { PerformanceListResponse, PerformanceSummary } from "@/domain/types";

const DEFAULT_ROWS = 30;
// KOPIS 호출 시 넉넉하게 가져올 배수 (다중 지역 병합 시)
const FETCH_MULTIPLIER = 2;

function dateToKopis(isoDate: string): string {
  // "yyyy-MM-dd" -> "yyyyMMdd"
  return isoDate.replace(/-/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const filter = queryToFilter(request.nextUrl.searchParams);
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const rows = DEFAULT_ROWS;

    // 31일 보정 (D3)
    let adjusted: { reason: "RANGE_31D" } | undefined;
    if (isRangeExceeded(filter.period.range)) {
      filter.period.range = clampRange(filter.period.range);
      adjusted = { reason: "RANGE_31D" };
    }

    const stdate = dateToKopis(filter.period.range.from);
    const eddate = dateToKopis(filter.period.range.to);
    const shcate =
      filter.genres.length === 1
        ? GENRE_TO_SHCATE[filter.genres[0]]
        : undefined;

    if (filter.isNationwide || filter.regions.length === 0) {
      // 전국: 단일 호출
      const items = await fetchPerformances({
        stdate,
        eddate,
        cpage: page,
        rows,
        shcate,
        venueId: filter.venueId,
      });
      const sorted = mergePerformances([items], filter.sort);

      // 다중 장르 필터 (KOPIS는 단일 shcate만 수용하므로 BFF에서 필터)
      const filtered = filterByGenres(sorted, filter.genres);

      return NextResponse.json<PerformanceListResponse>({
        items: filtered.slice(0, rows),
        page,
        rows,
        hasNext: filtered.length > rows || items.length === rows,
        adjusted,
      });
    }

    // 다중 지역: 병렬 호출 (D4)
    const regionCodes = filter.regions.map((r) => r.sidoCode);
    const fetchRows = rows * FETCH_MULTIPLIER;

    const regionResults = await Promise.all(
      regionCodes.map((signgucode) =>
        fetchPerformances({
          stdate,
          eddate,
          cpage: page,
          rows: fetchRows,
          shcate,
          signgucode,
          venueId: filter.venueId,
        }),
      ),
    );

    const merged = mergePerformances(regionResults, filter.sort);
    const filtered = filterByGenres(merged, filter.genres);
    const { items, hasNext } = slicePage(filtered, 1, rows);

    return NextResponse.json<PerformanceListResponse>({
      items,
      page,
      rows,
      hasNext,
      totalApprox: filtered.length,
      adjusted,
    });
  } catch (err) {
    if (err instanceof KopisApiError) {
      if (err.resultCode === "04") {
        // NODATA
        return NextResponse.json<PerformanceListResponse>({
          items: [],
          page: 1,
          rows: DEFAULT_ROWS,
          hasNext: false,
        });
      }
      return NextResponse.json(
        { error: err.message, resultCode: err.resultCode },
        { status: 400 },
      );
    }
    console.error("[/api/performances]", err);
    return NextResponse.json(
      { error: "공연 정보를 불러올 수 없습니다." },
      { status: 502 },
    );
  }
}

async function fetchPerformances(params: {
  stdate: string;
  eddate: string;
  cpage: number;
  rows: number;
  shcate?: string;
  signgucode?: string;
  venueId?: string;
}): Promise<PerformanceSummary[]> {
  const items = await kopisGet<KopisPblprfrListItem>("/pblprfr", {
    stdate: params.stdate,
    eddate: params.eddate,
    cpage: params.cpage,
    rows: params.rows,
    shcate: params.shcate,
    signgucode: params.signgucode,
    prfplccd: params.venueId,
  });
  return items.map(toPerformanceSummary);
}

function filterByGenres(
  items: PerformanceSummary[],
  genres: string[],
): PerformanceSummary[] {
  if (genres.length <= 1) return items; // 0=전체, 1=이미 KOPIS에서 필터
  const set = new Set(genres);
  return items.filter((item) => item.genre && set.has(item.genre));
}
