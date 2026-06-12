/**
 * 아티스트 수동 검증 CLI (v3 P2-3 수동 보정 도구)
 *
 * 미검증 아티스트 목록 출력 및 검증 처리.
 *
 * 사용법:
 *   npx tsx scripts/artist-verify.ts --list
 *   npx tsx scripts/artist-verify.ts --verify <id>
 *   npx tsx scripts/artist-verify.ts --verify-all-above <threshold>
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

function printUsage(): void {
  console.log("Usage:");
  console.log("  npx tsx scripts/artist-verify.ts --list");
  console.log("  npx tsx scripts/artist-verify.ts --verify <id>");
  console.log("  npx tsx scripts/artist-verify.ts --verify-all-above <threshold>");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const command = args[0];

  // env 로드 후 import
  const {
    listUnverifiedArtists,
    verifyArtist,
    verifyArtistsAboveThreshold,
    findArtistById,
    closeArtistDb,
  } = await import("../src/server/artists/repo");

  try {
    switch (command) {
      case "--list": {
        const artists = listUnverifiedArtists();
        if (artists.length === 0) {
          console.log("[artist-verify] 미검증 아티스트가 없습니다.");
          break;
        }
        console.log(
          `[artist-verify] 미검증 아티스트 ${artists.length}명:\n`,
        );
        console.log(
          padRight("ID", 8) +
            padRight("Name", 30) +
            padRight("MBID", 40) +
            padRight("Confidence", 12),
        );
        console.log("-".repeat(90));
        for (const a of artists) {
          console.log(
            padRight(a.id, 8) +
              padRight(a.name, 30) +
              padRight(a.mbid ?? "-", 40) +
              padRight(
                a.matchConfidence != null
                  ? a.matchConfidence.toFixed(2)
                  : "-",
                12,
              ),
          );
        }
        break;
      }

      case "--verify": {
        const id = args[1];
        if (!id) {
          console.error("[artist-verify] --verify 에 <id>가 필요합니다.");
          printUsage();
          process.exit(1);
        }

        const existing = findArtistById(id);
        if (!existing) {
          console.error(`[artist-verify] id=${id} 아티스트를 찾을 수 없습니다.`);
          process.exit(1);
        }

        if (existing.isManuallyVerified) {
          console.log(
            `[artist-verify] id=${id} "${existing.name}" 은 이미 검증 완료 상태입니다.`,
          );
          break;
        }

        const ok = verifyArtist(id);
        if (ok) {
          console.log(
            `[artist-verify] id=${id} "${existing.name}" 검증 완료로 표기했습니다.`,
          );
        } else {
          console.error(
            `[artist-verify] id=${id} 검증 처리에 실패했습니다.`,
          );
          process.exit(1);
        }
        break;
      }

      case "--verify-all-above": {
        const thresholdStr = args[1];
        if (!thresholdStr) {
          console.error(
            "[artist-verify] --verify-all-above 에 <threshold>가 필요합니다 (0~1).",
          );
          printUsage();
          process.exit(1);
        }

        const threshold = Number(thresholdStr);
        if (isNaN(threshold) || threshold < 0 || threshold > 1) {
          console.error(
            `[artist-verify] threshold는 0~1 사이의 숫자여야 합니다: "${thresholdStr}"`,
          );
          process.exit(1);
        }

        const count = verifyArtistsAboveThreshold(threshold);
        console.log(
          `[artist-verify] confidence >= ${threshold} 인 미검증 아티스트 ${count}명을 검증 완료 처리했습니다.`,
        );
        break;
      }

      default:
        console.error(`[artist-verify] 알 수 없는 명령: ${command}`);
        printUsage();
        process.exit(1);
    }
  } finally {
    closeArtistDb();
  }
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s + " " : s + " ".repeat(len - s.length);
}

main().catch((err) => {
  console.error("[artist-verify] 예상치 못한 오류:", err);
  process.exit(1);
});
