import { describe, it, expect } from "vitest";
import {
  filterToQuery,
  queryToFilter,
  filterHash,
  clampRange,
  isRangeExceeded,
  defaultFilterState,
  normalizeSearchTerm,
  isDefaultFilter,
  countActiveFilters,
} from "@/domain/filter-url";
import type { FilterState } from "@/domain/types";

describe("clampRange (D3: 31일 제한)", () => {
  it("clamps range exceeding 31 days", () => {
    const result = clampRange({ from: "2026-07-01", to: "2026-08-15" });
    expect(result.to).toBe("2026-07-31"); // 7/1 + 30 = 7/31 (31일)
  });

  it("preserves range within 31 days", () => {
    const result = clampRange({ from: "2026-07-01", to: "2026-07-31" });
    expect(result).toEqual({ from: "2026-07-01", to: "2026-07-31" });
  });

  it("preserves exact 31 day range", () => {
    const result = clampRange({ from: "2026-07-01", to: "2026-07-31" });
    expect(result.to).toBe("2026-07-31");
  });
});

describe("isRangeExceeded", () => {
  it("returns true for 32+ days", () => {
    expect(isRangeExceeded({ from: "2026-07-01", to: "2026-08-01" })).toBe(true);
  });
  it("returns false for 31 days", () => {
    expect(isRangeExceeded({ from: "2026-07-01", to: "2026-07-31" })).toBe(false);
  });
});

describe("filterToQuery / queryToFilter round-trip", () => {
  it("round-trips default filter to empty params", () => {
    const def = defaultFilterState();
    const params = filterToQuery(def);
    // 디폴트는 모두 생략
    expect(params.toString()).toBe("");
  });

  it("round-trips custom filter", () => {
    const filter: FilterState = {
      period: {
        preset: "CUSTOM",
        range: { from: "2026-07-01", to: "2026-07-31" },
      },
      regions: [
        { sidoCode: "11", label: "서울" },
        { sidoCode: "41", gugunCode: "4111", label: "경기 수원" },
      ],
      isNationwide: false,
      genres: ["MUSICAL", "THEATER"],
      sort: "START_DESC",
    };
    const params = filterToQuery(filter);
    expect(params.get("period")).toBe("custom");
    expect(params.get("from")).toBe("2026-07-01");
    expect(params.get("to")).toBe("2026-07-31");
    expect(params.get("region")).toBe("11,41:4111");
    expect(params.get("genre")).toBe("musical,theater");
    expect(params.get("sort")).toBe("start_desc");

    // 역직렬화
    const restored = queryToFilter(params);
    expect(restored.period.preset).toBe("CUSTOM");
    expect(restored.period.range).toEqual({ from: "2026-07-01", to: "2026-07-31" });
    expect(restored.regions).toHaveLength(2);
    expect(restored.regions[0].sidoCode).toBe("11");
    expect(restored.regions[1].gugunCode).toBe("4111");
    expect(restored.isNationwide).toBe(false);
    expect(restored.genres).toEqual(["MUSICAL", "THEATER"]);
    expect(restored.sort).toBe("START_DESC");
  });

  it("restores sido label from code on deserialize (#24)", () => {
    const restored = queryToFilter(new URLSearchParams("region=11,41"));
    expect(restored.isNationwide).toBe(false);
    expect(restored.regions).toHaveLength(2);
    expect(restored.regions[0]).toMatchObject({
      sidoCode: "11",
      label: "서울특별시",
    });
    expect(restored.regions[1]).toMatchObject({
      sidoCode: "41",
      label: "경기도",
    });
  });

  it("restores sido label for code with gugun segment (#24)", () => {
    const restored = queryToFilter(new URLSearchParams("region=11:1111"));
    expect(restored.regions[0]).toMatchObject({
      sidoCode: "11",
      gugunCode: "1111",
      label: "서울특별시",
    });
  });

  it("falls back to code string for unknown sido code (#24)", () => {
    const restored = queryToFilter(new URLSearchParams("region=99"));
    expect(restored.regions[0]).toMatchObject({
      sidoCode: "99",
      label: "99",
    });
  });

  it("handles invalid params gracefully (fallback to defaults)", () => {
    const params = new URLSearchParams("period=INVALID&sort=RANDOM&genre=nope");
    const result = queryToFilter(params);
    expect(result.period.preset).toBe("DEFAULT_30D"); // fallback
    expect(result.sort).toBe("START_ASC"); // fallback
    expect(result.genres).toEqual([]); // unknown genre dropped
  });
});

describe("활성 필터 판정 (F2.5 / #25 sort 포함)", () => {
  it("default filter is treated as default", () => {
    expect(isDefaultFilter(defaultFilterState())).toBe(true);
    expect(countActiveFilters(defaultFilterState())).toBe(0);
  });

  it("sort-only change is NOT default (#25)", () => {
    const f: FilterState = { ...defaultFilterState(), sort: "START_DESC" };
    expect(isDefaultFilter(f)).toBe(false);
    expect(countActiveFilters(f)).toBe(1);
  });

  it("counts each active axis incl. sort", () => {
    const f: FilterState = {
      ...defaultFilterState(),
      genres: ["MUSICAL"],
      sort: "START_DESC",
    };
    expect(isDefaultFilter(f)).toBe(false);
    expect(countActiveFilters(f)).toBe(2);
  });

  it("region/genre/venue/search/period all count as active", () => {
    const f: FilterState = {
      period: { preset: "CUSTOM", range: { from: "2026-07-01", to: "2026-07-10" } },
      regions: [{ sidoCode: "11", label: "서울특별시" }],
      isNationwide: false,
      genres: ["THEATER"],
      venueId: "FC001",
      sort: "START_ASC",
      searchTerm: "오페라",
    };
    expect(isDefaultFilter(f)).toBe(false);
    expect(countActiveFilters(f)).toBe(5);
  });

  it("guarded (<2) searchTerm does not count as active", () => {
    const f: FilterState = { ...defaultFilterState(), searchTerm: "가" };
    expect(isDefaultFilter(f)).toBe(true);
    expect(countActiveFilters(f)).toBe(0);
  });
});

describe("filterHash", () => {
  it("produces stable hash for same filter", () => {
    const f = defaultFilterState();
    expect(filterHash(f)).toBe(filterHash(f));
  });

  it("produces different hash for different filters", () => {
    const a = defaultFilterState();
    const b = { ...defaultFilterState(), sort: "START_DESC" as const };
    expect(filterHash(a)).not.toBe(filterHash(b));
  });
});

describe("normalizeSearchTerm (F5.4 가드 / 공백 정규화)", () => {
  it("trims surrounding whitespace, preserves inner spaces", () => {
    expect(normalizeSearchTerm("  레 미제라블  ")).toBe("레 미제라블");
  });

  it("returns undefined for < 2 chars after trim", () => {
    expect(normalizeSearchTerm("ا")).toBeUndefined();
    expect(normalizeSearchTerm("가")).toBeUndefined();
    expect(normalizeSearchTerm(" a ")).toBeUndefined();
  });

  it("returns undefined for empty / whitespace-only / nullish", () => {
    expect(normalizeSearchTerm("")).toBeUndefined();
    expect(normalizeSearchTerm("   ")).toBeUndefined();
    expect(normalizeSearchTerm(undefined)).toBeUndefined();
    expect(normalizeSearchTerm(null)).toBeUndefined();
  });

  it("accepts exactly 2 chars", () => {
    expect(normalizeSearchTerm("가나")).toBe("가나");
  });
});

describe("검색어 URL 동기화 (F5.3 ?q=)", () => {
  it("serializes searchTerm to ?q= (>=2 chars)", () => {
    const f: FilterState = { ...defaultFilterState(), searchTerm: "오페라" };
    const params = filterToQuery(f);
    expect(params.get("q")).toBe("오페라");
  });

  it("omits ?q= when search < 2 chars (guard, F5.4)", () => {
    const f: FilterState = { ...defaultFilterState(), searchTerm: "가" };
    expect(filterToQuery(f).get("q")).toBeNull();
  });

  it("omits ?q= when search is whitespace-only", () => {
    const f: FilterState = { ...defaultFilterState(), searchTerm: "  " };
    expect(filterToQuery(f).get("q")).toBeNull();
  });

  it("round-trips searchTerm through serialize -> deserialize", () => {
    const f: FilterState = {
      ...defaultFilterState(),
      searchTerm: "레 미제라블",
    };
    const restored = queryToFilter(filterToQuery(f));
    expect(restored.searchTerm).toBe("레 미제라블");
  });

  it("deserializes ?q= with surrounding whitespace (trimmed)", () => {
    const restored = queryToFilter(new URLSearchParams("q=  뮤지컬  "));
    expect(restored.searchTerm).toBe("뮤지컬");
  });

  it("drops ?q= shorter than 2 chars on deserialize", () => {
    expect(queryToFilter(new URLSearchParams("q=가")).searchTerm).toBeUndefined();
  });
});

describe("filterHash 검색어 분리 (F5.5)", () => {
  it("produces different hash for different search terms", () => {
    const a: FilterState = { ...defaultFilterState(), searchTerm: "오페라" };
    const b: FilterState = { ...defaultFilterState(), searchTerm: "뮤지컬" };
    expect(filterHash(a)).not.toBe(filterHash(b));
  });

  it("search vs no-search produce different hashes", () => {
    const withSearch: FilterState = {
      ...defaultFilterState(),
      searchTerm: "오페라",
    };
    expect(filterHash(withSearch)).not.toBe(filterHash(defaultFilterState()));
  });

  it("guarded (<2) search shares cache entry with no-search", () => {
    const guarded: FilterState = { ...defaultFilterState(), searchTerm: "가" };
    expect(filterHash(guarded)).toBe(filterHash(defaultFilterState()));
  });
});
