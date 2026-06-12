import { NextRequest, NextResponse } from "next/server";
import { searchByName } from "@/server/venues/repo";
import type { Venue } from "@/domain/types";

// 자체 DB(venues) 조회 → 항상 동적.
export const dynamic = "force-dynamic";

const MIN_QUERY_LEN = 2; // DEC-E: q<2 가드
const LIMIT = 20; // DEC-E: 상위 20

interface VenueListResponse {
  items: Venue[];
}

/**
 * GET /api/venues?q= — 공연장 자동완성(D5). 자체 DB venues 에서
 * name_normalized contains(LIKE %q%) 상위 20개. KOPIS 미호출.
 * 응답 계약 { items: Venue[] } 유지(프론트 VenueFilter 무변경, DEC-E).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < MIN_QUERY_LEN) {
    return NextResponse.json<VenueListResponse>({ items: [] });
  }

  try {
    const items = searchByName(q, LIMIT);
    return NextResponse.json<VenueListResponse>({ items });
  } catch (err) {
    console.error("[/api/venues]", err);
    // DB 미초기화(동기화 전) 등 → 빈 결과로 안전 폴백(자동완성은 비치명적).
    return NextResponse.json<VenueListResponse>({ items: [] });
  }
}
