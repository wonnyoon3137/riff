import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchArtist,
  matchCastToArtists,
  _resetRateLimitState,
  type MbArtistMatch,
} from "@/server/artists/musicbrainz";
import type { CastExtraction } from "@/domain/cast-extract";

// ── Mock fetch 헬퍼 ──────────────────────────────────────────

function mockFetchResponse(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

// MusicBrainz 응답 fixture: "IU" 검색 결과 (단순화)
const IU_RESPONSE = {
  artists: [
    {
      id: "b9545342-1e1e-4e2e-bf44-f32b3e09b282",
      name: "IU",
      score: 100,
      type: "Person",
      aliases: [
        { name: "아이유", locale: "ko", type: "Artist name" },
        { name: "이지은", locale: "ko", type: "Legal name" },
        { name: "Lee Ji-eun", locale: "en", type: "Legal name" },
      ],
    },
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      name: "IU (cover band)",
      score: 42,
      type: "Group",
      aliases: [],
    },
  ],
};

// 빈 결과 fixture
const EMPTY_RESPONSE = { artists: [] };

// 별칭 없는 아티스트 fixture
const NO_ALIASES_RESPONSE = {
  artists: [
    {
      id: "11111111-2222-3333-4444-555555555555",
      name: "Unknown Artist",
      score: 65,
      type: "Person",
    },
  ],
};

// ── searchArtist ─────────────────────────────────────────────

describe("searchArtist", () => {
  beforeEach(() => {
    _resetRateLimitState();
  });

  it("MusicBrainz JSON 응답을 MbArtistMatch 배열로 파싱한다", async () => {
    const mockFetch = mockFetchResponse(IU_RESPONSE);
    const results = await searchArtist("IU", mockFetch);

    expect(results).toHaveLength(2);

    expect(results[0]).toEqual<MbArtistMatch>({
      mbid: "b9545342-1e1e-4e2e-bf44-f32b3e09b282",
      name: "IU",
      aliases: ["아이유", "이지은", "Lee Ji-eun"],
      score: 100,
      type: "Person",
    });

    expect(results[1]).toEqual<MbArtistMatch>({
      mbid: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      name: "IU (cover band)",
      aliases: [],
      score: 42,
      type: "Group",
    });
  });

  it("aliases가 없는 아티스트도 빈 배열로 처리한다", async () => {
    const mockFetch = mockFetchResponse(NO_ALIASES_RESPONSE);
    const results = await searchArtist("Unknown Artist", mockFetch);

    expect(results).toHaveLength(1);
    expect(results[0].aliases).toEqual([]);
    expect(results[0].type).toBe("Person");
  });

  it("검색 결과가 없으면 빈 배열을 반환한다", async () => {
    const mockFetch = mockFetchResponse(EMPTY_RESPONSE);
    const results = await searchArtist("존재하지않는아티스트", mockFetch);

    expect(results).toEqual([]);
  });

  it("빈 이름 입력 시 API 호출 없이 빈 배열을 반환한다", async () => {
    const mockFetch = vi.fn() as unknown as typeof fetch;
    const results = await searchArtist("", mockFetch);

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("공백만 입력 시 API 호출 없이 빈 배열을 반환한다", async () => {
    const mockFetch = vi.fn() as unknown as typeof fetch;
    const results = await searchArtist("   ", mockFetch);

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("HTTP 에러(4xx/5xx) 시 빈 배열을 반환한다 (throw 없음)", async () => {
    const mockFetch = mockFetchResponse({}, 503);
    const results = await searchArtist("IU", mockFetch);

    expect(results).toEqual([]);
  });

  it("네트워크 에러 시 빈 배열을 반환한다 (throw 없음)", async () => {
    const mockFetch = vi.fn().mockRejectedValue(
      new Error("Network error"),
    ) as unknown as typeof fetch;
    const results = await searchArtist("IU", mockFetch);

    expect(results).toEqual([]);
  });

  it("올바른 URL과 헤더로 요청한다", async () => {
    const mockFetch = mockFetchResponse(EMPTY_RESPONSE);
    await searchArtist("아이유", mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0];

    // URL 검증
    const parsedUrl = new URL(url as string);
    expect(parsedUrl.origin + parsedUrl.pathname).toBe(
      "https://musicbrainz.org/ws/2/artist",
    );
    expect(parsedUrl.searchParams.get("query")).toBe("아이유");
    expect(parsedUrl.searchParams.get("fmt")).toBe("json");
    expect(parsedUrl.searchParams.get("limit")).toBe("5");

    // User-Agent 헤더 검증
    expect((options as RequestInit).headers).toEqual(
      expect.objectContaining({
        "User-Agent": expect.stringContaining("Riff/"),
      }),
    );
  });

  it("잘못된 JSON 구조도 관대하게 빈 배열로 처리한다", async () => {
    const mockFetch = mockFetchResponse({ unexpected: "structure" });
    const results = await searchArtist("IU", mockFetch);

    expect(results).toEqual([]);
  });
});

// ── Rate Limit ───────────────────────────────────────────────

describe("rate limit", () => {
  beforeEach(() => {
    _resetRateLimitState();
  });

  it("연속 호출 시 최소 1초 간격을 보장한다", async () => {
    const mockFetch = mockFetchResponse(EMPTY_RESPONSE);
    const start = Date.now();

    // 2회 연속 호출
    await searchArtist("first", mockFetch);
    await searchArtist("second", mockFetch);

    const elapsed = Date.now() - start;
    // 두 번째 호출은 최소 ~1100ms 대기해야 함
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  }, 5000); // 타임아웃 여유
});

// ── matchCastToArtists ───────────────────────────────────────

describe("matchCastToArtists", () => {
  beforeEach(() => {
    _resetRateLimitState();
  });

  const extractions: CastExtraction[] = [
    { name: "아이유", rawExtract: "아이유" },
    { name: "박서준", rawExtract: "박서준", role: "출연" },
  ];

  it("각 extraction에 대해 MusicBrainz 검색 결과를 매칭한다", async () => {
    const iuResponse = {
      artists: [
        {
          id: "b9545342-1e1e-4e2e-bf44-f32b3e09b282",
          name: "IU",
          score: 95,
          type: "Person",
          aliases: [{ name: "아이유", locale: "ko", type: "Artist name" }],
        },
      ],
    };
    const parkResponse = {
      artists: [
        {
          id: "22222222-3333-4444-5555-666666666666",
          name: "Park Seo-jun",
          score: 80,
          type: "Person",
          aliases: [],
        },
      ],
    };

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      const body = callCount === 1 ? iuResponse : parkResponse;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
      });
    }) as unknown as typeof fetch;

    const results = await matchCastToArtists(extractions, mockFetch);

    expect(results).toHaveLength(2);

    // 첫 번째: 아이유
    expect(results[0].extraction.name).toBe("아이유");
    expect(results[0].match?.mbid).toBe("b9545342-1e1e-4e2e-bf44-f32b3e09b282");
    expect(results[0].match?.name).toBe("IU");
    expect(results[0].confidence).toBe(0.95);

    // 두 번째: 박서준
    expect(results[1].extraction.name).toBe("박서준");
    expect(results[1].match?.name).toBe("Park Seo-jun");
    expect(results[1].confidence).toBe(0.80);
  });

  it("매칭 실패 시 confidence 0, match undefined", async () => {
    const mockFetch = mockFetchResponse(EMPTY_RESPONSE);

    const results = await matchCastToArtists(
      [{ name: "존재하지않는이름", rawExtract: "존재하지않는이름" }],
      mockFetch,
    );

    expect(results).toHaveLength(1);
    expect(results[0].match).toBeUndefined();
    expect(results[0].confidence).toBe(0);
    expect(results[0].extraction.name).toBe("존재하지않는이름");
  });

  it("빈 extractions 입력 시 빈 배열 반환", async () => {
    const mockFetch = vi.fn() as unknown as typeof fetch;
    const results = await matchCastToArtists([], mockFetch);

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("부분 실패 시 실패 항목은 confidence 0으로 포함한다", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // 첫 번째 호출: 성공
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              artists: [
                { id: "aaa", name: "Match", score: 90, aliases: [] },
              ],
            }),
        });
      }
      // 두 번째 호출: 서버 에러
      return Promise.resolve({ ok: false, status: 500 });
    }) as unknown as typeof fetch;

    const results = await matchCastToArtists(
      [
        { name: "성공케이스", rawExtract: "성공케이스" },
        { name: "실패케이스", rawExtract: "실패케이스" },
      ],
      mockFetch,
    );

    expect(results).toHaveLength(2);
    expect(results[0].confidence).toBe(0.9);
    expect(results[0].match?.name).toBe("Match");
    expect(results[1].confidence).toBe(0);
    expect(results[1].match).toBeUndefined();
  });

  it("순차 호출을 보장한다 (병렬 금지)", async () => {
    const callOrder: number[] = [];
    let callCount = 0;

    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      const currentCall = callCount;
      callOrder.push(currentCall);

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            artists: [
              { id: `id-${currentCall}`, name: `Artist ${currentCall}`, score: 80, aliases: [] },
            ],
          }),
      });
    }) as unknown as typeof fetch;

    const threeExtractions: CastExtraction[] = [
      { name: "A", rawExtract: "A" },
      { name: "B", rawExtract: "B" },
      { name: "C", rawExtract: "C" },
    ];

    await matchCastToArtists(threeExtractions, mockFetch);

    // 호출 순서가 1, 2, 3 이어야 함 (순차)
    expect(callOrder).toEqual([1, 2, 3]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
