/**
 * #47 (Q-3) -- KOPIS signgucodesub 구군 코드 수용 검증
 *
 * 목적: GUGUN_MAP에 데이터화된 구군 코드가 KOPIS /pblprfr API의
 * signgucodesub 파라미터로 실제 수용되는지 실 호출로 검증한다.
 *
 * 검증 대상 (최소 10건):
 *   - 서울(11): 1168 강남구, 1171 송파구, 1144 마포구, 1111 종로구, 1114 중구
 *   - 경기(41): 4113 성남시, 4111 수원시, 4115 의정부시, 4117 안양시, 4119 부천시
 *
 * 판정 기준:
 *   - HTTP 200 + resultCode 00(정상) 또는 04(NODATA) = 코드 수용됨
 *   - resultCode 05(31일 초과) 등 에러 또는 HTTP 4xx/5xx = 코드 거부 가능성
 *
 * 실행:
 *   1) .env.local 에 KOPIS_SERVICE_KEY=... 설정
 *   2) pnpm tsx scripts/verify-gugun-codes.ts
 *
 * rate limit: 동시성 5 이하 (kopis-integration 스킬 실측 근거).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── .env 로드 (의존성 없이) ──────────────────────────────────────────
function loadEnvFile(file: string): void {
  let raw: string;
  // 절대 경로면 그대로, 상대 경로면 cwd 기준 resolve
  const filePath = file.startsWith("/") ? file : resolve(process.cwd(), file);
  try {
    raw = readFileSync(filePath, "utf8");
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

// 워크트리에서 실행 시 메인 레포의 .env도 탐색
loadEnvFile(".env.local");
loadEnvFile(".env");

// git worktree 환경: 메인 레포 루트의 .env 폴백
const worktreeMarker = resolve(process.cwd(), ".claude");
if (!process.env.KOPIS_SERVICE_KEY) {
  // .claude/worktrees/<id> 패턴 감지 → 3단계 상위가 메인 레포
  const cwd = process.cwd();
  const wtMatch = cwd.match(/^(.+)[\\/]\.claude[\\/]worktrees[\\/][^/\\]+$/);
  if (wtMatch) {
    const mainRoot = wtMatch[1];
    loadEnvFile(resolve(mainRoot, ".env.local"));
    loadEnvFile(resolve(mainRoot, ".env"));
  }
}

const SERVICE_KEY = process.env.KOPIS_SERVICE_KEY?.trim();
const BASE_URL =
  process.env.KOPIS_BASE_URL?.trim() ||
  "http://www.kopis.or.kr/openApi/restful";
const TIMEOUT_MS = Number(process.env.KOPIS_TIMEOUT_MS) || 5000;
const CONCURRENCY = 5;

if (!SERVICE_KEY) {
  console.error(
    [
      "",
      "[BLOCKED] KOPIS_SERVICE_KEY 가 없습니다 -- 검증 불가.",
      "",
      "실행하려면:",
      "  1) KOPIS(www.kopis.or.kr) 에서 Open API 서비스키 발급",
      "  2) 프로젝트 루트에 .env.local 생성 후:",
      "       KOPIS_SERVICE_KEY=<발급키>",
      "  3) pnpm tsx scripts/verify-gugun-codes.ts",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// ── 검증 대상 구군 코드 ──────────────────────────────────────────────
interface TargetGugun {
  sidoCode: string;
  sidoName: string;
  gugunCode: string;
  gugunName: string;
}

const TARGETS: TargetGugun[] = [
  // 서울(11) 주요 5구
  { sidoCode: "11", sidoName: "서울", gugunCode: "1168", gugunName: "강남구" },
  { sidoCode: "11", sidoName: "서울", gugunCode: "1171", gugunName: "송파구" },
  { sidoCode: "11", sidoName: "서울", gugunCode: "1144", gugunName: "마포구" },
  { sidoCode: "11", sidoName: "서울", gugunCode: "1111", gugunName: "종로구" },
  { sidoCode: "11", sidoName: "서울", gugunCode: "1114", gugunName: "중구" },
  // 경기(41) 주요 5시
  { sidoCode: "41", sidoName: "경기", gugunCode: "4113", gugunName: "성남시" },
  { sidoCode: "41", sidoName: "경기", gugunCode: "4111", gugunName: "수원시" },
  { sidoCode: "41", sidoName: "경기", gugunCode: "4115", gugunName: "의정부시" },
  { sidoCode: "41", sidoName: "경기", gugunCode: "4117", gugunName: "안양시" },
  { sidoCode: "41", sidoName: "경기", gugunCode: "4119", gugunName: "부천시" },
];

// ── API 호출 ─────────────────────────────────────────────────────────
interface VerifyResult {
  target: TargetGugun;
  httpStatus: number | null;
  resultCode: string | null;
  itemCount: number;
  accepted: boolean;
  latencyMs: number;
  error?: string;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function verifyGugun(target: TargetGugun): Promise<VerifyResult> {
  const today = new Date();
  const end = new Date(today.getTime() + 30 * 86_400_000); // 30일 (31일 미만)

  const url = new URL(BASE_URL + "/pblprfr");
  url.searchParams.set("service", SERVICE_KEY!);
  url.searchParams.set("stdate", formatDate(today));
  url.searchParams.set("eddate", formatDate(end));
  url.searchParams.set("cpage", "1");
  url.searchParams.set("rows", "10");
  url.searchParams.set("signgucode", target.sidoCode);
  url.searchParams.set("signgucodesub", target.gugunCode);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    const latencyMs = performance.now() - started;
    const text = await res.text();

    const codeMatch = text.match(/<resultCode>(\d+)<\/resultCode>/);
    const resultCode = codeMatch?.[1] ?? (res.ok ? "00" : null);

    // <db> 엘리먼트 개수로 결과 건수 산출
    const dbMatches = text.match(/<db>/g);
    const itemCount = dbMatches?.length ?? 0;

    // 수용 판정: HTTP 200 + resultCode 00 또는 04(NODATA)
    const accepted = res.ok && (resultCode === "00" || resultCode === "04");

    return {
      target,
      httpStatus: res.status,
      resultCode,
      itemCount,
      accepted,
      latencyMs,
    };
  } catch (err) {
    return {
      target,
      httpStatus: null,
      resultCode: null,
      itemCount: 0,
      accepted: false,
      latencyMs: performance.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── 동시성 제한 배치 실행 ────────────────────────────────────────────
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await fn(items[idx]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ── 메인 ─────────────────────────────────────────────────────────────
async function main() {
  console.log("=== KOPIS signgucodesub 구군 코드 수용 검증 (#47 Q-3) ===");
  console.log(`base=${BASE_URL}`);
  console.log(`targets=${TARGETS.length}, concurrency=${CONCURRENCY}, timeout=${TIMEOUT_MS}ms`);
  console.log("");

  const results = await runWithConcurrency(TARGETS, CONCURRENCY, verifyGugun);

  // ── 결과 출력 ──────────────────────────────────────────────────────
  console.log(
    "코드   | 시도  | 구군           | HTTP | RC   | 건수 | 결과",
  );
  console.log(
    "-------|-------|----------------|------|------|------|------",
  );

  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const status = r.accepted ? "PASS" : "FAIL";
    if (r.accepted) passCount++;
    else failCount++;

    const code = r.target.gugunCode.padEnd(6);
    const sido = r.target.sidoName.padEnd(5);
    const gugun = r.target.gugunName.padEnd(14);
    const http = (r.httpStatus?.toString() ?? "ERR").padEnd(4);
    const rc = (r.resultCode ?? "N/A").padEnd(4);
    const count = String(r.itemCount).padEnd(4);
    const errSuffix = r.error ? ` (${r.error})` : "";

    console.log(
      `${code} | ${sido} | ${gugun} | ${http} | ${rc} | ${count} | ${status}${errSuffix}`,
    );
  }

  console.log("");
  console.log(`총 ${results.length}건: PASS=${passCount}, FAIL=${failCount}`);

  if (failCount > 0) {
    console.log("");
    console.log("[WARNING] 구군 코드 불일치 발견. GUGUN_MAP 수정 필요.");
    const failedCodes = results
      .filter((r) => !r.accepted)
      .map((r) => `${r.target.gugunCode}(${r.target.gugunName})`);
    console.log(`실패 코드: ${failedCodes.join(", ")}`);
    process.exit(1);
  } else {
    console.log("");
    console.log("[OK] 검증 대상 구군 코드 전량 KOPIS에서 수용 확인.");
  }
}

main().catch((err) => {
  console.error("[verify-error]", err);
  process.exit(1);
});
