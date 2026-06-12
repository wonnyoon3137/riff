import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
  getVenueDb,
  upsertVenues,
  searchByName,
  countVenues,
  normalizeVenueName,
} from "@/server/venues/repo";
import type { Venue } from "@/domain/types";

function makeVenue(over: Partial<Venue> & { id: string; name: string }): Venue {
  return {
    syncedAt: "2026-06-12T00:00:00.000Z",
    ...over,
  };
}

describe("normalizeVenueName", () => {
  it("공백 제거 + 소문자화", () => {
    expect(normalizeVenueName("예술의 전당")).toBe("예술의전당");
    expect(normalizeVenueName("  LG  Arts  Center ")).toBe("lgartscenter");
  });
});

describe("venues repo (in-memory)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getVenueDb(":memory:");
  });

  it("upsert 후 검색으로 조회된다", () => {
    const n = upsertVenues(
      [
        makeVenue({ id: "FC001", name: "예술의전당", sidoName: "서울", sidoCode: "11" }),
        makeVenue({ id: "FC002", name: "세종문화회관", sidoName: "서울", sidoCode: "11" }),
      ],
      db,
    );
    expect(n).toBe(2);
    expect(countVenues(db)).toBe(2);

    const r = searchByName("예술", 20, db);
    expect(r.map((v) => v.id)).toEqual(["FC001"]);
    expect(r[0].sidoCode).toBe("11");
  });

  it("contains 매칭(부분 문자열)과 공백 무시", () => {
    upsertVenues(
      [makeVenue({ id: "FC010", name: "LG 아트센터" })],
      db,
    );
    expect(searchByName("아트센터", 20, db).map((v) => v.id)).toEqual(["FC010"]);
    expect(searchByName("lg아트", 20, db).map((v) => v.id)).toEqual(["FC010"]);
  });

  it("동일 id upsert는 갱신(중복 행 없음)", () => {
    upsertVenues([makeVenue({ id: "FC001", name: "이전이름" })], db);
    upsertVenues(
      [makeVenue({ id: "FC001", name: "새이름", hallCount: 3 })],
      db,
    );
    expect(countVenues(db)).toBe(1);
    const r = searchByName("새이름", 20, db);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("새이름");
    expect(r[0].hallCount).toBe(3);
  });

  it("limit 상한과 짧은 이름 우선 정렬", () => {
    upsertVenues(
      Array.from({ length: 30 }, (_, i) =>
        makeVenue({ id: `FC${i}`, name: `극장${"가".repeat(i + 1)}` }),
      ),
      db,
    );
    const r = searchByName("극장", 20, db);
    expect(r).toHaveLength(20);
    // 가장 짧은 이름이 먼저
    expect(r[0].name).toBe("극장가");
  });

  it("LIKE 와일드카드(%)를 리터럴로 이스케이프", () => {
    upsertVenues(
      [
        makeVenue({ id: "FC100", name: "100% 극장" }),
        makeVenue({ id: "FC200", name: "다른극장" }),
      ],
      db,
    );
    // "%"는 와일드카드가 아니라 리터럴로 매칭되어야 한다.
    const r = searchByName("100%", 20, db);
    expect(r.map((v) => v.id)).toEqual(["FC100"]);
  });

  it("빈 질의는 빈 배열", () => {
    upsertVenues([makeVenue({ id: "FC001", name: "극장" })], db);
    expect(searchByName("   ", 20, db)).toEqual([]);
  });

  it("id/name 누락 항목은 스킵", () => {
    const n = upsertVenues(
      [
        makeVenue({ id: "", name: "이름만" }),
        makeVenue({ id: "FC001", name: "" }),
        makeVenue({ id: "FC002", name: "정상" }),
      ],
      db,
    );
    expect(n).toBe(1);
    expect(countVenues(db)).toBe(1);
  });
});
