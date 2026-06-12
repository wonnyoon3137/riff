// Artist Pipeline: 추출(cast-extract) -> 매칭(musicbrainz) -> 저장(repo)
// v3 P2 통합 파이프라인. 기존 모듈을 수정하지 않고 조합만 수행한다.

import type { Artist } from "@/domain/types";
import { extractCastNames } from "@/domain/cast-extract";
import { matchCastToArtists } from "@/server/artists/musicbrainz";
import {
  getArtistDb,
  upsertArtist,
  upsertPerformanceArtist,
} from "@/server/artists/repo";

// ── 타입 ──────────────────────────────────────────────────────

export interface PipelineResult {
  processed: number; // 추출된 이름 수
  matched: number; // confidence >= 임계값으로 자동 저장된 수
  failed: number; // 매칭 실패 또는 임계값 미달
  artists: Artist[]; // 저장된 아티스트 목록
}

export interface SyncResult {
  total: number; // 전체 공연 수
  processed: number; // 처리 완료된 공연 수
  totalMatched: number; // 전체 매칭 성공 수
  errors: string[]; // 공연별 에러 메시지
}

// ── 설정 ──────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.7;

// ── 단일 공연 파이프라인 ──────────────────────────────────────

/**
 * 단일 공연의 prfcast를 추출 -> 매칭 -> 저장한다.
 *
 * 흐름:
 * 1. extractCastNames(prfcast) -> CastExtraction[]
 * 2. matchCastToArtists(extractions, fetchFn) -> ArtistMatchResult[]
 * 3. confidence >= 0.7인 매칭은 upsertArtist + upsertPerformanceArtist
 *    confidence < 0.7인 매칭은 isManuallyVerified: false로 저장만 (자동 신뢰 아님)
 *
 * 빈 prfcast나 추출 0건이면 즉시 빈 결과를 반환한다.
 * 에러는 throw하지 않고 결과에 반영한다.
 */
export async function processPerformanceCast(
  mt20id: string,
  prfcast: string | null | undefined,
  options?: {
    dbPath?: string;
    fetchFn?: typeof fetch;
  },
): Promise<PipelineResult> {
  const emptyResult: PipelineResult = {
    processed: 0,
    matched: 0,
    failed: 0,
    artists: [],
  };

  // 빈 입력 즉시 반환
  if (!prfcast || prfcast.trim() === "") {
    return emptyResult;
  }

  // 1. 추출
  const extractions = extractCastNames(prfcast);
  if (extractions.length === 0) {
    return emptyResult;
  }

  // 2. 매칭
  const fetchFn = options?.fetchFn ?? globalThis.fetch;
  const matchResults = await matchCastToArtists(extractions, fetchFn);

  // 3. DB 저장
  const database = getArtistDb(options?.dbPath);
  const now = new Date().toISOString();
  const savedArtists: Artist[] = [];
  let matched = 0;
  let failed = 0;

  for (const result of matchResults) {
    if (!result.match) {
      // 매칭 후보 없음
      failed++;
      continue;
    }

    const isHighConfidence = result.confidence >= CONFIDENCE_THRESHOLD;

    try {
      // 아티스트 upsert
      const artist = upsertArtist(
        {
          name: result.match.name,
          aliases:
            result.match.aliases.length > 0 ? result.match.aliases : undefined,
          mbid: result.match.mbid,
          matchConfidence: result.confidence,
          isManuallyVerified: false,
        },
        database,
      );

      // 공연-아티스트 관계 upsert
      upsertPerformanceArtist(
        {
          mt20id,
          artistId: artist.id,
          rawExtract: result.extraction.rawExtract,
          role: result.extraction.role,
          extractedAt: now,
        },
        database,
      );

      if (isHighConfidence) {
        matched++;
      } else {
        failed++;
      }

      savedArtists.push(artist);
    } catch {
      // DB 에러 — 결과에 반영, throw 하지 않음
      failed++;
    }
  }

  return {
    processed: extractions.length,
    matched,
    failed,
    artists: savedArtists,
  };
}

// ── 배치 처리 ────────────────────────────────────────────────

/**
 * 여러 공연의 출연진을 일괄 처리한다.
 * MusicBrainz rate limit 준수를 위해 순차 처리한다.
 * 개별 공연 에러는 throw하지 않고 errors 배열에 누적한다.
 */
export async function syncPerformancesCast(
  performances: Array<{ mt20id: string; cast?: string }>,
  options?: {
    dbPath?: string;
    fetchFn?: typeof fetch;
  },
): Promise<SyncResult> {
  const result: SyncResult = {
    total: performances.length,
    processed: 0,
    totalMatched: 0,
    errors: [],
  };

  // 순차 처리 — MB rate limit 준수
  for (const perf of performances) {
    try {
      const pipelineResult = await processPerformanceCast(
        perf.mt20id,
        perf.cast,
        options,
      );
      result.processed++;
      result.totalMatched += pipelineResult.matched;
    } catch (err) {
      // 예상치 못한 에러도 누적
      const message =
        err instanceof Error ? err.message : String(err);
      result.errors.push(`[${perf.mt20id}] ${message}`);
    }
  }

  return result;
}
