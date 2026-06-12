#!/usr/bin/env node
// #2 P-2: CSS raw hex 색상 회귀 방지 가드.
//
// ESLint 는 CSS 를 검사하지 않으므로(별도 stylelint 미도입), 경량 스크립트로
// src/**/*.css 의 raw hex 리터럴을 차단한다. 색상은 M3 디자인 토큰(var(--md-*))만.
//
// 예외(allowlist): design-tokens.css — M3 토큰의 SSOT 로, hex 가 정의되는 유일한 곳.
//
// 한계: 색상 함수(rgb()/hsl()) 의 raw 사용은 막지 않는다(토큰 정의에서 rgba 사용).
//       회귀 방지(현재 hex 0건 유지)가 목표이며 완전한 색상 정책 검증은 아니다.
//
// 사용: `node scripts/check-no-hex.mjs` (pnpm lint 가 호출). 위반 시 exit 1.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ALLOWLIST = new Set(["src/styles/design-tokens.css"]);
// #rgb / #rgba / #rrggbb / #rrggbbaa
const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".css")) out.push(full);
  }
  return out;
}

const violations = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (ALLOWLIST.has(rel)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (HEX.test(line)) violations.push(`${rel}:${i + 1}  ${line.trim()}`);
  });
}

if (violations.length > 0) {
  console.error(
    "✖ raw hex 색상 발견. M3 토큰(var(--md-...))을 사용하라 " +
      "(예외: src/styles/design-tokens.css):\n",
  );
  for (const v of violations) console.error("  " + v);
  console.error(`\n총 ${violations.length}건.`);
  process.exit(1);
}

console.log("✓ check-no-hex: CSS raw hex 0건 (design-tokens.css 예외).");
