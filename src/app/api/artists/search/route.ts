import { NextRequest, NextResponse } from "next/server";
import { searchArtists } from "@/server/artists/repo";
import type { Artist } from "@/domain/types";

// 자체 DB(artists) 조회 -> 항상 동적.
export const dynamic = "force-dynamic";

const MIN_QUERY_LEN = 2; // F8: q<2 가드
const LIMIT = 10; // F8: 상위 10

interface ArtistSearchItem {
  id: string;
  name: string;
  aliases?: string[];
}

interface ArtistSearchResponse {
  items: ArtistSearchItem[];
}

function toSearchItem(a: Artist): ArtistSearchItem {
  return {
    id: a.id,
    name: a.name,
    ...(a.aliases && a.aliases.length > 0 ? { aliases: a.aliases } : {}),
  };
}

/**
 * GET /api/artists/search?q= -- 아티스트 자동완성 (F8).
 * 자체 DB artists 에서 name/aliases 부분 일치 상위 10개.
 * 응답 계약 { items: [{ id, name, aliases }] }.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < MIN_QUERY_LEN) {
    return NextResponse.json<ArtistSearchResponse>({ items: [] });
  }

  try {
    const artists = searchArtists(q, LIMIT);
    return NextResponse.json<ArtistSearchResponse>({
      items: artists.map(toSearchItem),
    });
  } catch (err) {
    console.error("[/api/artists/search]", err);
    // DB 미초기화 등 -> 빈 결과로 안전 폴백(자동완성은 비치명적).
    return NextResponse.json<ArtistSearchResponse>({ items: [] });
  }
}
