/**
 * 아티스트 추출 파이프라인 CLI (v3 P2-3 수동 보정 도구)
 *
 * 특정 공연들의 prfcast를 파이프라인(추출 -> MusicBrainz 매칭 -> DB 저장)에 태운다.
 *
 * 사용법:
 *   npx tsx scripts/run-pipeline.ts PF12345 PF12346          # 특정 공연
 *   npx tsx scripts/run-pipeline.ts --all-unprocessed        # 미처리 공연 전체
 *
 * --all-unprocessed는 KOPIS 목록 API에서 현재 공연중 목록을 가져와
 * performance_artists에 아직 없는 공연만 처리한다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── .env 로드 ─────────────────────────────────────────────────
function loadEnvFile(file: string): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// ── 메인 ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage:");
    console.error("  npx tsx scripts/run-pipeline.ts <mt20id> [mt20id ...]");
    console.error("  npx tsx scripts/run-pipeline.ts --all-unprocessed");
    process.exit(1);
  }

  // env 로드 후 import
  const { kopisGet } = await import("../src/server/kopis/client");
  const { processPerformanceCast } = await import(
    "../src/server/artists/pipeline"
  );
  const { listProcessedPerformanceIds, closeArtistDb } = await import(
    "../src/server/artists/repo"
  );

  // mt20id 목록 결정
  let mt20ids: string[];

  if (args[0] === "--all-unprocessed") {
    console.log("[run-pipeline] 미처리 공연 목록 조회 중...");

    // KOPIS 목록 API에서 현재 공연중(대중음악) 목록을 가져온다.
    // 날짜 범위: 오늘 기준 -30일 ~ +30일
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 30);
    const to = new Date(today);
    to.setDate(to.getDate() + 30);

    const formatDate = (d: Date): string =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

    interface ListItem {
      mt20id?: string;
    }

    let allIds: string[] = [];
    let page = 1;
    const pageSize = 100;

    try {
      // 최대 10페이지(1000건)까지 조회
      while (page <= 10) {
        const items = await kopisGet<ListItem>("/pblprfr", {
          stdate: formatDate(from),
          eddate: formatDate(to),
          cpage: page,
          rows: pageSize,
          shcate: "CCCD", // 대중음악
        });

        const ids = items
          .map((item) => item.mt20id)
          .filter((id): id is string => !!id);

        allIds = allIds.concat(ids);

        if (items.length < pageSize) break;
        page++;
      }
    } catch (err) {
      console.error(
        "[run-pipeline] KOPIS 목록 조회 실패:",
        err instanceof Error ? err.message : String(err),
      );
      process.exit(1);
    }

    // 이미 처리된 공연 제외
    const processedIds = listProcessedPerformanceIds();
    mt20ids = allIds.filter((id) => !processedIds.has(id));

    console.log(
      `[run-pipeline] 전체 ${allIds.length}건 중 미처리 ${mt20ids.length}건`,
    );

    if (mt20ids.length === 0) {
      console.log("[run-pipeline] 처리할 공연이 없습니다.");
      closeArtistDb();
      return;
    }
  } else {
    mt20ids = args.filter((a) => a.trim() !== "");
    if (mt20ids.length === 0) {
      console.error("[run-pipeline] mt20id를 하나 이상 지정하세요.");
      process.exit(1);
    }
  }

  console.log(`[run-pipeline] ${mt20ids.length}건 처리 시작...\n`);

  let success = 0;
  let errors = 0;

  for (const mt20id of mt20ids) {
    console.log(`  [${mt20id}] KOPIS 상세 조회 중...`);

    try {
      // 1. KOPIS 상세에서 prfcast 가져오기
      interface DetailItem {
        prfcast?: string;
        prfnm?: string;
      }

      const items = await kopisGet<DetailItem>(`/pblprfr/${mt20id}`, {});
      if (items.length === 0) {
        console.error(`  [${mt20id}] KOPIS 상세 없음 (404)`);
        errors++;
        continue;
      }

      const detail = items[0];
      const prfcast = detail.prfcast;
      const title = detail.prfnm ?? "(제목 없음)";

      if (!prfcast || prfcast.trim() === "") {
        console.log(`  [${mt20id}] "${title}" - prfcast 비어있음, 건너뜀`);
        continue;
      }

      console.log(`  [${mt20id}] "${title}" - prfcast: "${prfcast}"`);

      // 2. 파이프라인 실행
      const result = await processPerformanceCast(mt20id, prfcast);

      console.log(
        `  [${mt20id}] 결과: 추출 ${result.processed}명, 매칭 ${result.matched}명, 실패 ${result.failed}명`,
      );

      if (result.artists.length > 0) {
        for (const a of result.artists) {
          console.log(
            `    -> id=${a.id} "${a.name}"` +
              (a.mbid ? ` mbid=${a.mbid}` : "") +
              ` confidence=${a.matchConfidence?.toFixed(2) ?? "-"}`,
          );
        }
      }

      success++;
    } catch (err) {
      console.error(
        `  [${mt20id}] 오류: ${err instanceof Error ? err.message : String(err)}`,
      );
      errors++;
      // 에러 시 중단하지 않고 계속
    }

    console.log("");
  }

  closeArtistDb();

  console.log(
    `[run-pipeline] 완료: 성공 ${success}, 오류 ${errors}, 전체 ${mt20ids.length}`,
  );
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[run-pipeline] 예상치 못한 오류:", err);
  process.exit(1);
});
