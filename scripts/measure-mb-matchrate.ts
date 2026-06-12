/**
 * MusicBrainz 실 데이터 매칭률 실측 스크립트 (v4 Q-2, #46)
 *
 * 목적: searchArtist의 실 MusicBrainz API 호출 결과로 매칭 품질을 정량 측정한다.
 * - 대중음악 vs 뮤지컬/연극/클래식 장르별 분리 측정
 * - top-1 매칭 성공률, 평균 confidence, 평균 응답시간
 * - 매칭 실패 목록 출력
 *
 * 실행: npx tsx scripts/measure-mb-matchrate.ts
 * 소요: ~25초 (23명 x ~1.1초 rate limit)
 */

import { searchArtist, type MbArtistMatch } from "@/server/artists/musicbrainz";
import * as fs from "node:fs";
import * as path from "node:path";

// ── 타입 ──────────────────────────────────────────────────────

interface TestArtist {
  name: string;
  expectedMbid: string | null;
  genre: "popular" | "musical" | "classic";
}

interface MeasurementResult {
  name: string;
  genre: string;
  expectedMbid: string | null;
  matched: boolean;
  mbidMatch: boolean | null; // null if expectedMbid is null (name-only check)
  topResult: {
    mbid: string;
    name: string;
    score: number;
    type?: string;
  } | null;
  responseTimeMs: number;
}

interface Summary {
  total: number;
  matched: number;
  matchRate: string;
  mbidVerified: number;
  mbidCorrect: number;
  mbidAccuracy: string;
  avgConfidence: string;
  avgResponseTimeMs: string;
}

interface FullReport {
  timestamp: string;
  totalArtists: number;
  overallSummary: Summary;
  byGenre: Record<string, Summary>;
  results: MeasurementResult[];
  failures: Array<{ name: string; genre: string }>;
}

// ── 유틸 ──────────────────────────────────────────────────────

function loadTestArtists(): TestArtist[] {
  const filePath = path.resolve(__dirname, "../data/mb-test-artists.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as TestArtist[];
}

function computeSummary(results: MeasurementResult[]): Summary {
  const total = results.length;
  const matched = results.filter((r) => r.matched).length;
  const withMbid = results.filter((r) => r.expectedMbid !== null);
  const mbidCorrect = withMbid.filter((r) => r.mbidMatch === true).length;
  const matchedResults = results.filter((r) => r.topResult !== null);
  const avgConf =
    matchedResults.length > 0
      ? matchedResults.reduce((s, r) => s + (r.topResult?.score ?? 0), 0) /
        matchedResults.length
      : 0;
  const avgTime =
    total > 0
      ? results.reduce((s, r) => s + r.responseTimeMs, 0) / total
      : 0;

  return {
    total,
    matched,
    matchRate: `${((matched / total) * 100).toFixed(1)}%`,
    mbidVerified: withMbid.length,
    mbidCorrect,
    mbidAccuracy:
      withMbid.length > 0
        ? `${((mbidCorrect / withMbid.length) * 100).toFixed(1)}%`
        : "N/A",
    avgConfidence: avgConf.toFixed(1),
    avgResponseTimeMs: avgTime.toFixed(0),
  };
}

// ── 매칭 판정 ─────────────────────────────────────────────────

/**
 * top-1 결과가 "매칭 성공"인지 판정한다.
 * - score >= 80 이면 매칭 성공으로 본다 (MusicBrainz 검색 relevance).
 * - expectedMbid가 있으면 추가로 MBID 일치 여부도 체크.
 */
function judgeMatch(
  artist: TestArtist,
  topMatch: MbArtistMatch | undefined,
): { matched: boolean; mbidMatch: boolean | null } {
  if (!topMatch || topMatch.score < 80) {
    return { matched: false, mbidMatch: artist.expectedMbid ? false : null };
  }

  const matched = true;
  let mbidMatch: boolean | null = null;

  if (artist.expectedMbid) {
    mbidMatch = topMatch.mbid === artist.expectedMbid;
  }

  return { matched, mbidMatch };
}

// ── 메인 ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const artists = loadTestArtists();
  console.log(`\n=== MusicBrainz Matchrate Measurement ===`);
  console.log(`Test artists: ${artists.length}`);
  console.log(`Rate limit: 1.1s/req => ~${Math.ceil(artists.length * 1.1)}s estimated\n`);

  const results: MeasurementResult[] = [];

  for (const artist of artists) {
    const start = performance.now();
    const matches = await searchArtist(artist.name);
    const elapsed = performance.now() - start;

    const topMatch = matches[0] ?? undefined;
    const { matched, mbidMatch } = judgeMatch(artist, topMatch);

    const result: MeasurementResult = {
      name: artist.name,
      genre: artist.genre,
      expectedMbid: artist.expectedMbid,
      matched,
      mbidMatch,
      topResult: topMatch
        ? {
            mbid: topMatch.mbid,
            name: topMatch.name,
            score: topMatch.score,
            type: topMatch.type,
          }
        : null,
      responseTimeMs: Math.round(elapsed),
    };

    results.push(result);

    // Progress indicator
    const status = matched ? "OK" : "MISS";
    const scoreStr = topMatch ? `score=${topMatch.score}` : "no result";
    const mbidStr =
      mbidMatch === true
        ? " [MBID OK]"
        : mbidMatch === false
          ? " [MBID MISMATCH]"
          : "";
    console.log(
      `  [${status}] ${artist.name} => ${topMatch?.name ?? "(none)"} (${scoreStr}, ${Math.round(elapsed)}ms)${mbidStr}`,
    );
  }

  // ── 집계 ────────────────────────────────────────────────────

  const overallSummary = computeSummary(results);

  const genres = [...new Set(results.map((r) => r.genre))];
  const byGenre: Record<string, Summary> = {};
  for (const genre of genres) {
    byGenre[genre] = computeSummary(results.filter((r) => r.genre === genre));
  }

  const failures = results
    .filter((r) => !r.matched)
    .map((r) => ({ name: r.name, genre: r.genre }));

  // ── 콘솔 출력 ───────────────────────────────────────────────

  console.log("\n=== Overall Summary ===");
  console.log(`  Total:           ${overallSummary.total}`);
  console.log(`  Matched:         ${overallSummary.matched} (${overallSummary.matchRate})`);
  console.log(`  MBID verified:   ${overallSummary.mbidVerified} checked, ${overallSummary.mbidCorrect} correct (${overallSummary.mbidAccuracy})`);
  console.log(`  Avg confidence:  ${overallSummary.avgConfidence}`);
  console.log(`  Avg response:    ${overallSummary.avgResponseTimeMs}ms`);

  console.log("\n=== By Genre ===");
  for (const [genre, summary] of Object.entries(byGenre)) {
    console.log(`  [${genre}] ${summary.matched}/${summary.total} matched (${summary.matchRate}), avg confidence=${summary.avgConfidence}`);
  }

  if (failures.length > 0) {
    console.log("\n=== Failures ===");
    for (const f of failures) {
      console.log(`  - ${f.name} (${f.genre})`);
    }
  }

  // ── 파일 저장 ───────────────────────────────────────────────

  const report: FullReport = {
    timestamp: new Date().toISOString(),
    totalArtists: artists.length,
    overallSummary,
    byGenre,
    results,
    failures,
  };

  const outPath = path.resolve(__dirname, "../data/mb-matchrate-result.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nResult saved to: ${outPath}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
