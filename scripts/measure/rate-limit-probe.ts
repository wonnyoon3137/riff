/**
 * #12 (T-01) — KOPIS rate limit / 가동률 실측 하네스
 *
 * 목적: KOPIS Open API의 공식 미기재 항목(레이트리밋 임계치, 가동률/지연)을
 * 실제 호출로 측정한다. 명세에 수치가 없으므로(kopis-integration §10, overview Risk 3)
 * 가짜 값을 만들지 않고 "측정 도구 + 실행 절차"를 제공한다.
 *
 * 서비스키가 없으면 실행 불가 → 차단 사유를 명확히 출력하고 exit 1.
 *
 * 실행:
 *   1) .env.local 에 KOPIS_SERVICE_KEY=... 설정 (서버 전용, NEXT_PUBLIC_ 금지)
 *   2) pnpm tsx scripts/measure/rate-limit-probe.ts
 *
 * 옵션(환경변수):
 *   PROBE_CONCURRENCY  동시성 단계 (콤마구분, 기본 "1,2,5,10,20")
 *   PROBE_REQUESTS     단계별 총 요청 수 (기본 30)
 *   PROBE_ROWS         호출당 rows (기본 10, 부하 최소화)
 *   PROBE_TIMEOUT_MS   호출 타임아웃 (기본 5000)
 *
 * 측정 항목:
 *   - 성공률(가동률 proxy), HTTP 상태 분포, resultCode 분포
 *   - 지연 분포(min/p50/p95/max)
 *   - 동시성을 올리며 거부(429/5xx/timeout)가 시작되는 임계 동시성
 *   - 거부 발생 시점의 처리량(req/s) → 레이트리밋 추정 근거
 *
 * 주의: 이 스크립트는 KOPIS 운영 서버에 실제 부하를 준다.
 *       동시성/요청 수를 과하게 올리지 말 것(기본값은 보수적).
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

const SERVICE_KEY = process.env.KOPIS_SERVICE_KEY?.trim();
const BASE_URL =
  process.env.KOPIS_BASE_URL?.trim() ||
  "http://www.kopis.or.kr/openApi/restful";

if (!SERVICE_KEY) {
  console.error(
    [
      "",
      "[BLOCKED] KOPIS_SERVICE_KEY 가 없습니다 — 실측 불가.",
      "",
      "이 환경에는 .env.local 이 없고 .env.example 만 존재합니다.",
      "실측을 진행하려면:",
      "  1) KOPIS(www.kopis.or.kr) 에서 Open API 서비스키 발급",
      "  2) 프로젝트 루트에 .env.local 생성 후:",
      "       KOPIS_SERVICE_KEY=<발급키>",
      "  3) pnpm tsx scripts/measure/rate-limit-probe.ts",
      "",
      "키 없이 가동률/레이트리밋 수치를 지어내지 않습니다.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const CONCURRENCY_STEPS = (process.env.PROBE_CONCURRENCY ?? "1,2,5,10,20")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const REQUESTS_PER_STEP = Number(process.env.PROBE_REQUESTS) || 30;
const ROWS = Number(process.env.PROBE_ROWS) || 10;
const TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS) || 5000;

interface CallResult {
  ok: boolean;
  httpStatus: number | null;
  resultCode: string | null;
  latencyMs: number;
  error?: string;
}

function kopisListUrl(): string {
  // 31일 이내 안전 범위(오늘~+14일), shcate 없이 전국 목록.
  const today = new Date();
  const end = new Date(today.getTime() + 14 * 86_400_000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  const url = new URL(BASE_URL + "/pblprfr");
  url.searchParams.set("service", SERVICE_KEY!);
  url.searchParams.set("stdate", fmt(today));
  url.searchParams.set("eddate", fmt(end));
  url.searchParams.set("cpage", "1");
  url.searchParams.set("rows", String(ROWS));
  return url.toString();
}

async function singleCall(): Promise<CallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const res = await fetch(kopisListUrl(), { signal: controller.signal });
    const latencyMs = performance.now() - started;
    const text = await res.text();
    const codeMatch = text.match(/<resultCode>(\d+)<\/resultCode>/);
    const resultCode = codeMatch?.[1] ?? (res.ok ? "00" : null);
    return {
      ok: res.ok && (resultCode === "00" || resultCode === "04"),
      httpStatus: res.status,
      resultCode,
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: null,
      resultCode: null,
      latencyMs: performance.now() - started,
      error: err instanceof Error ? err.name : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function runStep(concurrency: number): Promise<void> {
  const results: CallResult[] = [];
  const stepStart = performance.now();
  let dispatched = 0;

  async function worker() {
    while (dispatched < REQUESTS_PER_STEP) {
      dispatched++;
      results.push(await singleCall());
    }
  }
  await Promise.all(
    Array.from({ length: concurrency }, () => worker()),
  );
  const wallMs = performance.now() - stepStart;

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const okCount = results.filter((r) => r.ok).length;
  const httpDist: Record<string, number> = {};
  const codeDist: Record<string, number> = {};
  for (const r of results) {
    const h = r.error ?? String(r.httpStatus ?? "null");
    httpDist[h] = (httpDist[h] ?? 0) + 1;
    const c = r.resultCode ?? "none";
    codeDist[c] = (codeDist[c] ?? 0) + 1;
  }

  console.log(`\n=== concurrency=${concurrency} (n=${results.length}) ===`);
  console.log(
    `  성공률(가동률 proxy): ${((okCount / results.length) * 100).toFixed(1)}% (${okCount}/${results.length})`,
  );
  console.log(
    `  처리량: ${((results.length / wallMs) * 1000).toFixed(2)} req/s (wall ${wallMs.toFixed(0)}ms)`,
  );
  console.log(
    `  지연 ms: min=${latencies[0]?.toFixed(0)} p50=${percentile(latencies, 50).toFixed(0)} p95=${percentile(latencies, 95).toFixed(0)} max=${latencies[latencies.length - 1]?.toFixed(0)}`,
  );
  console.log(`  HTTP/에러 분포: ${JSON.stringify(httpDist)}`);
  console.log(`  resultCode 분포: ${JSON.stringify(codeDist)}`);

  const rejected = results.length - okCount;
  if (rejected > 0) {
    console.log(
      `  ⚠️  거부/실패 ${rejected}건 — 동시성 ${concurrency}에서 레이트리밋/포화 가능성. 이 지점의 동시성·req/s를 §10에 기록.`,
    );
  }
}

async function main() {
  console.log("KOPIS rate limit / 가동률 실측 (#12 T-01)");
  console.log(`base=${BASE_URL}`);
  console.log(
    `steps=${CONCURRENCY_STEPS.join(",")} requests/step=${REQUESTS_PER_STEP} rows=${ROWS} timeout=${TIMEOUT_MS}ms`,
  );
  for (const c of CONCURRENCY_STEPS) {
    await runStep(c);
  }
  console.log(
    "\n해석 가이드: 성공률이 떨어지거나 429/5xx/timeout 비율이 급증하는 첫 동시성 단계가 안전 동시성 상한의 근거.",
  );
  console.log(
    "그 결과를 kopis-integration.md §10 / §7.2(다중 지역 동시성 상한)와 docs/exec-plans 트랙 0에 기록할 것.",
  );
}

main().catch((err) => {
  console.error("[probe-error]", err);
  process.exit(1);
});
