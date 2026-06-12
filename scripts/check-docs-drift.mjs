#!/usr/bin/env node
// #4 (P-4) / #20 (T-09): docs ↔ code 드리프트 가드.
//
// docs-guard CI 를 "파일 존재 확인"에서 "코드 일치(드리프트) 검사"로 확장한다.
// 깨지기 쉬운 검사는 오히려 부채이므로, **확실히 드리프트인 것만** 낮은 거짓양성으로 잡는다.
//
// 검사 항목 (각 항목의 한계는 해당 함수 주석 참조):
//   1) 필수 docs 존재         — 기존 ci.yml 의 파일 존재 검사를 흡수.
//   2) docs→코드 경로 실존     — 마크다운 백틱 안의 `src/...` 경로가 실제로 존재하는지.
//   3) 결정 SSOT 무결성        — features.md 의 D1..DN 이 연속·중복 없이 정의됐는지.
//   4) D# 태그 교차검증        — 코드가 참조하는 결정 태그(D#)가 features.md 에 정의됐는지.
//
// 의도적 비대상(거짓양성 방지): 자연어 의미 일치, 마크다운 교차링크 유효성,
//   모든 심볼/상수 매칭, kopis-codes 표↔상수 전수 대조. (§한계 — 보고 참조)
//
// 이스케이프: 가설/미래 경로처럼 "아직 없는 게 정상"인 참조는 같은 줄에
//   `drift-ignore` 주석(예: <!-- drift-ignore -->)을 달면 경로 실존 검사에서 제외한다.
//
// 사용: `node scripts/check-docs-drift.mjs` (pnpm lint:docs / CI docs-guard 가 호출).
//        위반 시 명확한 메시지 + exit 1.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

/** 검사 대상 docs 트리(+ 루트 문서). 여기서 `src/...` 백틱 참조를 수집한다. */
const DOC_ROOTS = ["docs", "AGENTS.md", "ARCHITECTURE.md"];

/** 항상 존재해야 하는 핵심 docs(기존 ci.yml 존재 검사 흡수). */
const REQUIRED_DOCS = [
  "AGENTS.md",
  "ARCHITECTURE.md",
  "docs/product/overview.md",
  "docs/product/features.md",
  "docs/product/screens.md",
  "docs/architecture/data-model.md",
  "docs/architecture/harness.md",
  "docs/api/kopis-integration.md",
  "docs/api/kopis-codes.md",
];

const IGNORE_MARKER = "drift-ignore";

const errors = [];

// ── 마크다운 파일 수집 ─────────────────────────────────────────
function collectMarkdown(target) {
  const full = join(ROOT, target);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return full.endsWith(".md") ? [full] : [];
  const out = [];
  for (const entry of readdirSync(full)) {
    out.push(...collectMarkdown(join(target, entry)));
  }
  return out;
}

const markdownFiles = [...new Set(DOC_ROOTS.flatMap(collectMarkdown))];

// ─────────────────────────────────────────────────────────────
// 검사 1: 필수 docs 존재
// ─────────────────────────────────────────────────────────────
function checkRequiredDocs() {
  for (const doc of REQUIRED_DOCS) {
    if (!existsSync(join(ROOT, doc))) {
      errors.push(`[required-doc] 필수 문서 누락: ${doc}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 검사 2: docs → 코드 경로 실존
//   마크다운 백틱(`...`) 안에서 `src/`로 시작하는 경로가 실제로 존재하는지.
//   삭제·이동된 파일을 docs 가 가리키면 드리프트로 본다.
//
//   거짓양성 방지를 위해 다음은 "통과"로 처리(존재 검사를 느슨하게):
//   - 글롭(`**`, `*`)·brace 확장(`{a,b}`)을 전개해 멤버가 하나라도 있으면 통과.
//   - 확장자 없는 경로 또는 트레일링 `/`는 디렉터리로 보고 존재만 확인.
//   - `(pages)` 같은 라우트 그룹 괄호는 리터럴로 취급(셸 글롭 아님).
//   - 같은 줄에 `drift-ignore` 가 있으면 그 줄의 모든 경로를 건너뜀(가설/미래 경로).
//
//   한계: 코드→docs 역방향(코드가 docs 를 가리키는 링크)·문장 속 비백틱 경로·
//        타 디렉터리(docs/, .claude/) 경로는 검사하지 않는다(거짓양성 위험·범위 외).
// ─────────────────────────────────────────────────────────────
const SRC_PATH_RE = /`([^`]*\bsrc\/[^`]*)`/g;

/** brace 확장 `a/{x,y}.ts` → ["a/x.ts","a/y.ts"]. 단순 1단계 확장만 지원. */
function expandBraces(p) {
  const m = p.match(/\{([^}]+)\}/);
  if (!m) return [p];
  const before = p.slice(0, m.index);
  const after = p.slice(m.index + m[0].length);
  return m[1].split(",").flatMap((part) => expandBraces(before + part.trim() + after));
}

/** 글롭(`*`)을 포함한 경로가 매칭되는 실제 엔트리가 있으면 true. */
function globHasMatch(relPath) {
  // 글롭 앞의 고정 디렉터리 prefix 까지 좁힌 뒤 재귀 매칭.
  const segments = relPath.split("/");
  const fixed = [];
  for (const seg of segments) {
    if (seg.includes("*")) break;
    fixed.push(seg);
  }
  const baseRel = fixed.join("/");
  const baseFull = join(ROOT, baseRel);
  if (!existsSync(baseFull)) return false;
  // 정규식 변환: ** → 임의 깊이, * → 한 세그먼트 내 임의.
  const escaped = relPath
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DOUBLESTAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLESTAR::/g, ".*");
  const re = new RegExp("^" + escaped + "$");
  const stack = [baseRel];
  while (stack.length) {
    const cur = stack.pop();
    const curFull = join(ROOT, cur);
    if (re.test(cur)) return true;
    let entries = [];
    try {
      if (!statSync(curFull).isDirectory()) continue;
      entries = readdirSync(curFull);
    } catch {
      continue;
    }
    for (const e of entries) stack.push(cur === "" ? e : cur + "/" + e);
  }
  return false;
}

/** 단일 경로 참조가 코드 트리에 존재하는지. */
function pathReferenceExists(raw) {
  // 트레일링 슬래시·공백 정리.
  const clean = raw.trim().replace(/\/+$/, "");
  if (clean === "" || clean === "src") return existsSync(join(ROOT, "src"));

  // 글롭/brace 가 섞인 경우.
  const candidates = expandBraces(clean);
  return candidates.every((c) => {
    if (c.includes("*")) return globHasMatch(c);
    return existsSync(join(ROOT, c));
  });
}

function checkSrcPathReferences() {
  for (const file of markdownFiles) {
    const rel = relative(ROOT, file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes(IGNORE_MARKER)) return;
      for (const m of line.matchAll(SRC_PATH_RE)) {
        const ref = m[1];
        if (!pathReferenceExists(ref)) {
          errors.push(
            `[stale-path] ${rel}:${i + 1}  docs 가 참조하는 코드 경로가 없음: \`${ref}\`` +
              `\n             → 파일이 이동/삭제됐으면 docs 를 갱신하거나, 미래 경로면 줄 끝에 \`${IGNORE_MARKER}\` 주석을 달 것.`,
          );
        }
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 검사 3 + 4: 결정 SSOT(D#) 무결성 및 코드 교차검증
//   features.md 의 의사결정 트래커 표("| D1 | ... |")가 D1..DN 으로
//   연속·중복 없이 정의됐는지. 그리고 src 코드가 언급하는 D# 태그가
//   모두 features.md 에 정의돼 있는지(미정의 결정 참조 = 드리프트).
//
//   한계: D# 의 "내용" 일치는 보지 않는다(자연어). 번호 구조와
//        정의 존재만 본다. 코드의 D# 는 주석/식별자 어디서든 수집한다.
// ─────────────────────────────────────────────────────────────
const FEATURES_MD = join(ROOT, "docs/product/features.md");
const DEFINED_D_RE = /^\|\s*D(\d+)\s*\|/gm; // 의사결정 표의 행 "| D7 | ... |"

function getDefinedDecisions() {
  const text = readFileSync(FEATURES_MD, "utf8");
  const nums = new Set();
  for (const m of text.matchAll(DEFINED_D_RE)) nums.add(Number(m[1]));
  return nums;
}

function checkDecisionSsot(defined) {
  if (defined.size === 0) {
    errors.push(
      "[decision-ssot] features.md 의사결정 표에서 D# 정의를 하나도 찾지 못함(표 형식 변경?).",
    );
    return;
  }
  const max = Math.max(...defined);
  const counts = new Map();
  const text = readFileSync(FEATURES_MD, "utf8");
  for (const m of text.matchAll(DEFINED_D_RE)) {
    const n = Number(m[1]);
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  for (let n = 1; n <= max; n++) {
    if (!defined.has(n)) {
      errors.push(
        `[decision-ssot] features.md 의사결정 번호가 불연속: D${n} 정의 누락(D1..D${max} 중).`,
      );
    } else if (counts.get(n) > 1) {
      errors.push(
        `[decision-ssot] features.md 에 D${n} 정의가 ${counts.get(n)}회 중복.`,
      );
    }
  }
}

function checkCodeDecisionRefs(defined) {
  const srcDir = join(ROOT, "src");
  if (!existsSync(srcDir)) return;
  const D_TAG_RE = /\bD(\d+)\b/g;
  const seen = new Map(); // "D7" -> "src/...:line"
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(full)) continue;
      const rel = relative(ROOT, full);
      readFileSync(full, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const m of line.matchAll(D_TAG_RE)) {
            const n = Number(m[1]);
            const key = `D${n}`;
            if (!seen.has(key)) seen.set(key, { n, at: `${rel}:${i + 1}` });
          }
        });
    }
  };
  walk(srcDir);
  for (const { n, at } of seen.values()) {
    if (!defined.has(n)) {
      errors.push(
        `[decision-ref] ${at}  코드가 참조하는 결정 태그 D${n} 가 features.md 에 정의되지 않음.`,
      );
    }
  }
}

// ── 실행 ──────────────────────────────────────────────────────
checkRequiredDocs();
checkSrcPathReferences();
const definedDecisions = getDefinedDecisions();
checkDecisionSsot(definedDecisions);
checkCodeDecisionRefs(definedDecisions);

if (errors.length > 0) {
  console.error("✖ docs↔code 드리프트 발견:\n");
  for (const e of errors) console.error("  " + e + "\n");
  console.error(`총 ${errors.length}건. docs 또는 코드를 일치시켜라.`);
  process.exit(1);
}

console.log(
  `✓ check-docs-drift: 드리프트 0건 ` +
    `(필수문서 ${REQUIRED_DOCS.length} · 마크다운 ${markdownFiles.length} · 결정 D1..D${Math.max(
      ...definedDecisions,
    )}).`,
);
