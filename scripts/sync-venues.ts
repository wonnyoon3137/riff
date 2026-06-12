/**
 * 공연장 마스터 최초/수동 동기화 CLI (D5).
 *
 * 실행: pnpm sync:venues   (= tsx scripts/sync-venues.ts)
 *
 * - .env.local / .env 에서 KOPIS_*, VENUE_DB_PATH 를 로드한다(의존성 없음).
 * - prfplc 전량을 ≤5 동시성으로 fetch → toVenue 정규화 → venues DB upsert.
 * - 운영 스케줄러를 쓰기 전, 또는 로컬에서 DB를 채울 때 사용.
 *
 * 주기 동기화(DEC-B, 주 1회)는 POST /internal/sync-venues 를 cron으로 호출하는 방식을 쓴다.
 * 이 스크립트는 동일한 syncVenues()를 프로세스로 직접 실행하는 경로다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** 의존성 없이 .env.local / .env 를 process.env 에 로드한다(기존 값 우선). */
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

async function main(): Promise<void> {
  // env 로드 후 import(모듈 평가 시 env 의존).
  const { syncVenues } = await import("../src/server/venues/sync");
  const result = await syncVenues();
  console.log(JSON.stringify(result, null, 2));
  if (result.failedPages.length > 0) {
    console.error(
      `경고: ${result.failedPages.length}개 페이지 실패(성공분만 커밋됨).`,
    );
  }
}

main().catch((err) => {
  console.error("[sync-venues] 동기화 실패:", err);
  process.exit(1);
});
