import { describe, it, expect } from "vitest";
import { mergePerformances, slicePage } from "@/server/kopis/merge";
import type { PerformanceSummary } from "@/domain/types";

function makeSummary(
  id: string,
  from: string,
  overrides?: Partial<PerformanceSummary>,
): PerformanceSummary {
  return {
    id,
    title: `공연 ${id}`,
    period: { from, to: from },
    venueName: "테스트장",
    genreLabel: "뮤지컬",
    state: "ONGOING",
    ...overrides,
  };
}

describe("mergePerformances", () => {
  it("deduplicates by mt20id", () => {
    const a = [makeSummary("PF001", "2026-07-01"), makeSummary("PF002", "2026-07-05")];
    const b = [makeSummary("PF002", "2026-07-05"), makeSummary("PF003", "2026-07-10")];
    const result = mergePerformances([a, b], "START_ASC");
    expect(result.map((r) => r.id)).toEqual(["PF001", "PF002", "PF003"]);
  });

  it("sorts by START_ASC", () => {
    const a = [makeSummary("PF003", "2026-07-10")];
    const b = [makeSummary("PF001", "2026-07-01"), makeSummary("PF002", "2026-07-05")];
    const result = mergePerformances([a, b], "START_ASC");
    expect(result.map((r) => r.id)).toEqual(["PF001", "PF002", "PF003"]);
  });

  it("sorts by START_DESC", () => {
    const a = [makeSummary("PF001", "2026-07-01")];
    const b = [makeSummary("PF003", "2026-07-10"), makeSummary("PF002", "2026-07-05")];
    const result = mergePerformances([a, b], "START_DESC");
    expect(result.map((r) => r.id)).toEqual(["PF003", "PF002", "PF001"]);
  });

  it("handles empty input", () => {
    expect(mergePerformances([], "START_ASC")).toEqual([]);
    expect(mergePerformances([[]], "START_ASC")).toEqual([]);
  });
});

describe("slicePage", () => {
  const items = [
    makeSummary("PF001", "2026-07-01"),
    makeSummary("PF002", "2026-07-02"),
    makeSummary("PF003", "2026-07-03"),
    makeSummary("PF004", "2026-07-04"),
    makeSummary("PF005", "2026-07-05"),
  ];

  it("returns correct page slice", () => {
    const result = slicePage(items, 1, 2);
    expect(result.items.map((r) => r.id)).toEqual(["PF001", "PF002"]);
    expect(result.hasNext).toBe(true);
  });

  it("returns last page correctly", () => {
    const result = slicePage(items, 3, 2);
    expect(result.items.map((r) => r.id)).toEqual(["PF005"]);
    expect(result.hasNext).toBe(false);
  });

  it("returns empty for out of range page", () => {
    const result = slicePage(items, 10, 2);
    expect(result.items).toEqual([]);
    expect(result.hasNext).toBe(false);
  });
});
