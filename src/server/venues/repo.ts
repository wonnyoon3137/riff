import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Venue } from "@/domain/types";

/**
 * 공연장 마스터(venues) 저장소 — SQLite(better-sqlite3) 기반. (DEC-A, data-model §5.2)
 *
 * - 동기화(D5)가 prfplc 전량을 upsert하고, 자동완성 API가 name_normalized contains로 조회한다.
 * - DB 파일 경로는 VENUE_DB_PATH(미설정 시 ./data/venues.db). 파일은 .gitignore 대상(커밋 금지).
 * - 단일 프로세스/단일 파일 가정(v0.1). 연결은 모듈 싱글톤으로 캐시한다.
 */

let db: Database.Database | null = null;

function defaultDbPath(): string {
  return process.env.VENUE_DB_PATH || "./data/venues.db";
}

/**
 * 검색 정규화: 공백 제거 + 소문자화. (data-model §5.2 name_normalized)
 * 자동완성 매칭(contains)의 양쪽(저장/질의)에 동일하게 적용한다.
 */
export function normalizeVenueName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

function initSchema(database: Database.Database): void {
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS venues (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      name_normalized TEXT NOT NULL,
      area          TEXT,
      sido_name     TEXT,
      gugun_name    TEXT,
      sido_code     TEXT,
      gugun_code    TEXT,
      facility_char TEXT,
      hall_count    INTEGER,
      open_year     TEXT,
      address       TEXT,
      lat           REAL,
      lng           REAL,
      synced_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_venues_name_normalized
      ON venues (name_normalized);
  `);
}

/**
 * 저장소 연결을 반환(필요 시 생성 + 스키마 초기화). 모듈 싱글톤.
 * @param dbPath 테스트용 경로 주입(예: ":memory:"). 기본은 VENUE_DB_PATH.
 */
export function getVenueDb(dbPath?: string): Database.Database {
  if (db && !dbPath) return db;

  const path = dbPath ?? defaultDbPath();
  if (path !== ":memory:") {
    const abs = resolve(path);
    mkdirSync(dirname(abs), { recursive: true });
  }
  const database = new Database(path === ":memory:" ? path : resolve(path));
  initSchema(database);

  // 명시 경로(테스트)는 캐시하지 않고 호출자가 관리. 기본 경로만 싱글톤 캐시.
  if (!dbPath) db = database;
  return database;
}

interface VenueRow {
  id: string;
  name: string;
  name_normalized: string;
  area: string | null;
  sido_name: string | null;
  gugun_name: string | null;
  sido_code: string | null;
  gugun_code: string | null;
  facility_char: string | null;
  hall_count: number | null;
  open_year: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  synced_at: string;
}

function rowToVenue(r: VenueRow): Venue {
  return {
    id: r.id,
    name: r.name,
    sidoName: r.sido_name ?? undefined,
    gugunName: r.gugun_name ?? undefined,
    sidoCode: r.sido_code ?? undefined,
    gugunCode: r.gugun_code ?? undefined,
    facilityChar: r.facility_char ?? undefined,
    hallCount: r.hall_count ?? undefined,
    openYear: r.open_year ?? undefined,
    address: r.address ?? undefined,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    syncedAt: r.synced_at,
  };
}

/**
 * 공연장 목록을 upsert(mt10id 기준). 전량 동기화에서 호출.
 * 단일 트랜잭션으로 일괄 처리하며, upsert 건수를 반환한다.
 */
export function upsertVenues(
  venues: Venue[],
  database: Database.Database = getVenueDb(),
): number {
  if (venues.length === 0) return 0;

  const stmt = database.prepare(`
    INSERT INTO venues (
      id, name, name_normalized, area, sido_name, gugun_name,
      sido_code, gugun_code, facility_char, hall_count, open_year,
      address, lat, lng, synced_at
    ) VALUES (
      @id, @name, @name_normalized, @area, @sido_name, @gugun_name,
      @sido_code, @gugun_code, @facility_char, @hall_count, @open_year,
      @address, @lat, @lng, @synced_at
    )
    ON CONFLICT(id) DO UPDATE SET
      name            = excluded.name,
      name_normalized = excluded.name_normalized,
      area            = excluded.area,
      sido_name       = excluded.sido_name,
      gugun_name      = excluded.gugun_name,
      sido_code       = excluded.sido_code,
      gugun_code      = excluded.gugun_code,
      facility_char   = excluded.facility_char,
      hall_count      = excluded.hall_count,
      open_year       = excluded.open_year,
      address         = excluded.address,
      lat             = excluded.lat,
      lng             = excluded.lng,
      synced_at       = excluded.synced_at
  `);

  const run = database.transaction((items: Venue[]) => {
    let n = 0;
    for (const v of items) {
      if (!v.id || !v.name) continue; // PK/이름 없는 항목은 스킵(데이터 품질)
      stmt.run({
        id: v.id,
        name: v.name,
        name_normalized: normalizeVenueName(v.name),
        area: null,
        sido_name: v.sidoName ?? null,
        gugun_name: v.gugunName ?? null,
        sido_code: v.sidoCode ?? null,
        gugun_code: v.gugunCode ?? null,
        facility_char: v.facilityChar ?? null,
        hall_count: v.hallCount ?? null,
        open_year: v.openYear ?? null,
        address: v.address ?? null,
        lat: v.lat ?? null,
        lng: v.lng ?? null,
        synced_at: v.syncedAt,
      });
      n++;
    }
    return n;
  });

  return run(venues);
}

/**
 * 이름 contains 검색(자동완성). name_normalized LIKE %q% 상위 limit개.
 * 호출자(BFF)가 q<2 가드를 책임지지만, 안전을 위해 빈 질의는 빈 배열을 반환.
 */
export function searchByName(
  q: string,
  limit = 20,
  database: Database.Database = getVenueDb(),
): Venue[] {
  const norm = normalizeVenueName(q);
  if (!norm) return [];

  // LIKE 와일드카드(% _) 및 이스케이프 문자를 리터럴로 처리.
  const escaped = norm.replace(/[\\%_]/g, (c) => `\\${c}`);
  const rows = database
    .prepare(
      `SELECT * FROM venues
       WHERE name_normalized LIKE @pattern ESCAPE '\\'
       ORDER BY length(name) ASC, name ASC
       LIMIT @limit`,
    )
    .all({ pattern: `%${escaped}%`, limit }) as VenueRow[];

  return rows.map(rowToVenue);
}

/** 전체 행 수(동기화 검증/로그용). */
export function countVenues(database: Database.Database = getVenueDb()): number {
  const row = database.prepare("SELECT count(*) AS c FROM venues").get() as {
    c: number;
  };
  return row.c;
}

/** 테스트/배치 경계용: 싱글톤 연결을 닫고 해제. */
export function closeVenueDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
