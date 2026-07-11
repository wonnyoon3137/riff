import { describe, it, expect, vi, beforeEach } from "vitest";
import type { KopisPblprfrListItem } from "@/server/kopis/raw-types";

/**
 * GET /api/follows/feed — Following Feed BFF 단위 테스트 (F11).
 *
 * 검증 항목:
 * - 비인증 요청 → 401
 * - 팔로잉 아티스트 없음 → 200, performances: []
 * - 팔로잉 있으나 performance_artists 없음 → 200, performances: []
 * - 정상: KOPIS 결과 mt20id 교차 필터 + 공연완료 제외 + 시작일 ASC 정렬
 * - 동일 mt20id 중복 제거
 * - 3개 기간 병렬 호출 검증
 */

// ── vi.hoisted: mock 팩토리 안에서 참조해야 하는 변수 ──────────────────────
const {
  mockAuth,
  mockGetFollowedArtistIds,
  mockGetPerformancesByArtist,
  mockKopisGet,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetFollowedArtistIds: vi.fn<() => number[]>(),
  mockGetPerformancesByArtist: vi.fn(),
  mockKopisGet: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/server/users/repo", () => ({
  getFollowedArtistIds: mockGetFollowedArtistIds,
}));
vi.mock("@/server/artists/repo", () => ({
  getPerformancesByArtist: mockGetPerformancesByArtist,
}));
vi.mock("@/server/kopis/client", () => {
  class KopisApiError extends Error {
    constructor(
      public resultCode: string,
      message?: string,
    ) {
      super(message ?? `KOPIS error ${resultCode}`);
      this.name = "KopisApiError";
    }
  }
  return {
    KopisApiError,
    KopisHttpError: class extends Error {},
    kopisGet: mockKopisGet,
  };
});

import { GET } from "@/app/api/follows/feed/route";
import type { FollowingFeedResponse } from "@/app/api/follows/feed/route";

function makeItem(
  mt20id: string,
  prfstate: string,
  prfpdfrom = "2026.08.01",
  prfpdto = "2026.08.31",
): KopisPblprfrListItem {
  return {
    mt20id,
    prfnm: `공연_${mt20id}`,
    prfpdfrom,
    prfpdto,
    fcltynm: "테스트 극장",
    area: "서울",
    genrenm: "뮤지컬",
    prfstate,
  };
}

function makePa(mt20id: string, artistId = "1") {
  return { mt20id, artistId, rawExtract: "", extractedAt: "" };
}

describe("GET /api/follows/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: kopisGet은 빈 배열 반환
    mockKopisGet.mockResolvedValue([]);
  });

  it("비인증 요청 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("session.user.id 없음 → 401", async () => {
    mockAuth.mockResolvedValue({ user: {} });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("팔로잉 아티스트 없음 → 200, performances [], hasFollowedArtists: false", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } });
    mockGetFollowedArtistIds.mockReturnValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as FollowingFeedResponse;
    expect(body.performances).toEqual([]);
    expect(body.hasFollowedArtists).toBe(false);
    // KOPIS 호출 없음
    expect(mockKopisGet).not.toHaveBeenCalled();
  });

  it("팔로잉 있으나 performance_artists 없음 → 200, performances [], hasFollowedArtists: true", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } });
    mockGetFollowedArtistIds.mockReturnValue([1, 2]);
    mockGetPerformancesByArtist.mockReturnValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as FollowingFeedResponse;
    expect(body.performances).toEqual([]);
    expect(body.hasFollowedArtists).toBe(true);
    expect(mockKopisGet).not.toHaveBeenCalled();
  });

  it("mt20id 교차 필터: 팔로잉 아티스트 공연만 포함", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } });
    mockGetFollowedArtistIds.mockReturnValue([1]);
    mockGetPerformancesByArtist.mockReturnValue([makePa("MT001")]);
    // KOPIS가 MT001(팔로잉) + MT999(무관) 반환
    mockKopisGet.mockResolvedValue([
      makeItem("MT001", "공연예정"),
      makeItem("MT999", "공연예정"),
    ]);
    const res = await GET();
    const body = (await res.json()) as FollowingFeedResponse;
    const ids = body.performances.map((p) => p.id);
    expect(ids).toContain("MT001");
    expect(ids).not.toContain("MT999");
  });

  it("공연완료(ENDED) 항목 제외", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } });
    mockGetFollowedArtistIds.mockReturnValue([1]);
    mockGetPerformancesByArtist.mockReturnValue([
      makePa("MT001"),
      makePa("MT002"),
    ]);
    mockKopisGet.mockResolvedValue([
      makeItem("MT001", "공연예정"),
      makeItem("MT002", "공연완료"),
    ]);
    const res = await GET();
    const body = (await res.json()) as FollowingFeedResponse;
    const ids = body.performances.map((p) => p.id);
    expect(ids).toContain("MT001");
    expect(ids).not.toContain("MT002");
  });

  it("시작일 ASC 정렬", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } });
    mockGetFollowedArtistIds.mockReturnValue([1]);
    mockGetPerformancesByArtist.mockReturnValue([
      makePa("MT001"),
      makePa("MT002"),
    ]);
    // 늦은 날짜(MT002)가 먼저, 이른 날짜(MT001)가 나중에 오는 순서로 KOPIS 반환
    mockKopisGet.mockResolvedValue([
      makeItem("MT002", "공연예정", "2026.09.01", "2026.09.30"),
      makeItem("MT001", "공연예정", "2026.08.01", "2026.08.31"),
    ]);
    const res = await GET();
    const body = (await res.json()) as FollowingFeedResponse;
    const ids = body.performances.map((p) => p.id);
    expect(ids.indexOf("MT001")).toBeLessThan(ids.indexOf("MT002"));
  });

  it("동일 mt20id 중복 제거 (여러 기간에서 등장)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } });
    mockGetFollowedArtistIds.mockReturnValue([1]);
    mockGetPerformancesByArtist.mockReturnValue([makePa("MT001")]);
    // 모든 3개 기간에서 동일 MT001 반환
    mockKopisGet.mockResolvedValue([makeItem("MT001", "공연중")]);
    const res = await GET();
    const body = (await res.json()) as FollowingFeedResponse;
    expect(body.performances.filter((p) => p.id === "MT001")).toHaveLength(1);
  });

  it("KOPIS 3개 기간 호출 (90일 = 30일 × 3)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user1" } });
    mockGetFollowedArtistIds.mockReturnValue([1]);
    mockGetPerformancesByArtist.mockReturnValue([makePa("MT001")]);
    mockKopisGet.mockResolvedValue([]);
    await GET();
    expect(mockKopisGet).toHaveBeenCalledTimes(3);
    // 각 기간의 stdate가 다른지 확인
    const stdates = mockKopisGet.mock.calls.map(
      (c) => (c[1] as Record<string, unknown>).stdate,
    );
    expect(new Set(stdates).size).toBe(3);
  });
});
