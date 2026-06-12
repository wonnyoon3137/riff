/**
 * 아티스트 마스터 데이터 시드 CLI (v3 P2-3 수동 보정 도구)
 *
 * JSON 시드 파일로 아티스트를 일괄 등록/갱신한다.
 * 시드 데이터는 사람이 검증한 것이므로 isManuallyVerified: true가 기본.
 *
 * 실행: npx tsx scripts/artist-seed.ts data/seed-artists.json
 *
 * JSON 형식:
 * {
 *   "artists": [
 *     { "name": "IU", "aliases": ["아이유", "Lee Ji-eun"], "mbid": "..." },
 *     ...
 *   ]
 * }
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── .env 로드 (의존성 없이) ───────────────────────────────────
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

// ── 시드 항목 타입 ────────────────────────────────────────────

interface SeedArtist {
  name: string;
  aliases?: string[];
  mbid?: string;
  isManuallyVerified?: boolean; // 기본 true
}

interface SeedFile {
  artists: SeedArtist[];
}

// ── 메인 ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/artist-seed.ts <json-file>");
    console.error("Example: npx tsx scripts/artist-seed.ts data/seed-artists.json");
    process.exit(1);
  }

  const absPath = resolve(process.cwd(), filePath);
  let raw: string;
  try {
    raw = readFileSync(absPath, "utf8");
  } catch (err) {
    console.error(`[artist-seed] 파일 읽기 실패: ${absPath}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  let seedData: SeedFile;
  try {
    seedData = JSON.parse(raw) as SeedFile;
  } catch (err) {
    console.error(`[artist-seed] JSON 파싱 실패: ${absPath}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (!Array.isArray(seedData.artists) || seedData.artists.length === 0) {
    console.error("[artist-seed] artists 배열이 비어있거나 없습니다.");
    process.exit(1);
  }

  // env 로드 후 import
  const { upsertArtist, closeArtistDb } = await import(
    "../src/server/artists/repo"
  );

  console.log(`[artist-seed] ${seedData.artists.length}명 처리 시작...`);

  let success = 0;
  let errors = 0;

  for (const entry of seedData.artists) {
    if (!entry.name || entry.name.trim() === "") {
      console.error(`  [SKIP] name이 비어있는 항목 건너뜀`);
      errors++;
      continue;
    }

    try {
      const artist = upsertArtist({
        name: entry.name.trim(),
        aliases: entry.aliases,
        mbid: entry.mbid,
        isManuallyVerified: entry.isManuallyVerified !== false, // 기본 true
      });
      console.log(
        `  [OK] id=${artist.id} name="${artist.name}"` +
          (artist.mbid ? ` mbid=${artist.mbid}` : "") +
          ` verified=${artist.isManuallyVerified}`,
      );
      success++;
    } catch (err) {
      console.error(
        `  [ERR] name="${entry.name}": ${err instanceof Error ? err.message : String(err)}`,
      );
      errors++;
    }
  }

  closeArtistDb();

  console.log(
    `\n[artist-seed] 완료: 성공 ${success}, 실패 ${errors}, 전체 ${seedData.artists.length}`,
  );
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[artist-seed] 예상치 못한 오류:", err);
  process.exit(1);
});
