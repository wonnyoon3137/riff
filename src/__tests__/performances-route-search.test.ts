import { describe, it, expect, beforeEach, vi } from "vitest";
import type { KopisPblprfrListItem } from "@/server/kopis/raw-types";

/**
 * #8 F5 — BFF가 공연명 검색(shprfnm)을 단일/다중지역 경로에 동일 부착하는지 검증.
 * KOPIS 호출부(kopisGet)를 모킹해 전송 파라미터를 캡처한다.
 *
 * 검증 대상:
 *  - 전국 단일 경로: shprfnm 부착(>=2자), 미부착(<2자)
 *  - 다중지역 누적 경로: 각 지역 호출 전부에 동일 shprfnm 부착(추가 호출 0, 병합 불변)
 *  - 순수 AND(DEC-S1): 기간/장르/지역 파라미터는 그대로, shprfnm만 더해짐
 */

// kopisGet 호출 파라미터를 기록하는 모킹.
const calls: Array<{
  path: string;
  params: Record<string, string | number | undefined>;
}> = [];

vi.mock("@/server/kopis/client", () => {
  class KopisApiError extends Error {
    constructor(
      public resultCode: string,
      message?: string,
    ) {
      super(message);
      this.name = "KopisApiError";
    }
  }
  return {
    KopisApiError,
    KopisHttpError: class extends Error {},
    kopisGet: vi.fn(
      async (
        path: string,
        params: Record<string, string | number | undefined>,
      ) => {
        calls.push({ path, params });
        // 한 페이지를 채우지 않는 소량(<rows) 반환 → 누적 fetch 조기 종료.
        const item: KopisPblprfrListItem = {
          mt20id: `${params.signgucode ?? "all"}-${params.cpage}`,
          prfnm: "테스트 공연",
          prfpdfrom: "2026.06.20",
          prfpdto: "2026.06.25",
          fcltynm: "테스트 극장",
          area: "서울",
          genrenm: "뮤지컬",
          prfstate: "공연예정",
        };
        return [item];
      },
    ),
  };
});

import { GET } from "@/app/api/performances/route";

function makeRequest(query: string) {
  return { nextUrl: new URL(`http://localhost/api/performances?${query}`) } as Parameters<
    typeof GET
  >[0];
}

describe("F5 BFF shprfnm 부착", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("전국 단일 경로: q>=2자면 shprfnm 부착", async () => {
    await GET(makeRequest("q=오페라"));
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe("/pblprfr");
    expect(calls[0].params.shprfnm).toBe("오페라");
    // 순수 AND: 기간 파라미터는 그대로 유지(stdate/eddate 존재).
    expect(calls[0].params.stdate).toBeTruthy();
    expect(calls[0].params.eddate).toBeTruthy();
    expect(calls[0].params.signgucode).toBeUndefined();
  });

  it("전국 단일 경로: q<2자면 shprfnm 미전송(전체 목록)", async () => {
    await GET(makeRequest("q=가"));
    expect(calls).toHaveLength(1);
    expect(calls[0].params.shprfnm).toBeUndefined();
  });

  it("전국 단일 경로: q 없으면 shprfnm 미전송", async () => {
    await GET(makeRequest(""));
    expect(calls).toHaveLength(1);
    expect(calls[0].params.shprfnm).toBeUndefined();
  });

  it("다중지역 경로: 모든 지역 호출에 동일 shprfnm 부착", async () => {
    await GET(makeRequest("region=11,41&q=뮤지컬"));
    // 2개 지역, 각 지역 page=1 (소량 반환으로 조기종료) → 2 호출.
    expect(calls).toHaveLength(2);
    const codes = calls.map((c) => c.params.signgucode).sort();
    expect(codes).toEqual(["11", "41"]);
    // 모든 지역 호출에 검색어가 동일 부착(누락 0).
    for (const c of calls) {
      expect(c.params.shprfnm).toBe("뮤지컬");
      expect(c.params.stdate).toBeTruthy(); // 기간 AND 유지
    }
  });

  it("다중지역 경로: q<2자면 모든 지역에서 shprfnm 미전송(호출 수 불변)", async () => {
    await GET(makeRequest("region=11,41&q=가"));
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.params.shprfnm).toBeUndefined();
    }
  });

  it("순수 AND: 장르(shcate)+검색(shprfnm) 동시 부착", async () => {
    await GET(makeRequest("genre=musical&q=오페라"));
    expect(calls).toHaveLength(1);
    expect(calls[0].params.shcate).toBeTruthy(); // 장르 그대로
    expect(calls[0].params.shprfnm).toBe("오페라"); // 검색만 추가
  });
});
