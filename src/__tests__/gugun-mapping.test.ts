import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GUGUN_MAP,
  SIDO_LIST,
  getUnmatchedGugunLabels,
  gugunCodeToLabel,
  gugunCodeToSido,
  gugunLabelToCode,
  gugunLabelToCodeLoose,
  resetUnmatchedGugunLabels,
} from "@/domain/kopis-codes";

// P1-2: 구군 코드 매핑 테스트 (kopis-codes.md section 4, 행정표준코드 앞4자리)

describe("GUGUN_MAP — 구조 무결성", () => {
  it("17개 시도 전체에 구군 엔트리가 존재한다", () => {
    for (const sido of SIDO_LIST) {
      expect(GUGUN_MAP[sido.code]).toBeDefined();
      expect(GUGUN_MAP[sido.code].length).toBeGreaterThan(0);
    }
  });

  it("모든 구군코드는 4자리 문자열이다", () => {
    for (const [, entries] of Object.entries(GUGUN_MAP)) {
      for (const entry of entries) {
        expect(entry.code).toMatch(/^\d{4}$/);
      }
    }
  });

  it("구군코드 앞 2자리는 해당 시도코드와 일치한다", () => {
    for (const [sidoCode, entries] of Object.entries(GUGUN_MAP)) {
      for (const entry of entries) {
        expect(entry.code.slice(0, 2)).toBe(sidoCode);
      }
    }
  });

  it("동일 시도 내 구군코드에 중복이 없다", () => {
    for (const [, entries] of Object.entries(GUGUN_MAP)) {
      const codes = entries.map((e) => e.code);
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    }
  });

  it("구군 이름이 비어있지 않다", () => {
    for (const [, entries] of Object.entries(GUGUN_MAP)) {
      for (const entry of entries) {
        expect(entry.name.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("GUGUN_MAP — 서울 구군 (kopis-codes.md section 4.1 검증 완료)", () => {
  // kopis-codes.md section 4.1에서 전량 검증된 서울 25구
  const seoulVerified: [string, string][] = [
    ["1111", "종로구"],
    ["1114", "중구"],
    ["1117", "용산구"],
    ["1120", "성동구"],
    ["1121", "광진구"],
    ["1123", "동대문구"],
    ["1126", "중랑구"],
    ["1129", "성북구"],
    ["1130", "강북구"],
    ["1132", "도봉구"],
    ["1135", "노원구"],
    ["1138", "은평구"],
    ["1141", "서대문구"],
    ["1144", "마포구"],
    ["1147", "양천구"],
    ["1150", "강서구"],
    ["1153", "구로구"],
    ["1154", "금천구"],
    ["1156", "영등포구"],
    ["1159", "동작구"],
    ["1162", "관악구"],
    ["1165", "서초구"],
    ["1168", "강남구"],
    ["1171", "송파구"],
    ["1174", "강동구"],
  ];

  it("서울 25구 전량 포함", () => {
    expect(GUGUN_MAP["11"]).toHaveLength(25);
  });

  it.each(seoulVerified)("코드 %s = %s", (code, name) => {
    const entry = GUGUN_MAP["11"].find((e) => e.code === code);
    expect(entry).toBeDefined();
    expect(entry!.name).toBe(name);
  });
});

describe("GUGUN_MAP — 주요 시도 구군 수 검증", () => {
  // 행정표준코드 기준 시군구 수 (법적 시군구)
  const expectedCounts: [string, string, number][] = [
    ["11", "서울", 25],
    ["26", "부산", 16],
    ["29", "광주", 5],
    ["30", "대전", 5],
    ["50", "제주", 2],
  ];

  it.each(expectedCounts)(
    "시도 %s(%s) 구군 수 = %d",
    (code, _name, count) => {
      expect(GUGUN_MAP[code]).toHaveLength(count);
    },
  );
});

describe("gugunLabelToCode — 시도코드 지정 역매핑", () => {
  it("서울 종로구 -> 1111", () => {
    expect(gugunLabelToCode("11", "종로구")).toBe("1111");
  });

  it("서울 강남구 -> 1168", () => {
    expect(gugunLabelToCode("11", "강남구")).toBe("1168");
  });

  it("부산 해운대구 -> 2635", () => {
    expect(gugunLabelToCode("26", "해운대구")).toBe("2635");
  });

  it("제주 서귀포시 -> 5013", () => {
    expect(gugunLabelToCode("50", "서귀포시")).toBe("5013");
  });

  it("경기 수원시 -> 4111", () => {
    expect(gugunLabelToCode("41", "수원시")).toBe("4111");
  });

  it("동명 구군 구분: 서울 중구(1114) vs 부산 중구(2611)", () => {
    expect(gugunLabelToCode("11", "중구")).toBe("1114");
    expect(gugunLabelToCode("26", "중구")).toBe("2611");
  });

  it("null/undefined/빈 입력 -> undefined", () => {
    expect(gugunLabelToCode("11", null)).toBeUndefined();
    expect(gugunLabelToCode("11", undefined)).toBeUndefined();
    expect(gugunLabelToCode("11", "")).toBeUndefined();
    expect(gugunLabelToCode("", "종로구")).toBeUndefined();
  });

  it("존재하지 않는 구군 -> undefined", () => {
    expect(gugunLabelToCode("11", "없는구")).toBeUndefined();
  });

  it("존재하지 않는 시도코드 -> undefined", () => {
    expect(gugunLabelToCode("99", "종로구")).toBeUndefined();
  });
});

describe("gugunCodeToSido — 구군코드에서 시도코드 추출", () => {
  it("1111 -> 11 (서울)", () => {
    expect(gugunCodeToSido("1111")).toBe("11");
  });

  it("2635 -> 26 (부산)", () => {
    expect(gugunCodeToSido("2635")).toBe("26");
  });

  it("5013 -> 50 (제주)", () => {
    expect(gugunCodeToSido("5013")).toBe("50");
  });
});

describe("gugunCodeToLabel — 구군코드에서 라벨 조회", () => {
  it("1111 -> 종로구", () => {
    expect(gugunCodeToLabel("1111")).toBe("종로구");
  });

  it("2635 -> 해운대구", () => {
    expect(gugunCodeToLabel("2635")).toBe("해운대구");
  });

  it("존재하지 않는 코드 -> undefined", () => {
    expect(gugunCodeToLabel("9999")).toBeUndefined();
  });
});

describe("gugunLabelToCodeLoose — 시도코드 없이 전체 검색", () => {
  afterEach(() => {
    resetUnmatchedGugunLabels();
    vi.restoreAllMocks();
  });

  it("유일한 구군명은 정확히 매핑", () => {
    expect(gugunLabelToCodeLoose("해운대구")).toBe("2635");
    expect(gugunLabelToCodeLoose("강남구")).toBe("1168");
  });

  it("미매핑 라벨은 undefined + 경고 로그", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(gugunLabelToCodeLoose("없는구")).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(getUnmatchedGugunLabels()).toEqual({ 없는구: 1 });
  });

  it("null/undefined -> undefined (경고 없음)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(gugunLabelToCodeLoose(null)).toBeUndefined();
    expect(gugunLabelToCodeLoose(undefined)).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});
