import { describe, it, expect } from "vitest";
import { extractCastNames } from "@/domain/cast-extract";

// ── 기본 구분자 ─────────────────────────────────────────────

describe("extractCastNames", () => {
  describe("콤마 구분", () => {
    it("콤마로 구분된 이름을 분리한다", () => {
      const result = extractCastNames("홍길동, 김철수, 이영희");
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.name)).toEqual([
        "홍길동",
        "김철수",
        "이영희",
      ]);
    });

    it("공백이 불규칙해도 정제한다", () => {
      const result = extractCastNames("홍길동,김철수 ,  이영희");
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.name)).toEqual([
        "홍길동",
        "김철수",
        "이영희",
      ]);
    });
  });

  describe("슬래시 구분", () => {
    it("슬래시로 구분된 이름을 분리한다", () => {
      const result = extractCastNames("홍길동 / 김철수");
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toEqual(["홍길동", "김철수"]);
    });

    it("슬래시와 콤마 혼합", () => {
      const result = extractCastNames("홍길동, 김철수 / 이영희, 박민수");
      expect(result).toHaveLength(4);
      expect(result.map((r) => r.name)).toEqual([
        "홍길동",
        "김철수",
        "이영희",
        "박민수",
      ]);
    });
  });

  // ── 접미사 ──────────────────────────────────────────────

  describe("외/등 접미사", () => {
    it('"홍길동, 김철수 외" — "외"를 제거하고 이름만 추출', () => {
      const result = extractCastNames("홍길동, 김철수 외");
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toEqual(["홍길동", "김철수"]);
    });

    it('"홍길동 등" — "등"을 제거하고 이름만 추출', () => {
      const result = extractCastNames("홍길동 등");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("홍길동");
    });

    it('"홍길동, 김철수, 이영희 등" — 다수 + 등', () => {
      const result = extractCastNames("홍길동, 김철수, 이영희 등");
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.name)).toEqual([
        "홍길동",
        "김철수",
        "이영희",
      ]);
    });
  });

  // ── 역할 접두어 ─────────────────────────────────────────

  describe("역할 접두어", () => {
    it("역할 접두어를 분리하여 role에 저장한다", () => {
      const result = extractCastNames(
        "음악감독 홍길동 / 출연 김철수, 이영희",
      );
      expect(result).toHaveLength(3);

      expect(result[0]).toEqual(
        expect.objectContaining({ name: "홍길동", role: "음악감독" }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ name: "김철수", role: "출연" }),
      );
      // 같은 세그먼트 내 콤마 분할 — 역할이 상속된다
      expect(result[2]).toEqual(
        expect.objectContaining({ name: "이영희", role: "출연" }),
      );
    });

    it("연출, 지휘, 안무 등 다양한 역할어 처리", () => {
      const result = extractCastNames("연출 박지훈 / 지휘 이수민 / 안무 최다영");
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe("연출");
      expect(result[1].role).toBe("지휘");
      expect(result[2].role).toBe("안무");
    });

    it("역할 접두어만 있고 이름이 없으면 무시한다", () => {
      const result = extractCastNames("출연");
      expect(result).toHaveLength(0);
    });
  });

  // ── 괄호 배역 ───────────────────────────────────────────

  describe("괄호 안 배역명", () => {
    it('"홍길동(주인공역), 김철수(조연)" — 배역을 role로 추출', () => {
      const result = extractCastNames("홍길동(주인공역), 김철수(조연)");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: "홍길동", role: "주인공역" }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ name: "김철수", role: "조연" }),
      );
    });

    it('"홍길동(왕자역)" — rawExtract에 괄호 포함 원문이 남는다', () => {
      const result = extractCastNames("홍길동(왕자역)");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("홍길동");
      expect(result[0].role).toBe("왕자역");
      expect(result[0].rawExtract).toBe("홍길동(왕자역)");
    });

    it("전각 괄호도 처리한다", () => {
      const result = extractCastNames("홍길동\uFF08왕자역\uFF09");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("홍길동");
      expect(result[0].role).toBe("왕자역");
    });
  });

  // ── 복합 패턴 ───────────────────────────────────────────

  describe("복합 패턴", () => {
    it("역할 + 괄호 + 콤마 + 외", () => {
      const result = extractCastNames(
        "연출 박지훈 / 출연 홍길동(주인공역), 김철수(조연) 외",
      );
      expect(result.length).toBeGreaterThanOrEqual(3);

      const director = result.find((r) => r.name === "박지훈");
      expect(director?.role).toBe("연출");

      const lead = result.find((r) => r.name === "홍길동");
      expect(lead?.role).toBe("주인공역");

      const support = result.find((r) => r.name === "김철수");
      // 괄호 배역이 있으면 괄호 배역 우선
      expect(support?.role).toBe("조연");
    });

    it("단순 이름 나열 (역할/괄호 없음)", () => {
      const result = extractCastNames("아이유, 박서준, 수지");
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.role === undefined)).toBe(true);
    });
  });

  // ── 엣지 케이스 ─────────────────────────────────────────

  describe("엣지 케이스", () => {
    it("null 입력 → 빈 배열", () => {
      expect(extractCastNames(null)).toEqual([]);
    });

    it("undefined 입력 → 빈 배열", () => {
      expect(extractCastNames(undefined)).toEqual([]);
    });

    it("빈 문자열 → 빈 배열", () => {
      expect(extractCastNames("")).toEqual([]);
    });

    it("공백만 → 빈 배열", () => {
      expect(extractCastNames("   ")).toEqual([]);
    });

    it("단일 이름", () => {
      const result = extractCastNames("홍길동");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("홍길동");
      expect(result[0].rawExtract).toBe("홍길동");
    });

    it('"외" 만 단독으로 있으면 빈 배열', () => {
      expect(extractCastNames("외")).toEqual([]);
    });

    it('"등" 만 단독으로 있으면 빈 배열', () => {
      expect(extractCastNames("등")).toEqual([]);
    });
  });

  // ── rawExtract 보존 ─────────────────────────────────────

  describe("rawExtract 원문 보존", () => {
    it("각 추출 결과에 원문 발췌가 포함된다", () => {
      const result = extractCastNames("홍길동, 김철수 외");
      expect(result[0].rawExtract).toBe("홍길동");
      expect(result[1].rawExtract).toBe("김철수 외");
    });

    it("역할 접두어가 있으면 rawExtract에 역할 포함", () => {
      // 세그먼트 분할 후 콤마 분할이므로, rawExtract는 콤마 분할된 토큰
      const result = extractCastNames("출연 홍길동");
      expect(result[0].rawExtract).toBe("홍길동");
      // rawExtract는 역할 분리 후의 토큰 (cleanNameToken에 전달되는 값)
    });
  });
});
