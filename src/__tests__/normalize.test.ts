import { describe, it, expect } from "vitest";
import {
  emptyToUndef,
  kopisDateToISO,
  toState,
  toGenre,
  toPerformanceSummary,
  toPerformance,
  toVenue,
} from "@/server/kopis/normalize";
import type { KopisPblprfrListItem, KopisPblprfrDetail, KopisPrfplcListItem } from "@/server/kopis/raw-types";

describe("emptyToUndef", () => {
  it("converts empty string to undefined", () => {
    expect(emptyToUndef("")).toBeUndefined();
    expect(emptyToUndef("  ")).toBeUndefined();
  });
  it("preserves non-empty strings", () => {
    expect(emptyToUndef("hello")).toBe("hello");
    expect(emptyToUndef(" hello ")).toBe("hello");
  });
  it("handles null/undefined", () => {
    expect(emptyToUndef(null)).toBeUndefined();
    expect(emptyToUndef(undefined)).toBeUndefined();
  });
});

describe("kopisDateToISO", () => {
  it("converts yyyy.MM.dd to yyyy-MM-dd", () => {
    expect(kopisDateToISO("2026.07.01")).toBe("2026-07-01");
    expect(kopisDateToISO("2021.08.21")).toBe("2021-08-21");
  });
});

describe("toState", () => {
  it("maps KOPIS labels to PerformanceState", () => {
    expect(toState("공연중")).toBe("ONGOING");
    expect(toState("공연예정")).toBe("UPCOMING");
    expect(toState("공연완료")).toBe("ENDED");
  });
  it("defaults to UPCOMING for unknown/empty", () => {
    expect(toState("")).toBe("UPCOMING");
    expect(toState(undefined)).toBe("UPCOMING");
  });
});

describe("toGenre", () => {
  it("maps KOPIS genrenm labels to Genre enum", () => {
    expect(toGenre("뮤지컬")).toBe("MUSICAL");
    expect(toGenre("연극")).toBe("THEATER");
    expect(toGenre("대중음악")).toBe("POPULAR_MUSIC");
    expect(toGenre("서양음악(클래식)")).toBe("CLASSIC");
    expect(toGenre("한국음악(국악)")).toBe("KOREAN_MUSIC");
    expect(toGenre("무용(서양/한국무용)")).toBe("DANCE");
    expect(toGenre("서커스/마술")).toBe("CIRCUS_MAGIC");
  });
  it("returns undefined for unknown", () => {
    expect(toGenre("기타")).toBeUndefined();
    expect(toGenre(undefined)).toBeUndefined();
  });
});

describe("toPerformanceSummary", () => {
  it("normalizes a KOPIS list item", () => {
    const raw: KopisPblprfrListItem = {
      mt20id: "PF178134",
      prfnm: "반짝반짝 인어공주",
      prfpdfrom: "2021.08.21",
      prfpdto: "2024.09.29",
      fcltynm: "달밤엔씨어터",
      poster: "http://www.kopis.or.kr/upload/pfmPoster/PF_PF178134.PNG",
      area: "서울특별시",
      genrenm: "뮤지컬",
      openrun: "Y",
      prfstate: "공연중",
    };
    const result = toPerformanceSummary(raw);
    expect(result).toEqual({
      id: "PF178134",
      title: "반짝반짝 인어공주",
      posterUrl: "http://www.kopis.or.kr/upload/pfmPoster/PF_PF178134.PNG",
      period: { from: "2021-08-21", to: "2024-09-29" },
      venueName: "달밤엔씨어터",
      area: "서울특별시",
      genre: "MUSICAL",
      genreLabel: "뮤지컬",
      state: "ONGOING",
      openrun: true,
    });
  });

  it("handles missing optional fields", () => {
    const raw: KopisPblprfrListItem = {
      mt20id: "PF000001",
      prfnm: "테스트",
      prfpdfrom: "2026.01.01",
      prfpdto: "2026.01.31",
      fcltynm: "테스트장",
      genrenm: "연극",
      prfstate: "공연예정",
    };
    const result = toPerformanceSummary(raw);
    expect(result.posterUrl).toBeUndefined();
    expect(result.area).toBeUndefined();
    expect(result.openrun).toBeUndefined();
    expect(result.state).toBe("UPCOMING");
  });
});

describe("toPerformance (detail)", () => {
  it("preserves free-text fields as-is", () => {
    const raw: KopisPblprfrDetail = {
      mt20id: "PF178134",
      mt10id: "FC001431",
      mt13id: "FC001431-01",
      prfnm: "테스트 공연",
      prfpdfrom: "2026.07.01",
      prfpdto: "2026.07.31",
      fcltynm: "테스트장",
      genrenm: "뮤지컬",
      prfstate: "공연중",
      prfcast: "홍길동, 김철수",
      prfcrew: "이감독",
      prfage: "만 7세 이상",
      prfruntime: "2시간",
      dtguidance: "수요일~금요일(19:30), 토요일(15:00, 19:30)",
      pcseguidance: "VIP석 150,000원, R석 130,000원",
      sty: "어느 날 갑자기...\n모든 것이 변했다.",
      entrpsnm: "테스트엔터",
      entrpsnmP: "제작사A",
      entrpsnmA: "기획사B",
      entrpsnmH: "주최C",
      entrpsnmS: "주관D",
      styurls: { styurl: ["http://img1.jpg", "http://img2.jpg"] },
      relates: {
        relate: [
          { relatenm: "인터파크", relateurl: "http://interpark.com" },
          { relateurl: "http://other.com" },
        ],
      },
    };
    const result = toPerformance(raw);

    // 자유 텍스트 원문 보존
    expect(result.cast).toBe("홍길동, 김철수");
    expect(result.crew).toBe("이감독");
    expect(result.ageGuidance).toBe("만 7세 이상");
    expect(result.timeGuidance).toBe("수요일~금요일(19:30), 토요일(15:00, 19:30)");
    expect(result.priceGuidance).toBe("VIP석 150,000원, R석 130,000원");
    expect(result.story).toBe("어느 날 갑자기...\n모든 것이 변했다.");

    // 제작 정보
    expect(result.producers).toEqual({
      main: "테스트엔터",
      producer: "제작사A",
      planner: "기획사B",
      host: "주최C",
      supervisor: "주관D",
    });

    // 소개 이미지
    expect(result.introImages).toEqual([
      { url: "http://img1.jpg" },
      { url: "http://img2.jpg" },
    ]);

    // 예매처 (relatenm optional)
    expect(result.bookings).toEqual([
      { name: "인터파크", url: "http://interpark.com" },
      { name: undefined, url: "http://other.com" },
    ]);

    // 공연시설 정보
    expect(result.venueId).toBe("FC001431");
    expect(result.hallId).toBe("FC001431-01");
  });
});

describe("toVenue", () => {
  it("normalizes venue with sido label to code mapping", () => {
    const raw: KopisPrfplcListItem = {
      mt10id: "FC001234",
      fcltynm: "예술의전당",
      mt13cnt: "5",
      fcltychartr: "중앙정부",
      sidonm: "서울",
      gugunnm: "서초구",
      opende: "1988",
    };
    const result = toVenue(raw, new Date("2026-06-09T00:00:00Z"));
    expect(result.id).toBe("FC001234");
    expect(result.name).toBe("예술의전당");
    expect(result.sidoCode).toBe("11"); // 서울 -> 11
    expect(result.hallCount).toBe(5);
    expect(result.syncedAt).toBe("2026-06-09T00:00:00.000Z");
  });
});
