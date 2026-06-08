import { describe, it, expect } from "vitest";
import {
  filterToQuery,
  queryToFilter,
  filterHash,
  clampRange,
  isRangeExceeded,
  defaultFilterState,
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

  it("handles invalid params gracefully (fallback to defaults)", () => {
    const params = new URLSearchParams("period=INVALID&sort=RANDOM&genre=nope");
    const result = queryToFilter(params);
    expect(result.period.preset).toBe("DEFAULT_30D"); // fallback
    expect(result.sort).toBe("START_ASC"); // fallback
    expect(result.genres).toEqual([]); // unknown genre dropped
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
