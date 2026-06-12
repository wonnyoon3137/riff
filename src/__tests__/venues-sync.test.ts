import { describe, it, expect, beforeEach, vi } from "vitest";

// kopisGet 모킹 — 실제 KOPIS 호출 없이 페이지네이션/정규화/부분실패를 검증.
// vi.mock 팩토리는 호이스팅되므로 mock 함수도 vi.hoisted 로 끌어올린다.
const { kopisGetMock } = vi.hoisted(() => ({ kopisGetMock: vi.fn() }));
vi.mock("@/server/kopis/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/kopis/client")>();
  return { ...actual, kopisGet: kopisGetMock };
});

import Database from "better-sqlite3";
import { syncVenues } from "@/server/venues/sync";
import { KopisApiError } from "@/server/kopis/client";
import { getVenueDb, searchByName, countVenues } from "@/server/venues/repo";
import type { KopisPrfplcListItem } from "@/server/kopis/raw-types";

/** 스키마가 초기화된 in-memory DB 핸들(테스트 간 공유). */
function freshDb(): Database.Database {
  // getVenueDb(":memory:")는 캐시하지 않고 새 인스턴스+스키마 초기화 후 반환.
  return getVenueDb(":memory:");
}

function makeItem(i: number): KopisPrfplcListItem {
  return {
    mt10id: `FC${String(i).padStart(4, "0")}`,
    fcltynm: `시설${i}`,
    sidonm: "서울특별시",
    gugunnm: "종로구",
    fcltychartr: "공공(문예회관)",
    mt13cnt: "2",
    opende: "2000",
  };
}

/** ROWS=100 기준으로 fullPages개 가득 찬 페이지 + 마지막 짧은 페이지를 생성 */
function pagedResponder(totalItems: number) {
  const ROWS = 100;
  return (path: string, params: Record<string, unknown>) => {
    const cpage = Number(params.cpage);
    const start = (cpage - 1) * ROWS;
    if (start >= totalItems) return Promise.resolve([]);
    const end = Math.min(start + ROWS, totalItems);
    const items: KopisPrfplcListItem[] = [];
    for (let i = start; i < end; i++) items.push(makeItem(i));
    return Promise.resolve(items);
  };
}

describe("syncVenues", () => {
  let db: Database.Database;

  beforeEach(() => {
    kopisGetMock.mockReset();
    db = freshDb();
  });

  it("전량 페이지네이션 후 upsert + 정규화(라벨→코드)", async () => {
    kopisGetMock.mockImplementation(pagedResponder(250)); // 3페이지(100,100,50)

    const result = await syncVenues({ db, log: () => {} });

    expect(result.fetched).toBe(250);
    expect(result.upserted).toBe(250);
    expect(result.failedPages).toEqual([]);
    expect(result.unmatchedSidoLabels).toEqual({});
    expect(countVenues(db)).toBe(250);

    // 정규화 검증: 서울특별시 → 11
    const r = searchByName("시설1", 1, db);
    expect(r[0]?.sidoCode).toBe("11");
    expect(r[0]?.sidoName).toBe("서울특별시");
  });

  it("정규화: sidonm 라벨이 sidoCode 로 파생된다", async () => {
    kopisGetMock.mockImplementation(pagedResponder(1));
    const result = await syncVenues({ db, log: () => {} });
    expect(result.upserted).toBe(1);
    expect(result.unmatchedSidoLabels).toEqual({});
    expect(searchByName("시설0", 1, db)[0]?.sidoCode).toBe("11");
  });

  it("미매핑 시도 라벨은 unmatchedSidoLabels에 집계", async () => {
    kopisGetMock.mockImplementation(() =>
      Promise.resolve([
        { mt10id: "FCX", fcltynm: "해외시설", sidonm: "도쿄도" },
      ]),
    );
    const result = await syncVenues({ db, log: () => {} });
    expect(result.unmatchedSidoLabels["도쿄도"]).toBeGreaterThanOrEqual(1);
    // 코드 파생 실패해도 시설 자체는 저장(sido_code만 null)
    expect(searchByName("해외시설", 1, db)[0]?.sidoCode).toBeUndefined();
  });

  it("NODATA(04)는 페이지 소진으로 처리", async () => {
    kopisGetMock.mockImplementation((_p: string, params: Record<string, unknown>) => {
      if (Number(params.cpage) === 1) {
        return Promise.resolve([makeItem(0)]);
      }
      return Promise.reject(new KopisApiError("04"));
    });
    const result = await syncVenues({ db, log: () => {} });
    expect(result.upserted).toBe(1);
    expect(result.failedPages).toEqual([]);
  });

  it("페이지 fetch 실패는 failedPages에 기록되고 성공분은 커밋", async () => {
    // page1: 100건(가득), page2: 실패(5xx류 throw), page3: 짧은 페이지(종료)
    kopisGetMock.mockImplementation((_p: string, params: Record<string, unknown>) => {
      const cpage = Number(params.cpage);
      if (cpage === 1) {
        return Promise.resolve(
          Array.from({ length: 100 }, (_, i) => makeItem(i)),
        );
      }
      if (cpage === 2) return Promise.reject(new Error("boom 5xx"));
      // cpage 3+ : 짧은 페이지 → 종료
      if (cpage === 3) return Promise.resolve([makeItem(200)]);
      return Promise.resolve([]);
    });

    const result = await syncVenues({ db, log: () => {} });
    expect(result.failedPages).toContain(2);
    // 성공분(page1 100건 + page3 1건)은 upsert
    expect(result.upserted).toBeGreaterThanOrEqual(101);
  });

  it("dedup: 동일 mt10id가 여러 페이지에 나와도 1건", async () => {
    kopisGetMock.mockImplementation((_p: string, params: Record<string, unknown>) => {
      const cpage = Number(params.cpage);
      if (cpage === 1) {
        // 같은 id 100건 채워 다음 페이지로
        return Promise.resolve(
          Array.from({ length: 100 }, () => makeItem(7)),
        );
      }
      if (cpage === 2) return Promise.resolve([makeItem(7)]); // 짧은 페이지 종료, 같은 id
      return Promise.resolve([]);
    });
    const result = await syncVenues({ db, log: () => {} });
    expect(result.fetched).toBe(1);
    expect(result.upserted).toBe(1);
  });
});
