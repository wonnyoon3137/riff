import { NextRequest, NextResponse } from "next/server";
import { kopisGet, KopisApiError } from "@/server/kopis/client";
import { toPerformanceSummary } from "@/server/kopis/normalize";
import { mergePerformances, slicePage } from "@/server/kopis/merge";
import { mapWithConcurrency } from "@/server/kopis/concurrency";
import {
  queryToFilter,
  clampRange,
  isRangeExceeded,
  normalizeSearchTerm,
} from "@/domain/filter-url";
import { GENRE_TO_SHCATE } from "@/domain/kopis-codes";
import type { KopisPblprfrListItem } from "@/server/kopis/raw-types";
import type { PerformanceListResponse, PerformanceSummary } from "@/domain/types";

const DEFAULT_ROWS = 30;
// 다중 지역(D4) 누적 fetch 동시성 상한 (§7.2 기본 5; 실측 후 조정).
const REGION_FETCH_CONCURRENCY =
  Number(process.env.KOPIS_REGION_CONCURRENCY) || 5;

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
    // 공연명 검색 (F5). trim 후 2자 미만이면 undefined → shprfnm 미전송(전체 목록).
    // 순수 AND(DEC-S1 옵션 A): 기간/지역/장르/정렬은 그대로 두고 shprfnm만 더한다.
    const shprfnm = normalizeSearchTerm(filter.searchTerm);

    if (filter.isNationwide || filter.regions.length === 0) {
      // 전국: 단일 호출
      const items = await fetchPerformances({
        stdate,
        eddate,
        cpage: page,
        rows,
        shcate,
        venueId: filter.venueId,
        shprfnm,
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

    // 다중 지역 (D4): 지역별 KOPIS 페이지 경계와 전역 병합 경계가 어긋나
    // page>1 에서 항목이 누락된다(#21). 각 지역을 cpage=1..page 까지 누적 fetch한 뒤
    // 전역 병합·dedup·정렬하고 slicePage(merged, page, rows)로 전역 오프셋을 자른다.
    // 각 RegionSelection은 signgucode(시도) + signgucodesub(구군, optional)을 개별 호출한다.
    const regionEntries = filter.regions.map((r) => ({
      signgucode: r.sidoCode,
      signgucodesub: r.gugunCode,
    }));

    // 호출 수가 N(지역) × page 까지 늘 수 있으므로 동시성 상한으로 batch 분할(§7.2).
    const regionResults = await mapWithConcurrency(
      regionEntries,
      REGION_FETCH_CONCURRENCY,
      (entry) =>
        fetchRegionUpToPage({
          stdate,
          eddate,
          page,
          rows,
          shcate,
          signgucode: entry.signgucode,
          signgucodesub: entry.signgucodesub,
          venueId: filter.venueId,
          shprfnm,
        }),
    );

    const merged = mergePerformances(regionResults, filter.sort);
    const filtered = filterByGenres(merged, filter.genres);
    const { items, hasNext } = slicePage(filtered, page, rows);

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
  signgucodesub?: string;
  venueId?: string;
  shprfnm?: string;
}): Promise<PerformanceSummary[]> {
  const items = await kopisGet<KopisPblprfrListItem>("/pblprfr", {
    stdate: params.stdate,
    eddate: params.eddate,
    cpage: params.cpage,
    rows: params.rows,
    shcate: params.shcate,
    signgucode: params.signgucode,
    signgucodesub: params.signgucodesub,
    prfplccd: params.venueId,
    shprfnm: params.shprfnm,
  });
  return items.map(toPerformanceSummary);
}

/**
 * 한 지역(signgucode)에서 전역 page 윈도우를 보장하기 위해 cpage=1..page 를 누적 fetch.
 * 각 KOPIS 호출은 rows(≤100)개씩. 한 페이지가 rows 미만이면 해당 지역 소진 → 조기 종료.
 * 최대 page*rows 개까지만 보관(전역 slice에 필요한 prefix).
 */
async function fetchRegionUpToPage(params: {
  stdate: string;
  eddate: string;
  page: number;
  rows: number;
  shcate?: string;
  signgucode: string;
  signgucodesub?: string;
  venueId?: string;
  shprfnm?: string;
}): Promise<PerformanceSummary[]> {
  const need = params.page * params.rows;
  const out: PerformanceSummary[] = [];
  for (let cpage = 1; cpage <= params.page; cpage++) {
    const batch = await fetchPerformances({
      stdate: params.stdate,
      eddate: params.eddate,
      cpage,
      rows: params.rows,
      shcate: params.shcate,
      signgucode: params.signgucode,
      signgucodesub: params.signgucodesub,
      venueId: params.venueId,
      shprfnm: params.shprfnm,
    });
    out.push(...batch);
    if (batch.length < params.rows || out.length >= need) break; // 지역 소진 or 충분
  }
  return out;
}

function filterByGenres(
  items: PerformanceSummary[],
  genres: string[],
): PerformanceSummary[] {
  if (genres.length <= 1) return items; // 0=전체, 1=이미 KOPIS에서 필터
  const set = new Set(genres);
  return items.filter((item) => item.genre && set.has(item.genre));
}
