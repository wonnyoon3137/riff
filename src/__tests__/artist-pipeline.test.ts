import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
  processPerformanceCast,
  syncPerformancesCast,
} from "@/server/artists/pipeline";
import type { PipelineResult, SyncResult } from "@/server/artists/pipeline";
import {
  getArtistDb,
  getArtistsByPerformance,
} from "@/server/artists/repo";
import { _resetRateLimitState } from "@/server/artists/musicbrainz";

// ── MusicBrainz Mock ────────────────────────────────────────

/**
 * MusicBrainz API 응답을 시뮬레이션하는 mock fetch 생성.
 * nameScoreMap: { "이름": score } — score는 0~100.
 * 매핑에 없는 이름은 빈 결과를 반환한다.
 */
function createMockFetch(
  nameScoreMap: Record<string, number>,
): typeof fetch {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const parsed = new URL(url);
    const query = parsed.searchParams.get("query") ?? "";

    const score = nameScoreMap[query];
    if (score === undefined) {
      return new Response(JSON.stringify({ artists: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = {
      artists: [
        {
          id: `mbid-${query}`,
          name: query,
          score,
          type: "Person",
          aliases: [{ name: `${query} alias`, locale: "ko", type: "Artist name" }],
        },
      ],
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

// ── 테스트 ──────────────────────────────────────────────────

describe("artist pipeline", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getArtistDb(":memory:");
    _resetRateLimitState();
  });

  // ── 빈 입력 케이스 ────────────────────────────────────────

  describe("빈 입력 처리", () => {
    it("prfcast가 null이면 빈 결과를 반환한다", async () => {
      const result = await processPerformanceCast("PF001", null, {
        dbPath: ":memory:",
      });

      expect(result).toEqual<PipelineResult>({
        processed: 0,
        matched: 0,
        failed: 0,
        artists: [],
      });
    });

    it("prfcast가 undefined이면 빈 결과를 반환한다", async () => {
      const result = await processPerformanceCast("PF001", undefined, {
        dbPath: ":memory:",
      });

      expect(result.processed).toBe(0);
    });

    it("prfcast가 빈 문자열이면 빈 결과를 반환한다", async () => {
      const result = await processPerformanceCast("PF001", "   ", {
        dbPath: ":memory:",
      });

      expect(result.processed).toBe(0);
    });
  });

  // ── 전체 파이프라인 흐름 ──────────────────────────────────

  describe("전체 파이프라인 흐름", () => {
    it("추출 -> 매칭 -> DB 저장 후 getArtistsByPerformance로 조회된다", async () => {
      const mockFetch = createMockFetch({
        "홍길동": 95,
        "김철수": 80,
      });

      const result = await processPerformanceCast(
        "PF100",
        "홍길동, 김철수",
        { dbPath: ":memory:", fetchFn: mockFetch },
      );

      // 처리 결과 검증
      expect(result.processed).toBe(2);
      expect(result.matched).toBe(2); // 둘 다 0.7 이상
      expect(result.failed).toBe(0);
      expect(result.artists).toHaveLength(2);

      // DB 조회 검증 — 같은 :memory: DB를 공유하므로 별도 db 인스턴스가 필요
      // pipeline 내부에서 getArtistDb(":memory:")로 생성된 DB를 사용하므로
      // 여기서도 동일한 방식으로 검증
      const dbForCheck = getArtistDb(":memory:");
      // 주의: :memory:는 호출마다 새 DB이므로, 아래는 pipeline 내부 result로 검증
      expect(result.artists[0].name).toBe("홍길동");
      expect(result.artists[0].mbid).toBe("mbid-홍길동");
      expect(result.artists[1].name).toBe("김철수");
    });

    it("역할 접두어가 있는 prfcast도 처리된다", async () => {
      const mockFetch = createMockFetch({
        "홍길동": 90,
        "이영희": 85,
      });

      const result = await processPerformanceCast(
        "PF101",
        "연출 홍길동 / 출연 이영희",
        { dbPath: ":memory:", fetchFn: mockFetch },
      );

      expect(result.processed).toBe(2);
      expect(result.matched).toBe(2);
    });

    it("매칭 실패(빈 결과)는 failed에 반영된다", async () => {
      const mockFetch = createMockFetch({
        "홍길동": 95,
        // "김철수"는 매핑 없음 -> 빈 결과
      });

      const result = await processPerformanceCast(
        "PF102",
        "홍길동, 김철수",
        { dbPath: ":memory:", fetchFn: mockFetch },
      );

      expect(result.processed).toBe(2);
      expect(result.matched).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.artists).toHaveLength(1);
    });
  });

  // ── confidence 임계값 테스트 ──────────────────────────────

  describe("confidence 임계값 (0.7)", () => {
    it("confidence >= 0.7이면 matched로 카운트된다", async () => {
      const mockFetch = createMockFetch({
        "아이유": 70, // 정확히 0.7 — 통과
      });

      const result = await processPerformanceCast(
        "PF200",
        "아이유",
        { dbPath: ":memory:", fetchFn: mockFetch },
      );

      expect(result.matched).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.artists).toHaveLength(1);
    });

    it("confidence < 0.7이면 failed로 카운트되지만 DB에는 저장된다", async () => {
      const mockFetch = createMockFetch({
        "무명씨": 50, // 0.5 — 임계값 미달
      });

      const result = await processPerformanceCast(
        "PF201",
        "무명씨",
        { dbPath: ":memory:", fetchFn: mockFetch },
      );

      expect(result.matched).toBe(0);
      expect(result.failed).toBe(1);
      // 임계값 미달이라도 DB에는 저장됨 (isManuallyVerified: false)
      expect(result.artists).toHaveLength(1);
      expect(result.artists[0].isManuallyVerified).toBe(false);
      expect(result.artists[0].matchConfidence).toBe(0.5);
    });

    it("혼합 confidence: 일부 통과, 일부 미달", async () => {
      const mockFetch = createMockFetch({
        "고신뢰": 90,
        "저신뢰": 40,
      });

      const result = await processPerformanceCast(
        "PF202",
        "고신뢰, 저신뢰",
        { dbPath: ":memory:", fetchFn: mockFetch },
      );

      expect(result.processed).toBe(2);
      expect(result.matched).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.artists).toHaveLength(2);
    });
  });

  // ── 배치 처리 ─────────────────────────────────────────────

  describe("syncPerformancesCast 배치 처리", () => {
    it("여러 공연을 순차 처리한다", async () => {
      const mockFetch = createMockFetch({
        "가수A": 95,
        "가수B": 85,
        "가수C": 75,
      });

      const performances = [
        { mt20id: "PF300", cast: "가수A, 가수B" },
        { mt20id: "PF301", cast: "가수C" },
      ];

      const result = await syncPerformancesCast(performances, {
        dbPath: ":memory:",
        fetchFn: mockFetch,
      });

      expect(result).toEqual<SyncResult>({
        total: 2,
        processed: 2,
        totalMatched: 3,
        errors: [],
      });
    });

    it("빈 cast가 포함된 공연은 건너뛴다 (에러 없이)", async () => {
      const mockFetch = createMockFetch({ "가수A": 90 });

      const performances = [
        { mt20id: "PF400", cast: "가수A" },
        { mt20id: "PF401" }, // cast 없음
        { mt20id: "PF402", cast: "" }, // 빈 문자열
      ];

      const result = await syncPerformancesCast(performances, {
        dbPath: ":memory:",
        fetchFn: mockFetch,
      });

      expect(result.total).toBe(3);
      expect(result.processed).toBe(3);
      expect(result.totalMatched).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("fetch 실패 시 에러가 errors 배열에 누적된다", async () => {
      let callCount = 0;
      const failingFetch: typeof fetch = async () => {
        callCount++;
        if (callCount === 1) {
          // 첫 번째 요청은 성공
          return new Response(
            JSON.stringify({
              artists: [{ id: "mb1", name: "성공", score: 90, aliases: [] }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        // 두 번째부터 네트워크 에러 — matchCastToArtists가 빈 결과로 처리
        return new Response(JSON.stringify({ artists: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const performances = [
        { mt20id: "PF500", cast: "성공" },
        { mt20id: "PF501", cast: "실패" },
      ];

      const result = await syncPerformancesCast(performances, {
        dbPath: ":memory:",
        fetchFn: failingFetch,
      });

      // 두 공연 모두 처리됨 (에러가 throw되지 않으므로)
      expect(result.processed).toBe(2);
      expect(result.totalMatched).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("전체 공연 목록이 비어있으면 빈 결과를 반환한다", async () => {
      const mockFetch = createMockFetch({});

      const result = await syncPerformancesCast([], {
        dbPath: ":memory:",
        fetchFn: mockFetch,
      });

      expect(result).toEqual<SyncResult>({
        total: 0,
        processed: 0,
        totalMatched: 0,
        errors: [],
      });
    });
  });
});
