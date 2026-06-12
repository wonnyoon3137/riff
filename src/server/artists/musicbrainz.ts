// MusicBrainz API 아티스트 매칭 PoC (v3 P2-2)
// cast-extract.ts의 CastExtraction → MusicBrainz 검색 → MBID + 정규화 이름 획득
// PoC 단계: 에러 시 throw 하지 않고 빈 결과 반환.

import type { CastExtraction } from "@/domain/cast-extract";

// ── 타입 ──────────────────────────────────────────────────────

export interface MbArtistMatch {
  mbid: string; // MusicBrainz Artist ID
  name: string; // 정규화된 이름
  aliases: string[]; // 별칭 목록
  score: number; // MusicBrainz 검색 점수 (0~100)
  type?: string; // "Person" | "Group" | "Orchestra" | "Choir" | ...
}

export interface ArtistMatchResult {
  extraction: CastExtraction;
  match?: MbArtistMatch; // 매칭 실패 시 undefined
  confidence: number; // 0~1 (MusicBrainz score / 100)
}

// ── 설정 ──────────────────────────────────────────────────────

const MB_BASE_URL = "https://musicbrainz.org/ws/2";
const USER_AGENT = "Riff/0.3 (contact@riff.app)";
const RATE_LIMIT_MS = 1100; // 1req/s + 100ms 여유
const REQUEST_TIMEOUT_MS = 10_000;

// ── Rate Limiter ──────────────────────────────────────────────

let lastRequestTime = 0;

/**
 * Rate limit 대기. 마지막 요청 이후 최소 RATE_LIMIT_MS 밀리초 경과를 보장.
 * 테스트에서 override 가능하도록 export.
 */
export async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * 테스트용: lastRequestTime 리셋
 */
export function _resetRateLimitState(): void {
  lastRequestTime = 0;
}

// ── MusicBrainz API 응답 파싱 ─────────────────────────────────

interface MbApiArtistResult {
  id: string;
  name: string;
  score: number;
  type?: string;
  aliases?: Array<{ name: string; locale?: string; type?: string }>;
}

interface MbApiSearchResponse {
  artists: MbApiArtistResult[];
}

function parseArtistResults(data: MbApiSearchResponse): MbArtistMatch[] {
  if (!data.artists || !Array.isArray(data.artists)) {
    return [];
  }

  return data.artists.map((artist) => ({
    mbid: artist.id,
    name: artist.name,
    aliases: (artist.aliases ?? []).map((a) => a.name),
    score: artist.score,
    type: artist.type,
  }));
}

// ── 검색 함수 ─────────────────────────────────────────────────

/**
 * MusicBrainz에서 아티스트 이름으로 검색한다.
 * Rate limit(1req/s)을 준수하며, 에러 시 빈 배열을 반환한다.
 *
 * @param name - 검색할 아티스트 이름
 * @param fetchFn - 테스트 주입용 fetch 함수 (기본: globalThis.fetch)
 * @returns 매칭 후보 배열 (score 내림차순, MusicBrainz 기본 정렬)
 */
export async function searchArtist(
  name: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<MbArtistMatch[]> {
  if (!name || name.trim().length === 0) {
    return [];
  }

  try {
    await waitForRateLimit();

    const url = new URL(`${MB_BASE_URL}/artist`);
    url.searchParams.set("query", name.trim());
    url.searchParams.set("fmt", "json");
    url.searchParams.set("limit", "5");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetchFn(url.toString(), {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        // PoC: 에러 시 빈 결과, throw 하지 않음
        return [];
      }

      const data = (await response.json()) as MbApiSearchResponse;
      return parseArtistResults(data);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // 네트워크 에러, 타임아웃 등 — PoC이므로 관대하게 빈 배열
    return [];
  }
}

// ── 일괄 매칭 ─────────────────────────────────────────────────

/**
 * 추출된 출연진 이름들을 MusicBrainz에서 일괄 매칭한다.
 * Rate limit 준수를 위해 순차 호출(병렬 금지).
 *
 * @param extractions - extractCastNames() 결과
 * @param fetchFn - 테스트 주입용 fetch 함수
 * @returns 각 추출에 대한 매칭 결과
 */
export async function matchCastToArtists(
  extractions: CastExtraction[],
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<ArtistMatchResult[]> {
  const results: ArtistMatchResult[] = [];

  // 순차 호출 — rate limit 1req/s 준수
  for (const extraction of extractions) {
    const matches = await searchArtist(extraction.name, fetchFn);

    if (matches.length > 0) {
      const topMatch = matches[0];
      results.push({
        extraction,
        match: topMatch,
        confidence: topMatch.score / 100, // 0~100 → 0~1 정규화
      });
    } else {
      results.push({
        extraction,
        match: undefined,
        confidence: 0,
      });
    }
  }

  return results;
}
