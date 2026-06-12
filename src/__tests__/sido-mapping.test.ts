import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SIDO_LIST,
  getUnmatchedSidoLabels,
  normalizeSidoLabel,
  resetUnmatchedSidoLabels,
  sidoLabelToCode,
} from "@/domain/kopis-codes";

// T-04: 시설 시도 라벨 -> signgucode 역매핑 (kopis-integration §6.3, kopis-codes.md §3)
// 범위: 시도까지만(구군 역매핑은 v0.2 보류).

describe("sidoLabelToCode — 17개 시도 정식 명칭", () => {
  // §3 검증표 그대로. (라벨, 기대 코드)
  const official: [string, string][] = [
    ["서울특별시", "11"],
    ["부산광역시", "26"],
    ["대구광역시", "27"],
    ["인천광역시", "28"],
    ["광주광역시", "29"],
    ["대전광역시", "30"],
    ["울산광역시", "31"],
    ["세종특별자치시", "36"],
    ["경기도", "41"],
    ["강원특별자치도", "51"],
    ["충청북도", "43"],
    ["충청남도", "44"],
    ["전라북도", "45"],
    ["전라남도", "46"],
    ["경상북도", "47"],
    ["경상남도", "48"],
    ["제주특별자치도", "50"],
  ];

  it.each(official)("'%s' -> %s", (label, code) => {
    expect(sidoLabelToCode(label)).toBe(code);
  });

  it("17개 시도 전량 커버", () => {
    expect(official).toHaveLength(17);
    expect(SIDO_LIST).toHaveLength(17);
  });

  it("SIDO_LIST 정식 명칭이 모두 §3 코드로 매핑된다", () => {
    for (const s of SIDO_LIST) {
      expect(sidoLabelToCode(s.name)).toBe(s.code);
    }
  });
});

describe("sidoLabelToCode — 축약 라벨", () => {
  const short: [string, string][] = [
    ["서울", "11"],
    ["부산", "26"],
    ["대구", "27"],
    ["인천", "28"],
    ["광주", "29"],
    ["대전", "30"],
    ["울산", "31"],
    ["세종", "36"],
    ["경기", "41"],
    ["강원", "51"],
    ["충북", "43"],
    ["충남", "44"],
    ["전북", "45"],
    ["전남", "46"],
    ["경북", "47"],
    ["경남", "48"],
    ["제주", "50"],
  ];

  it.each(short)("'%s' -> %s", (label, code) => {
    expect(sidoLabelToCode(label)).toBe(code);
  });

  it("17개 축약 라벨 전량 커버", () => {
    expect(short).toHaveLength(17);
  });
});

describe("sidoLabelToCode — 구/변형 명칭 별칭", () => {
  const aliases: [string, string][] = [
    ["강원도", "51"], // 구 명칭
    ["제주도", "50"], // 구 명칭
    ["전북특별자치도", "45"], // 신 명칭
    ["서울시", "11"],
    ["부산시", "26"],
  ];

  it.each(aliases)("'%s' -> %s", (label, code) => {
    expect(sidoLabelToCode(label)).toBe(code);
  });
});

describe("sidoLabelToCode — 정규화(공백) 처리", () => {
  it("앞뒤 공백 제거", () => {
    expect(sidoLabelToCode("  서울  ")).toBe("11");
  });

  it("내부 공백 제거", () => {
    expect(sidoLabelToCode("서울 특별시")).toBe("11");
  });

  it("normalizeSidoLabel은 모든 공백 제거", () => {
    expect(normalizeSidoLabel(" 경상 북도 ")).toBe("경상북도");
  });
});

describe("sidoLabelToCode — 미지의 라벨 -> null(undefined)", () => {
  afterEach(() => {
    resetUnmatchedSidoLabels();
    vi.restoreAllMocks();
  });

  it("알 수 없는 라벨은 undefined", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(sidoLabelToCode("외국")).toBeUndefined();
    expect(sidoLabelToCode("해외")).toBeUndefined();
  });

  it("빈/null/undefined 입력은 undefined", () => {
    expect(sidoLabelToCode("")).toBeUndefined();
    expect(sidoLabelToCode("   ")).toBeUndefined();
    expect(sidoLabelToCode(null)).toBeUndefined();
    expect(sidoLabelToCode(undefined)).toBeUndefined();
  });

  it("미매핑 라벨은 카운트되고 첫 관측 시 1회 경고", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    sidoLabelToCode("알수없는지역");
    sidoLabelToCode("알수없는지역");
    sidoLabelToCode("또다른지역");

    expect(getUnmatchedSidoLabels()).toEqual({
      알수없는지역: 2,
      또다른지역: 1,
    });
    // 라벨당 1회만 경고(노이즈 억제) -> 서로 다른 라벨 2종 = 2회
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("정상 매핑은 카운트되지 않는다", () => {
    sidoLabelToCode("서울");
    expect(getUnmatchedSidoLabels()).toEqual({});
  });
});
