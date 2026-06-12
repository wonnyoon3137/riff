import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
  getArtistDb,
  upsertArtist,
  searchArtists,
} from "@/server/artists/repo";

describe("searchArtists (in-memory)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getArtistDb(":memory:");
    // 테스트 데이터 시드
    upsertArtist({ name: "아이유", aliases: ["IU", "이지은"], isManuallyVerified: true }, db);
    upsertArtist({ name: "BTS", aliases: ["방탄소년단", "防弾少年団"], isManuallyVerified: true }, db);
    upsertArtist({ name: "방탄소년단 RM", isManuallyVerified: false }, db);
    upsertArtist({ name: "블랙핑크", aliases: ["BLACKPINK"], isManuallyVerified: true }, db);
    upsertArtist({ name: "뉴진스", aliases: ["NewJeans"], isManuallyVerified: true }, db);
  });

  // ── 2자 미만 가드 ──────────────────────────────────────────

  it("빈 문자열이면 빈 배열 반환", () => {
    expect(searchArtists("", 10, db)).toEqual([]);
  });

  it("1자 쿼리면 빈 배열 반환", () => {
    expect(searchArtists("아", 10, db)).toEqual([]);
  });

  it("공백만 있으면 빈 배열 반환", () => {
    expect(searchArtists("   ", 10, db)).toEqual([]);
  });

  it("공백 포함 1자 실질 쿼리면 빈 배열 반환", () => {
    expect(searchArtists(" 아 ", 10, db)).toEqual([]);
  });

  // ── name 부분 일치 ─────────────────────────────────────────

  it("name 부분 일치로 검색", () => {
    const results = searchArtists("아이", 10, db);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("아이유");
  });

  it("name 완전 일치", () => {
    const results = searchArtists("BTS", 10, db);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("BTS");
  });

  it("여러 건 매칭 (방탄 -> BTS aliases + 방탄소년단 RM name)", () => {
    const results = searchArtists("방탄", 10, db);
    expect(results.length).toBeGreaterThanOrEqual(2);
    const names = results.map((r) => r.name);
    expect(names).toContain("BTS"); // aliases에 "방탄소년단" 포함
    expect(names).toContain("방탄소년단 RM"); // name에 "방탄" 포함
  });

  // ── aliases 검색 ───────────────────────────────────────────

  it("aliases JSON TEXT 내 부분 일치로 검색", () => {
    const results = searchArtists("이지은", 10, db);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("아이유");
    expect(results[0].aliases).toContain("이지은");
  });

  it("aliases 영문 검색", () => {
    const results = searchArtists("BLACKPINK", 10, db);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("블랙핑크");
  });

  it("aliases 부분 일치 (NewJ)", () => {
    const results = searchArtists("NewJ", 10, db);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("뉴진스");
  });

  // ── limit ──────────────────────────────────────────────────

  it("limit 제한이 적용된다", () => {
    // "방탄"으로 2건 이상 매칭되지만 limit=1
    const results = searchArtists("방탄", 1, db);
    expect(results).toHaveLength(1);
  });

  // ── 특수문자 이스케이프 ────────────────────────────────────

  it("LIKE 와일드카드(%)가 리터럴로 처리된다", () => {
    // %가 와일드카드로 해석되면 모든 행이 매칭됨
    const results = searchArtists("%%", 10, db);
    expect(results).toEqual([]);
  });

  it("LIKE 와일드카드(_)가 리터럴로 처리된다", () => {
    const results = searchArtists("__", 10, db);
    expect(results).toEqual([]);
  });

  // ── 결과 없음 ─────────────────────────────────────────────

  it("매칭 없으면 빈 배열 반환", () => {
    expect(searchArtists("존재하지않는아티스트", 10, db)).toEqual([]);
  });
});
