# Riff — 기여 워크플로 (Contributing)

| 항목 | 내용 |
|---|---|
| 상태 | Active (v2부터 강제) |
| 작성일 | 2026-06-12 |
| 출처 | v2 세션 실천(PR #26~#34) 명문화 — 이슈 #6(P-6) |
| 관련 | [`harness.md`](./architecture/harness.md) §5 피드백 루프, [`features.md`](./product/features.md) D1~D10 |

> 이 문서는 v2 세션에서 **이미 실천한** 기여 규칙을 사후 고정한다(발명이 아니라 명문화). PR #26~#34가 모두 이 규칙을 따랐다. 새 작업은 예외 없이 이 절차를 따른다.

---

## 1. 황금 경로 (한눈에)

```
이슈 → 기능 브랜치 → 커밋(타입+이슈+D# 태그) → PR(Closes #N) → CI green → squash 머지 → 브랜치 삭제
```

직접 main에 커밋하지 않는다. 모든 변경은 PR을 통과한다.

---

## 2. 브랜치 네이밍

`<type>/v<버전>-<짧은-슬러그>` 형식. (v2 실제: `feat/v2-m2-venue-db`, `fix/v2-d8-state-restore`, `feat/v2-process-hardening`)

| 접두 | 용도 |
|---|---|
| `feat/` | 기능·마일스톤(M1~M4)·신규 능력 |
| `fix/` | 버그 수정(예: #22/#23 D8 레이스) |
| `docs/` | 문서 전용 변경 |
| `chore/` | 빌드·CI·설정·의존성 |

- 한 브랜치 = 한 논리 단위(이슈 1개 또는 긴밀히 묶인 이슈군). 여러 결정/도메인을 한 브랜치에 섞지 않는다.
- 작은 묶음 허용: 동일 영역의 연관 버그는 한 PR로 묶는다(예: #24+#25 필터 정합).

---

## 3. 커밋 메시지 컨벤션

형식: `type(scope): 요약 (#이슈, #이슈)` + 본문에 필요 시 `D#` 결정 태그.

```
feat(filter): restore region chip labels + include sort in active판정 (#24, #25)
fix(d8): resolve debounce nav race + scroll restore loadedPages (#22, #23)
feat(ci): docs↔code 드리프트 가드 — 존재 확인→일치 확인 (#4, #20)
```

규칙:
- **type**: `feat` / `fix` / `docs` / `chore` (Conventional Commits 부분 채택). `refactor`/`test`/`perf`는 필요 시 사용 가능.
- **scope**: 변경 영역(`filter`, `d8`, `ci`, `cache`, `lint`, `m2`/`m3` 등). 선택이나 권장.
- **이슈 참조**: 해당 커밋이 닫거나 진척시키는 이슈 번호를 괄호에 명시.
- **D# 태그**: D1~D10 결정에 영향/근거가 있으면 제목 또는 본문에 명기(예: "D8 상태보존", "D10 갱신", "D3 토스트"). 결정 추적성을 위해 필수.
- 마지막 줄(머지 커밋/PR 본문 한정):
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## 4. PR 규칙

PR 본문 표준 섹션(v2 #27/#30에서 사용한 형식):

1. **개요** — 무엇을/왜. 실행계획 링크(`docs/exec-plans/active/NNNN-*.md`).
2. **결정(문서 선행)** — 이 PR이 의존/확정한 D#·DEC-* 결정. 결정 변경 시 **docs를 먼저 갱신했음**을 명시(R1 게이트 원칙).
3. **포함 작업** — 이슈↔작업 매핑 표.
4. **검증** — `tsc`/`vitest`/`eslint`/`e2e` 결과 수치, qa 판정(해당 시).
5. **이슈 연결** — 본문 끝에 `Closes #N`(다중 시 줄마다). 진척만 시키면 `Refs #N`.

- **마일스톤 연결**: 이슈에 v0.2 마일스톤이 달려 있으면 PR 머지로 이슈가 닫히며 마일스톤 진척이 반영된다.
- **결정 변경은 문서 먼저**: D1~D10을 바꾸는 PR은 같은(또는 선행) PR에서 `features.md`/`screens.md`를 먼저 갱신한다. 코드만 바꾸고 문서를 안 바꾸면 `docs-guard` CI가 차단한다.

---

## 5. CI 게이트 (머지 필수 조건)

`.github/workflows/ci.yml` — PR과 push에서 실행. **세 잡 전부 green이어야 머지.**

| 잡 | 단계 | 막는 것 |
|---|---|---|
| `verify` | install → typecheck → lint → test(unit) → build | 타입 오류, 린트 위반(a11y/hex/레이어/미검증코드), 단위 회귀, 빌드 실패 |
| `e2e` | Playwright(핵심 플로우: D8 복원·D4 병합·필터→상세·검색) | 통합 회귀 |
| `docs-guard` | `scripts/check-docs-drift.mjs` | docs↔code 드리프트(존재 확인 → 일치 확인) |

- **로컬 게이트**(커밋 전): `pnpm typecheck && pnpm lint && pnpm test`. 핵심 변경은 `pnpm test:e2e`.
- **CI는 환경 SSOT**: 로컬 toolchain 차이로 로컬 lint가 안 돌아도(예: v2 M2에서 Node 25↔eslint-config-next 비호환) **CI(고정 Node)가 진실원본**이다. 로컬 불가 시 CI green을 머지 근거로 삼는다.

---

## 6. 머지 정책

- **Squash merge.** 한 PR = main에 커밋 1개. 머지 커밋 제목은 PR 제목(타입+이슈+D# 태그 포함).
- 머지 후 기능 브랜치 삭제.
- 머지 = 연결된 이슈 자동 close(`Closes #N`).

---

## 7. QA 게이트 티어 (요약)

작업 규모/리스크/결정 영향에 따라 검증 깊이를 **Fast / Deep** 두 티어로 나눈다. 판정 기준은 [`qa-gate-tiers.md`](./process/qa-gate-tiers.md) 참조.

- **Deep**(qa-engineer 풀 검증): 신규 기능·마일스톤, BFF 경계 변경, D1~D10 신규/변경. (v2: M2 공연장 DB #27, M3 검색 #30)
- **Fast**(타입/lint/test/E2E+CI): 좁은 버그픽스·UI 미세조정·설정. (v2: #22/#23, #24/#25)

Deep 대상은 PR 본문에 qa 판정(APPROVE/이슈)을 포함한다.
