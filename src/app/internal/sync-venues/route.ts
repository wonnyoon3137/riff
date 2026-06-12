import { NextRequest, NextResponse } from "next/server";
import { syncVenues } from "@/server/venues/sync";

// 동기화는 KOPIS 전량 fetch + DB 쓰기 → 항상 서버에서 동적 실행.
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 전량 동기화 여유(호스팅이 지원 시).

/**
 * POST /internal/sync-venues — 공연장 마스터 수동/스케줄 동기화 트리거(D5).
 *
 * 보호:
 *  - VENUE_SYNC_TOKEN 이 설정돼 있으면 `Authorization: Bearer <token>` 또는
 *    `x-sync-token` 헤더가 일치해야 한다.
 *  - 미설정이면(로컬/개발) 토큰 없이 허용.
 * 운영 스케줄러(cron)는 이 엔드포인트를 토큰과 함께 호출한다(DEC-B).
 */
export async function POST(request: NextRequest) {
  const expected = process.env.VENUE_SYNC_TOKEN;
  if (expected) {
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const provided = bearer ?? request.headers.get("x-sync-token") ?? undefined;
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncVenues();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/internal/sync-venues]", err);
    return NextResponse.json(
      { ok: false, error: "공연장 동기화에 실패했습니다." },
      { status: 502 },
    );
  }
}
