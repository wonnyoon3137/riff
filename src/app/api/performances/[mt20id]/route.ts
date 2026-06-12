import { NextRequest, NextResponse } from "next/server";
import { kopisGet, KopisApiError } from "@/server/kopis/client";
import { toPerformance } from "@/server/kopis/normalize";
import type { KopisPblprfrDetail } from "@/server/kopis/raw-types";
import { getArtistsByPerformance } from "@/server/artists/repo";
import type { MatchedArtist } from "@/domain/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mt20id: string }> },
) {
  const { mt20id } = await params;

  try {
    const items = await kopisGet<KopisPblprfrDetail>(`/pblprfr/${mt20id}`, {});
    if (items.length === 0) {
      return NextResponse.json(
        { error: "공연을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    const performance = toPerformance(items[0]);

    // v3 F7: 매칭된 아티스트 조회 (DB 실패 시 빈 배열 fallback)
    let matchedArtists: MatchedArtist[] = [];
    try {
      const artists = getArtistsByPerformance(mt20id);
      matchedArtists = artists.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        rawExtract: a.rawExtract,
      }));
    } catch (artistErr) {
      console.warn(
        `[/api/performances/${mt20id}] artist lookup failed, falling back to empty:`,
        artistErr,
      );
    }

    return NextResponse.json({ ...performance, matchedArtists });
  } catch (err) {
    if (err instanceof KopisApiError && err.resultCode === "04") {
      return NextResponse.json(
        { error: "공연을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error(`[/api/performances/${mt20id}]`, err);
    return NextResponse.json(
      { error: "공연 상세 정보를 불러올 수 없습니다." },
      { status: 502 },
    );
  }
}
