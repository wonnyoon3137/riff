import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  followArtist,
  getFollowedArtistIds,
  unfollowArtist,
} from "@/server/users/repo";
import { findArtistById } from "@/server/artists/repo";
import type { ArtistSummary } from "@/domain/types";

// 인증 사용자별 follows 조회/변경 → 항상 동적.
export const dynamic = "force-dynamic";

interface FollowsListResponse {
  artists: ArtistSummary[];
}

/**
 * GET /api/follows — 인증 사용자의 팔로우 목록(ArtistSummary[]).
 * follows(users.db)에서 artist_id 배열을 얻고, artists(artists.db)에서
 * 이름을 해석해 반환한다(교차 DB 조인 불가 → repo 2회 조회).
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ids = getFollowedArtistIds(userId);
  const artists: ArtistSummary[] = [];
  for (const id of ids) {
    const artist = findArtistById(String(id));
    // 삭제/누락 아티스트는 건너뛴다(목록 순서는 created_at DESC 유지).
    if (artist) artists.push({ id: Number(artist.id), name: artist.name });
  }

  return NextResponse.json<FollowsListResponse>({ artists });
}

/**
 * POST /api/follows — body { artistId: number } → 201.
 * 멱등(중복 팔로우 무시).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let artistId: unknown;
  try {
    const body = (await request.json()) as { artistId?: unknown };
    artistId = body.artistId;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof artistId !== "number" || !Number.isInteger(artistId)) {
    return NextResponse.json(
      { error: "artistId must be an integer" },
      { status: 400 },
    );
  }

  followArtist(userId, artistId);
  return new NextResponse(null, { status: 201 });
}

/**
 * DELETE /api/follows?artistId=N → 204.
 * 멱등(없으면 no-op).
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("artistId");
  const artistId = raw === null ? NaN : Number(raw);
  if (!Number.isInteger(artistId)) {
    return NextResponse.json(
      { error: "artistId must be an integer" },
      { status: 400 },
    );
  }

  unfollowArtist(userId, artistId);
  return new NextResponse(null, { status: 204 });
}
