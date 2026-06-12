import { describe, it, expect } from "vitest";
import {
  parsePriceBand,
  extractPrices,
  type PriceBand,
} from "@/domain/price-band";

// ── extractPrices ───────────────────────────────────────────

describe("extractPrices", () => {
  it("콤마+원 표기 (150,000원)", () => {
    expect(extractPrices("VIP석 150,000원")).toContain(150000);
  });

  it("만원 표기 (5만원)", () => {
    expect(extractPrices("전석 5만원")).toContain(50000);
  });

  it("만+천 표기 (5만5천원)", () => {
    expect(extractPrices("전석 5만5천원")).toContain(55000);
  });

  it("다수 등급 추출", () => {
    const prices = extractPrices("VIP석 150,000원, R석 130,000원, S석 99,000원");
    expect(prices).toContain(150000);
    expect(prices).toContain(130000);
    expect(prices).toContain(99000);
  });

  it("슬래시 구분자", () => {
    const prices = extractPrices("VIP 12만원 / R 9만9천원 / S 8만8천원");
    expect(prices).toContain(120000);
    expect(prices).toContain(99000);
    expect(prices).toContain(88000);
  });

  it("숫자 없는 텍스트는 빈 배열", () => {
    expect(extractPrices("가격 문의")).toEqual([]);
    expect(extractPrices("추후 공지")).toEqual([]);
  });
});

// ── parsePriceBand ──────────────────────────────────────────

describe("parsePriceBand", () => {
  // 무료/초대
  describe("FREE band", () => {
    const freeCases = [
      "무료",
      "전석 무료",
      "전석 초대",
      "입장 무료",
      "무료 공연",
      "무료 관람",
      "0원",
    ];
    it.each(freeCases)('"%s" → FREE', (text) => {
      const result = parsePriceBand(text);
      expect(result.band).toBe("FREE");
      expect(result.lowestPrice).toBe(0);
      expect(result.label).toBe("무료/초대");
    });
  });

  // ~3만 밴드
  describe("UNDER_30K band", () => {
    it("전석 2만원", () => {
      const result = parsePriceBand("전석 2만원");
      expect(result.band).toBe("UNDER_30K");
      expect(result.lowestPrice).toBe(20000);
    });

    it("전석 30,000원 (경계값)", () => {
      const result = parsePriceBand("전석 30,000원");
      expect(result.band).toBe("UNDER_30K");
      expect(result.lowestPrice).toBe(30000);
    });

    it("균일가 15,000원", () => {
      const result = parsePriceBand("균일가 15,000원");
      expect(result.band).toBe("UNDER_30K");
      expect(result.lowestPrice).toBe(15000);
    });
  });

  // 3~7만 밴드
  describe("UNDER_70K band", () => {
    it("전석 5만원", () => {
      const result = parsePriceBand("전석 5만원");
      expect(result.band).toBe("UNDER_70K");
      expect(result.lowestPrice).toBe(50000);
    });

    it("R석 66,000원 / S석 44,000원 (최저가 기준)", () => {
      const result = parsePriceBand("R석 66,000원 / S석 44,000원");
      expect(result.band).toBe("UNDER_70K");
      expect(result.lowestPrice).toBe(44000);
    });

    it("전석 70,000원 (경계값)", () => {
      const result = parsePriceBand("전석 70,000원");
      expect(result.band).toBe("UNDER_70K");
      expect(result.lowestPrice).toBe(70000);
    });
  });

  // 7만+ 밴드
  describe("OVER_70K band", () => {
    it("VIP 150,000원 / R 130,000원 / S 99,000원 (최저가 기준)", () => {
      const result = parsePriceBand(
        "VIP석 150,000원, R석 130,000원, S석 99,000원",
      );
      expect(result.band).toBe("OVER_70K");
      expect(result.lowestPrice).toBe(99000);
    });

    it("전석 8만원", () => {
      const result = parsePriceBand("전석 8만원");
      expect(result.band).toBe("OVER_70K");
      expect(result.lowestPrice).toBe(80000);
    });
  });

  // 가변/미정
  describe("VARIABLE band", () => {
    it("null → VARIABLE", () => {
      const result = parsePriceBand(null);
      expect(result.band).toBe("VARIABLE");
      expect(result.lowestPrice).toBeNull();
    });

    it("undefined → VARIABLE", () => {
      const result = parsePriceBand(undefined);
      expect(result.band).toBe("VARIABLE");
      expect(result.lowestPrice).toBeNull();
    });

    it("빈 문자열 → VARIABLE", () => {
      const result = parsePriceBand("");
      expect(result.band).toBe("VARIABLE");
    });

    it("공백만 → VARIABLE", () => {
      const result = parsePriceBand("   ");
      expect(result.band).toBe("VARIABLE");
    });

    it("가격 문의 → VARIABLE", () => {
      const result = parsePriceBand("가격 문의");
      expect(result.band).toBe("VARIABLE");
      expect(result.lowestPrice).toBeNull();
    });

    it("추후 공지 → VARIABLE", () => {
      const result = parsePriceBand("추후 공지");
      expect(result.band).toBe("VARIABLE");
    });
  });

  // 다수 등급 → 최저가 기준
  describe("다수 등급 최저가 기준", () => {
    it("VIP 12만 / R 9.9만 / S 8.8만 → 최저가 88,000 → OVER_70K", () => {
      const result = parsePriceBand("VIP 12만원 / R 9만9천원 / S 8만8천원");
      expect(result.band).toBe("OVER_70K");
      expect(result.lowestPrice).toBe(88000);
    });

    it("R석 50,000원, S석 30,000원 → 최저가 30,000 → UNDER_30K", () => {
      const result = parsePriceBand("R석 50,000원, S석 30,000원");
      expect(result.band).toBe("UNDER_30K");
      expect(result.lowestPrice).toBe(30000);
    });
  });

  // label 검증
  describe("label", () => {
    const cases: [string | undefined, PriceBand, string][] = [
      ["무료", "FREE", "무료/초대"],
      ["전석 2만원", "UNDER_30K", "~3만"],
      ["전석 5만원", "UNDER_70K", "3~7만"],
      ["전석 8만원", "OVER_70K", "7만+"],
      [undefined, "VARIABLE", "가변/미정"],
    ];
    it.each(cases)('"%s" → label "%s"', (input, expectedBand, expectedLabel) => {
      const result = parsePriceBand(input);
      expect(result.band).toBe(expectedBand);
      expect(result.label).toBe(expectedLabel);
    });
  });
});
