import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
  getArtistDb,
  upsertArtist,
  findArtistByName,
  findArtistByMbid,
  countArtists,
  upsertPerformanceArtist,
  getArtistsByPerformance,
  getPerformancesByArtist,
} from "@/server/artists/repo";
import type { PerformanceArtist } from "@/domain/types";

describe("artists repo (in-memory)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getArtistDb(":memory:");
  });

  // ── upsert 멱등성 ──────────────────────────────────────

  it("upsert 후 name으로 조회된다", () => {
    const artist = upsertArtist(
      { name: "아이유", isManuallyVerified: false },
      db,
    );
    expect(artist.id).toBeDefined();
    expect(artist.name).toBe("아이유");
    expect(artist.isManuallyVerified).toBe(false);
    expect(countArtists(db)).toBe(1);
  });

  it("같은 이름으로 두 번 upsert하면 1건만 존재(멱등)", () => {
    const first = upsertArtist(
      { name: "BTS", aliases: ["방탄소년단"], isManuallyVerified: false },
      db,
    );
    const second = upsertArtist(
      {
        name: "BTS",
        aliases: ["방탄소년단", "防弾少年団"],
        mbid: "some-mbid",
        matchConfidence: 0.95,
        isManuallyVerified: true,
      },
      db,
    );

    expect(countArtists(db)).toBe(1);
    // id는 동일(같은 행)
    expect(first.id).toBe(second.id);
    // 갱신된 필드 반영
    expect(second.aliases).toEqual(["방탄소년단", "防弾少年団"]);
    expect(second.mbid).toBe("some-mbid");
    expect(second.matchConfidence).toBe(0.95);
    expect(second.isManuallyVerified).toBe(true);
  });

  it("다른 이름은 별개 행으로 삽입", () => {
    upsertArtist({ name: "아이유", isManuallyVerified: false }, db);
    upsertArtist({ name: "BTS", isManuallyVerified: false }, db);
    expect(countArtists(db)).toBe(2);
  });

  // ── 조회 함수 ──────────────────────────────────────────

  it("findArtistByName: 존재하지 않으면 undefined", () => {
    expect(findArtistByName("없는이름", db)).toBeUndefined();
  });

  it("findArtistByMbid: mbid로 조회", () => {
    upsertArtist(
      { name: "아이유", mbid: "mb-123", isManuallyVerified: false },
      db,
    );
    const found = findArtistByMbid("mb-123", db);
    expect(found).toBeDefined();
    expect(found!.name).toBe("아이유");
  });

  it("findArtistByMbid: 존재하지 않으면 undefined", () => {
    expect(findArtistByMbid("no-such-mbid", db)).toBeUndefined();
  });

  it("aliases가 없으면 undefined로 반환", () => {
    const artist = upsertArtist(
      { name: "솔로", isManuallyVerified: false },
      db,
    );
    expect(artist.aliases).toBeUndefined();
  });

  // ── PerformanceArtist 관계 테이블 ─────────────────────

  it("upsertPerformanceArtist + getArtistsByPerformance", () => {
    const artist = upsertArtist(
      { name: "아이유", isManuallyVerified: false },
      db,
    );
    const pa: PerformanceArtist = {
      mt20id: "PF12345",
      artistId: artist.id,
      rawExtract: "아이유",
      role: "주연",
      extractedAt: "2026-06-12T00:00:00.000Z",
    };
    upsertPerformanceArtist(pa, db);

    const results = getArtistsByPerformance("PF12345", db);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("아이유");
    expect(results[0].rawExtract).toBe("아이유");
    expect(results[0].role).toBe("주연");
  });

  it("getPerformancesByArtist: 아티스트의 공연 목록", () => {
    const artist = upsertArtist(
      { name: "박보검", isManuallyVerified: false },
      db,
    );
    upsertPerformanceArtist(
      {
        mt20id: "PF001",
        artistId: artist.id,
        rawExtract: "박보검",
        extractedAt: "2026-06-10T00:00:00.000Z",
      },
      db,
    );
    upsertPerformanceArtist(
      {
        mt20id: "PF002",
        artistId: artist.id,
        rawExtract: "박보검",
        role: "햄릿",
        extractedAt: "2026-06-11T00:00:00.000Z",
      },
      db,
    );

    const perfs = getPerformancesByArtist(artist.id, db);
    expect(perfs).toHaveLength(2);
    // extracted_at DESC 정렬
    expect(perfs[0].mt20id).toBe("PF002");
    expect(perfs[1].mt20id).toBe("PF001");
  });

  it("performance_artists upsert 멱등성(같은 복합키 두 번)", () => {
    const artist = upsertArtist(
      { name: "테스트", isManuallyVerified: false },
      db,
    );
    const base: PerformanceArtist = {
      mt20id: "PF999",
      artistId: artist.id,
      rawExtract: "테스트 원문",
      extractedAt: "2026-06-12T00:00:00.000Z",
    };
    upsertPerformanceArtist(base, db);
    upsertPerformanceArtist(
      { ...base, rawExtract: "수정된 원문", role: "새역할" },
      db,
    );

    const results = getArtistsByPerformance("PF999", db);
    expect(results).toHaveLength(1);
    expect(results[0].rawExtract).toBe("수정된 원문");
    expect(results[0].role).toBe("새역할");
  });

  it("한 공연에 여러 아티스트 관계", () => {
    const a1 = upsertArtist({ name: "가수A", isManuallyVerified: false }, db);
    const a2 = upsertArtist({ name: "가수B", isManuallyVerified: false }, db);

    upsertPerformanceArtist(
      {
        mt20id: "PF100",
        artistId: a1.id,
        rawExtract: "가수A",
        extractedAt: "2026-06-12T00:00:00.000Z",
      },
      db,
    );
    upsertPerformanceArtist(
      {
        mt20id: "PF100",
        artistId: a2.id,
        rawExtract: "가수B",
        extractedAt: "2026-06-12T00:00:00.000Z",
      },
      db,
    );

    const results = getArtistsByPerformance("PF100", db);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.name).sort()).toEqual(["가수A", "가수B"]);
  });

  it("존재하지 않는 공연 조회 시 빈 배열", () => {
    expect(getArtistsByPerformance("NONEXIST", db)).toEqual([]);
  });

  it("존재하지 않는 아티스트 공연 조회 시 빈 배열", () => {
    expect(getPerformancesByArtist("999", db)).toEqual([]);
  });
});
