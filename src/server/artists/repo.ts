import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Artist, PerformanceArtist } from "@/domain/types";

/**
 * 아티스트 마스터(artists) + 공연-아티스트 관계(performance_artists) 저장소
 * — SQLite(better-sqlite3) 기반. (data-model §3.5 / §5.5)
 *
 * Venue repo 패턴을 재사용한다:
 * - DB 파일 경로: ARTIST_DB_PATH(미설정 시 ./data/artists.db)
 * - 단일 프로세스/단일 파일, 모듈 싱글톤 캐시
 * - 테스트는 ":memory:" 경로 주입
 */

let db: Database.Database | null = null;

function defaultDbPath(): string {
  return process.env.ARTIST_DB_PATH || "./data/artists.db";
}

function initSchema(database: Database.Database): void {
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS artists (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      name                  TEXT NOT NULL,
      aliases               TEXT,
      mbid                  TEXT,
      match_confidence      REAL,
      is_manually_verified  INTEGER NOT NULL DEFAULT 0,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_name
      ON artists (name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_mbid
      ON artists (mbid) WHERE mbid IS NOT NULL;

    CREATE TABLE IF NOT EXISTS performance_artists (
      mt20id        TEXT NOT NULL,
      artist_id     INTEGER NOT NULL,
      raw_extract   TEXT NOT NULL,
      role          TEXT,
      extracted_at  TEXT NOT NULL,
      PRIMARY KEY (mt20id, artist_id),
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    );
    CREATE INDEX IF NOT EXISTS idx_pa_artist_id
      ON performance_artists (artist_id);
  `);
}

/**
 * 저장소 연결을 반환(필요 시 생성 + 스키마 초기화). 모듈 싱글톤.
 * @param dbPath 테스트용 경로 주입(예: ":memory:"). 기본은 ARTIST_DB_PATH.
 */
export function getArtistDb(dbPath?: string): Database.Database {
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

// ── Row ↔ Domain 변환 ──────────────────────────────────────

interface ArtistRow {
  id: number;
  name: string;
  aliases: string | null;
  mbid: string | null;
  match_confidence: number | null;
  is_manually_verified: number; // SQLite boolean → 0/1
  created_at: string;
  updated_at: string;
}

interface PerformanceArtistRow {
  mt20id: string;
  artist_id: number;
  raw_extract: string;
  role: string | null;
  extracted_at: string;
}

function rowToArtist(r: ArtistRow): Artist {
  return {
    id: String(r.id),
    name: r.name,
    aliases: r.aliases ? (JSON.parse(r.aliases) as string[]) : undefined,
    mbid: r.mbid ?? undefined,
    matchConfidence: r.match_confidence ?? undefined,
    isManuallyVerified: r.is_manually_verified === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToPerformanceArtist(r: PerformanceArtistRow): PerformanceArtist {
  return {
    mt20id: r.mt20id,
    artistId: String(r.artist_id),
    rawExtract: r.raw_extract,
    role: r.role ?? undefined,
    extractedAt: r.extracted_at,
  };
}

// ── Artist CRUD ────────────────────────────────────────────

/**
 * 아티스트를 upsert한다(name 기준 중복 판별, data-model §5.5.3).
 * 동일 name이 이미 존재하면 갱신, 없으면 삽입.
 * 반환: upsert된 Artist(id 포함).
 */
export function upsertArtist(
  artist: Omit<Artist, "id" | "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
  database: Database.Database = getArtistDb(),
): Artist {
  const now = new Date().toISOString();
  const createdAt = artist.createdAt ?? now;
  const updatedAt = artist.updatedAt ?? now;
  const aliasesJson =
    artist.aliases && artist.aliases.length > 0
      ? JSON.stringify(artist.aliases)
      : null;

  const stmt = database.prepare(`
    INSERT INTO artists (name, aliases, mbid, match_confidence, is_manually_verified, created_at, updated_at)
    VALUES (@name, @aliases, @mbid, @match_confidence, @is_manually_verified, @created_at, @updated_at)
    ON CONFLICT(name) DO UPDATE SET
      aliases               = excluded.aliases,
      mbid                  = excluded.mbid,
      match_confidence      = excluded.match_confidence,
      is_manually_verified  = excluded.is_manually_verified,
      updated_at            = excluded.updated_at
  `);

  stmt.run({
    name: artist.name,
    aliases: aliasesJson,
    mbid: artist.mbid ?? null,
    match_confidence: artist.matchConfidence ?? null,
    is_manually_verified: artist.isManuallyVerified ? 1 : 0,
    created_at: createdAt,
    updated_at: updatedAt,
  });

  // name unique이므로 바로 조회
  return findArtistByName(artist.name, database)!;
}

/** 이름으로 아티스트 조회. */
export function findArtistByName(
  name: string,
  database: Database.Database = getArtistDb(),
): Artist | undefined {
  const row = database
    .prepare("SELECT * FROM artists WHERE name = ?")
    .get(name) as ArtistRow | undefined;
  return row ? rowToArtist(row) : undefined;
}

/** MusicBrainz ID로 아티스트 조회. */
export function findArtistByMbid(
  mbid: string,
  database: Database.Database = getArtistDb(),
): Artist | undefined {
  const row = database
    .prepare("SELECT * FROM artists WHERE mbid = ?")
    .get(mbid) as ArtistRow | undefined;
  return row ? rowToArtist(row) : undefined;
}

/** 전체 아티스트 수(동기화 검증/로그용). */
export function countArtists(
  database: Database.Database = getArtistDb(),
): number {
  const row = database
    .prepare("SELECT count(*) AS c FROM artists")
    .get() as { c: number };
  return row.c;
}

// ── PerformanceArtist CRUD ─────────────────────────────────

/**
 * 공연-아티스트 관계를 upsert한다(mt20id + artist_id 기준).
 */
export function upsertPerformanceArtist(
  pa: PerformanceArtist,
  database: Database.Database = getArtistDb(),
): void {
  const stmt = database.prepare(`
    INSERT INTO performance_artists (mt20id, artist_id, raw_extract, role, extracted_at)
    VALUES (@mt20id, @artist_id, @raw_extract, @role, @extracted_at)
    ON CONFLICT(mt20id, artist_id) DO UPDATE SET
      raw_extract  = excluded.raw_extract,
      role         = excluded.role,
      extracted_at = excluded.extracted_at
  `);

  stmt.run({
    mt20id: pa.mt20id,
    artist_id: Number(pa.artistId),
    raw_extract: pa.rawExtract,
    role: pa.role ?? null,
    extracted_at: pa.extractedAt,
  });
}

/**
 * 공연의 출연 아티스트 목록을 조회한다.
 * artists JOIN performance_artists로 Artist 정보를 함께 반환.
 */
export function getArtistsByPerformance(
  mt20id: string,
  database: Database.Database = getArtistDb(),
): (Artist & { rawExtract: string; role?: string })[] {
  const rows = database
    .prepare(
      `SELECT a.*, pa.raw_extract, pa.role
       FROM performance_artists pa
       JOIN artists a ON a.id = pa.artist_id
       WHERE pa.mt20id = ?
       ORDER BY a.name ASC`,
    )
    .all(mt20id) as (ArtistRow & { raw_extract: string; role: string | null })[];

  return rows.map((r) => ({
    ...rowToArtist(r),
    rawExtract: r.raw_extract,
    role: r.role ?? undefined,
  }));
}

/**
 * 아티스트의 공연 목록(mt20id)을 조회한다.
 */
export function getPerformancesByArtist(
  artistId: string,
  database: Database.Database = getArtistDb(),
): PerformanceArtist[] {
  const rows = database
    .prepare(
      `SELECT * FROM performance_artists
       WHERE artist_id = ?
       ORDER BY extracted_at DESC`,
    )
    .all(Number(artistId)) as PerformanceArtistRow[];

  return rows.map(rowToPerformanceArtist);
}

/** 테스트/배치 경계용: 싱글톤 연결을 닫고 해제. */
export function closeArtistDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
