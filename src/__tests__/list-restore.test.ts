import { describe, it, expect } from "vitest";
import {
  serializeRestore,
  parseRestore,
  decideRestoreStep,
  listRestoreKey,
  LIST_RESTORE_KEY_PREFIX,
} from "@/domain/list-restore";
import { defaultFilterState, filterHash } from "@/domain/filter-url";
import type { FilterState } from "@/domain/types";

function baseFilter(): FilterState {
  return defaultFilterState();
}

describe("list-restore: serialize/parse (D8 스냅샷)", () => {
  it("round-trips filter/scrollY/loadedPages/totalCount", () => {
    const filter = baseFilter();
    const raw = serializeRestore({
      filter,
      scrollY: 1234,
      loadedPages: 3,
      totalCount: 90,
      savedAt: 111,
    });
    const parsed = parseRestore(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.scrollY).toBe(1234);
    expect(parsed!.loadedPages).toBe(3);
    expect(parsed!.totalCount).toBe(90);
    expect(parsed!.savedAt).toBe(111);
    expect(filterHash(parsed!.filter)).toBe(filterHash(filter));
  });

  it("기본 savedAt을 채운다", () => {
    const raw = serializeRestore({
      filter: baseFilter(),
      scrollY: 10,
      loadedPages: 1,
    });
    const parsed = parseRestore(raw);
    expect(parsed!.savedAt).toBeGreaterThan(0);
  });

  it("음수/NaN scrollY는 0으로, loadedPages 0/음수는 1로 방어", () => {
    const raw = serializeRestore({
      filter: baseFilter(),
      scrollY: -50,
      loadedPages: 0,
    });
    const parsed = parseRestore(raw);
    expect(parsed!.scrollY).toBe(0);
    expect(parsed!.loadedPages).toBe(1);
  });

  it("loadedPages 소수는 내림", () => {
    const raw = serializeRestore({
      filter: baseFilter(),
      scrollY: 0,
      loadedPages: 2.9,
    });
    expect(parseRestore(raw)!.loadedPages).toBe(2);
  });
});

describe("list-restore: parseRestore 방어", () => {
  it("null/빈 입력은 null", () => {
    expect(parseRestore(null)).toBeNull();
    expect(parseRestore("")).toBeNull();
  });

  it("손상 JSON은 null", () => {
    expect(parseRestore("{not json")).toBeNull();
  });

  it("구버전(scrollY 숫자만) 문자열 호환 — loadedPages는 1로", () => {
    const parsed = parseRestore("742");
    expect(parsed).not.toBeNull();
    expect(parsed!.scrollY).toBe(742);
    expect(parsed!.loadedPages).toBe(1);
  });
});

describe("list-restore: decideRestoreStep (#23 게이트)", () => {
  it("로드 페이지가 부족하고 더 가져올 수 있으면 fetch", () => {
    expect(
      decideRestoreStep({ loadedPages: 2 }, 1, true),
    ).toEqual({ action: "fetch" });
  });

  it("필요한 페이지 수만큼 로드됐으면 scroll", () => {
    expect(
      decideRestoreStep({ loadedPages: 2 }, 2, true),
    ).toEqual({ action: "scroll" });
  });

  it("더 로드됐어도 scroll", () => {
    expect(
      decideRestoreStep({ loadedPages: 2 }, 3, false),
    ).toEqual({ action: "scroll" });
  });

  it("부족하지만 더 가져올 수 없으면(끝 도달) scroll로 마무리", () => {
    expect(
      decideRestoreStep({ loadedPages: 5 }, 2, false),
    ).toEqual({ action: "scroll" });
  });
});

describe("list-restore: key", () => {
  it("필터 해시 기반 키", () => {
    const filter = baseFilter();
    expect(listRestoreKey(filter)).toBe(
      `${LIST_RESTORE_KEY_PREFIX}${filterHash(filter)}`,
    );
  });
});
