import { NextRequest, NextResponse } from "next/server";

// v0.1: 공연장 자동완성 API 스텁.
// Phase D 이후 자체 DB(venues) 연동으로 교체 예정 (D5).
// 현재는 빈 결과를 반환한다.

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  // TODO: 자체 DB venues 테이블에서 name_normalized LIKE %q% 조회
  return NextResponse.json({ items: [] });
}
