# Riff — QA 게이트 티어링 (Fast / Deep)

| 항목 | 내용 |
|---|---|
| 상태 | Active (v2부터 적용) |
| 작성일 | 2026-06-12 |
| 출처 | v2 실제 적용 명문화 — 이슈 #5(P-5) |
| 관련 | [`qa-engineer.md`](../../.claude/agents/qa-engineer.md), [`orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md) §5·§7 |

> 모든 변경에 동일한 검증 비용을 들이면 작은 버그픽스에 풀 감사가 낭비되고, 큰 기능에 얕은 검증이 위험을 남긴다. v2는 **큰 기능=Deep, 작은 버그=Fast**를 실제로 적용했다(아래 §3). 이 문서는 그 판정 기준을 고정한다.

---

## 1. 두 티어 정의

### Fast 티어 — 자동 게이트로 충분
- **검증 수단:** `pnpm typecheck && pnpm lint && pnpm test` + 핵심 `pnpm test:e2e` + CI 3잡(verify/e2e/docs-guard) green.
- **수행 주체:** 구현 에이전트(frontend/backend) 또는 메인이 직접. **qa-engineer 풀 게이트 생략.**
- **산출물:** PR 검증 섹션에 게이트 결과 수치(예: `vitest N pass`, `e2e N pass`). 별도 qa 리포트 불요.

### Deep 티어 — qa-engineer 풀 검증
- **검증 수단:** Fast의 모든 것 **+ qa-engineer 풀 검증**:
  - **경계면 교차 비교** — API 응답 shape ↔ 프론트 훅 소비 필드/타입 일치.
  - **D1~D10 결정 감사** — 31일 보정(D3)·지역 병합 dedup(D4)·상태 복원(D8)·URL↔필터 라운드트립(§8)·원문 보존·즉시반영(D6).
  - **미검증 코드값 하드코딩 감사**(`kopis-codes.md` "확인 필요").
  - **접근성/성능**(키보드·alt·헤딩·첫 로드 3초).
- **수행 주체:** qa-engineer 에이전트.
- **산출물:** PR 본문에 **qa 판정**(APPROVE / 발견 이슈 목록). 발견 결함은 좁은 패치가 아니라 원인·재발방지로 기술.

---

## 2. 판정 기준표 (어느 티어인가)

세 축(규모 / 리스크 / 결정 영향) 중 **하나라도 Deep 조건에 걸리면 Deep.** 전부 Fast 조건이면 Fast.

| 축 | Fast 조건 | Deep 조건 |
|---|---|---|
| **규모** | 1~2 파일, 좁은 국소 변경 | 신규 기능·마일스톤, 다계층(BFF+도메인+UI) 변경 |
| **경계면** | 새 API 계약 없음, 기존 응답 shape 불변 | BFF 응답 shape 신설/변경, 프론트↔BFF 계약 변경 |
| **결정 영향(D1~D10)** | 기존 결정 구현의 버그 수정(결정 불변) | D1~D10 **신규/변경**, 새 DEC-* 확정 |
| **KOPIS/코드값** | KOPIS 호출 경로 무변경 | 신규 KOPIS 파라미터·동기화·코드값 매핑 도입 |
| **데이터 영속** | 영속 계층 무관 | DB 스키마/동기화/멱등성 도입(예: venues) |

판정 보조 규칙:
- 의심스러우면 **Deep**(안전 측 기본값).
- Fast로 처리한 변경이 회귀를 일으키면 차회부터 해당 영역은 Deep로 승격.
- 메인이 직접 처리하는 초소형 수정(예: 2줄 isDefault 조정)은 Fast 하위 "직접 처리"(위임 정책 #3 참조)지만, CI green은 동일하게 필수.

---

## 3. v2 적용 근거 (실제 이력)

| 변경 | 티어 | 근거 | 결과 |
|---|---|---|---|
| M2 공연장 DB (#9/#15/#16, PR #27) | **Deep** | 신규 기능 + DB 스키마/동기화 + 신규 KOPIS 경로 + 코드값 역매핑 | qa: 동시성≤5·upsert 멱등·sido NULL비율·계약 불변 검증 PASS |
| M3 검색 (#8, PR #30) | **Deep** | 신규 기능 + D10 결정 변경 + BFF 파라미터 + 경계면(UI↔URL↔shprfnm) | qa: 경계면·DEC-S1·D3/D4/D6/D8·캐시분리 PASS, Minor 결함 1건 검출→PR 내 수정 |
| D8 레이스/스크롤 복원 (#22/#23, PR #29) | **Fast** | 기존 결정(D8/D2) 구현 버그, 국소 수정 | E2E+CI green으로 검증, qa 풀게이트 생략 |
| 필터 칩 라벨/sort 정합 (#24/#25, PR #31) | **Fast** | 2개 좁은 버그, 계약 불변 | E2E+CI green |
| 캐시 튜닝 (#17, PR #34) | **Fast** | 설정값 조정, 결정 불변 | CI green |

> 관찰: Deep 두 건(M2·M3) 모두 qa가 **PR 머지 전** 결함/Minor를 잡아 PR 내에서 해소했다(M3 '필터 초기화' 비활성 F5.3 충돌). Fast 네 건은 E2E+CI만으로 회귀 없이 머지됐다. 티어 분리가 과검증/과소검증을 모두 피했음을 시사.

---

## 4. `.claude/` 반영 제안 (사람 승인 필요)

본 문서는 docs로 고정한다. 에이전트 설정 파일 반영은 사람 승인 사항이므로 **제안만** 한다(자동 수정 금지). → [`#사람-승인-요청`](#5-사람-승인-요청-목록) 참조. 본문 §1~§3이 SSOT이며, 아래 파일은 이 문서를 가리키도록 갱신을 제안한다:

- `.claude/agents/qa-engineer.md`: "작업 원칙"에 "**티어 판정 먼저**: Fast/Deep을 `docs/process/qa-gate-tiers.md §2`로 판정하고, Deep만 풀 검증 수행" 한 줄 추가.
- `.claude/skills/orchestrator/SKILL.md`: "완료 기준(피드백 루프)"에 "qa-engineer 검증은 **Deep 티어에 한해 풀 수행**(판정: `qa-gate-tiers.md`). Fast는 자동 게이트로 완료" 명기.

---

## 5. 사람 승인 요청 목록

| # | 대상 파일 | 변경 요지 | 사유 |
|---|---|---|---|
| A1 | `.claude/agents/qa-engineer.md` | 티어 판정 선행 1줄 추가, 본 문서 링크 | 에이전트 절차에 티어링 반영 |
| A2 | `.claude/skills/orchestrator/SKILL.md` | 완료 기준에 "Deep만 풀 검증" 명기 | 게이트 정의 일치 |

> 승인 시 위 두 파일에 최소 변경(링크+1줄)만 가한다. 본문 규칙은 본 문서가 단일 출처.
