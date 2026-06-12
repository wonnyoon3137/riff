# Riff — 하네스 구조 설계 (Agent Harness)

| 항목 | 내용 |
|---|---|
| 서비스명 | Riff (리프) |
| 버전 | v0.1 (MVP) |
| 작성일 | 2026-06-08 |
| 상태 | Draft |
| 기반 문서 | [`overview.md`](../../overview.md) · [`features.md`](../../features.md) · [`screens.md`](../product/screens.md) · [`data-model.md`](./data-model.md) · [`kopis-integration.md`](../api/kopis-integration.md) · [`kopis-codes.md`](../api/kopis-codes.md) |

> 본 문서는 Riff를 **에이전트 기반으로 개발**하기 위한 하네스(harness) 구조를 설계한다. AI 에이전트(Claude Code 등)가 이 레포에서 일관되게 작업하도록, 진입점 문서(`AGENTS.md`), 역할별 서브에이전트, 도메인 스킬, 피드백 루프(CI/린터/테스트), 디렉토리 구조를 정의한다.
>
> 채택 방향: **OpenAI 방식**(루트 `AGENTS.md`를 100줄 이내 "목차"로 두고 상세는 `docs/`로 분산) + **revfactory 방식**(`.claude/agents/`, `.claude/skills/`로 역할·스킬을 파일화)의 **조합**.

---

## 목차

- 1. 설계 원칙
- 2. AGENTS.md 초안 (100줄 이내 목차형)
- 3. 에이전트 역할 정의
- 4. 스킬 정의
- 5. 피드백 루프 (CI / 린터 / 테스트)
- 6. 전체 디렉토리 구조 최종안
- 7. 운영 메모 / 다음 단계
- 8. 기여 워크플로 (PR 기반)
- 9. 프로세스 검증 노트 (위임 정책 / QA 티어 / ROI)

---

## 1. 설계 원칙

1. **단일 진입점, 얇은 목차.** 루트 `AGENTS.md`는 "무엇이 어디에 있는지"만 가리키는 100줄 이내 목차. 상세 지식은 `docs/`에 분산해 컨텍스트 과부하를 막는다(OpenAI 방식).
2. **역할 분리.** 작업 유형별 서브에이전트(planner/frontend/backend/qa)를 `.claude/agents/`에 파일로 정의(revfactory 방식). 각 에이전트는 책임·입력·출력·참조 문서가 명확.
3. **도메인 지식의 스킬화.** 반복되는 도메인 규칙(오케스트레이션, Next.js 패턴, KOPIS 연동)을 `.claude/skills/`로 캡슐화해 에이전트가 일관 적용.
4. **문서가 진실원본(SSOT).** 의사결정은 `features.md`(D1~D10)와 `docs/`가 기준. 에이전트는 코드보다 문서를 먼저 참조하고, 충돌 시 문서를 갱신한 뒤 코드.
5. **피드백 루프 필수.** 모든 변경은 타입체크·린트·테스트를 통과해야 "완료". qa 에이전트가 검증 게이트.

---

## 2. AGENTS.md 초안 (100줄 이내, 목차형)

> 루트 `/AGENTS.md`. 아래는 그대로 사용 가능한 초안(주석 포함 약 90줄).

```markdown
# Riff — AGENTS.md

Riff: 흩어진 공연 정보를 한곳에서 탐색하는 서비스 (KOPIS 기반, v0.1 MVP).
이 파일은 목차다. 상세는 docs/ 를 따라가라. 작업 전 반드시 관련 docs를 먼저 읽는다.

## 프로젝트 한 줄
인터넷에 흩어진 공연 정보를 한 화면에서 탐색. v0.1은 KOPIS 목록/필터/상세.

## 기술 스택
- Next.js (App Router, TypeScript), React Query(무한 스크롤/캐시)
- BFF: Next Route Handler (KOPIS 호출/정규화/병합/캐싱)
- 디자인 시스템: Material 3 (Figma: Material 3 Design Kit)
- 데이터: KOPIS Open API + 자체 DB(공연장 마스터만)

## 문서 지도 (먼저 읽어라)
- 기획: docs/product/overview.md  (배경/타겟/범위/리스크)
- 기능: docs/product/features.md  (F1~F4, 의사결정 D1~D10 = SSOT)
- 화면: docs/product/screens.md   (S1 메인, S2 상세, 상태/반응형/M3 매핑)
- 데이터: docs/architecture/data-model.md (도메인 타입/상태보존/URL스키마)
- API: docs/api/kopis-integration.md (4개 엔드포인트/BFF/시퀀스)
- 코드값: docs/api/kopis-codes.md  (장르/지역/상태 — 다수 "확인 필요")
- 하네스: docs/architecture/harness.md (이 구조 설명)

## 핵심 결정 (어기지 말 것; 출처 features.md)
- D1 디폴트: 30일 이내·전국·전체 장르
- D2 무한 스크롤 / D8 뒤로가기 상태 보존(스크롤+페이지수+필터)
- D3 월 범위 31일 제한(UI) / D4 지역 다중선택→BFF 병합
- D5 공연장 마스터 사전 동기화 / D6 필터 즉시 반영(debounce 300ms)
- D7 상세 지도 제외 / D9 정렬(시작일 가까운·먼 순) / D10 검색 v0.2 이관

## 불변 규칙
- KOPIS 서비스키는 서버 전용. 브라우저에서 KOPIS 직접 호출 금지.
- 자유 텍스트(prfcast/pcseguidance 등)는 v0.1 파싱 금지, 원문 보존.
- 색상/타이포는 M3 토큰만(하드코딩 hex 금지).
- 코드값 "확인 필요" 항목은 검증 전 하드코딩 금지(kopis-codes.md).
- 외부 예매 링크는 target=_blank + rel=noopener noreferrer.

## 작업 방식
- 변경 전: 관련 docs 읽기 → 충돌 시 docs 먼저 갱신.
- 역할별 에이전트 사용: .claude/agents/ (planner/frontend/backend/qa).
- 도메인 규칙은 .claude/skills/ 참조(orchestrator/nextjs-patterns/kopis-integration).
- 완료 기준: typecheck + lint + test 통과(§ 피드백 루프).

## 명령어
- 개발: `pnpm dev`  | 빌드: `pnpm build`
- 타입체크: `pnpm typecheck` | 린트: `pnpm lint`
- 테스트: `pnpm test` (unit) / `pnpm test:e2e`
- 공연장 동기화: `pnpm sync:venues` (KOPIS prfplc 전량 upsert)

## 디렉토리 빠른 지도
- src/app        화면/라우트(S1 '/', S2 '/performances/[mt20id]') + api/
- src/server     BFF(kopis/ normalize/ merge/ cache/ venues/)
- src/domain     도메인 타입/필터-URL 직렬화/코드 매핑
- src/components  UI(M3 기반 컴포넌트)
- docs           제품/아키텍처/API 문서(SSOT)
- .claude        agents/ skills/ (하네스)

## 하지 말 것
- D1~D10에 어긋나는 구현. 문서 미갱신 상태의 결정 변경.
- 미검증 KOPIS 코드값으로 필터 하드코딩.
- 로그인/검색/지도 등 v0.1 범위 외 기능 임의 추가.
```

---

## 3. 에이전트 역할 정의

> 위치: `.claude/agents/*.md`. 각 파일은 역할·책임·입력·출력·참조 문서·완료 기준을 담는다.

### 3.1 `planner` (기획/작업 분해)
- **책임:** 요구사항을 작업 단위로 분해, 의사결정(D1~D10) 정합성 검토, docs 갱신 주도. 모호하면 질문 생성.
- **입력:** 사용자 요청, `overview.md`/`features.md`/`screens.md`.
- **출력:** 작업 계획(체크리스트), 영향받는 문서 목록, 필요한 의사결정 제안. **코드는 직접 작성하지 않음.**
- **참조:** 전 docs. **완료 기준:** 계획이 D1~D10과 무모순, 각 작업에 담당 에이전트 지정.

### 3.2 `frontend-dev` (UI/화면)
- **책임:** S1/S2 화면, M3 기반 컴포넌트, 필터/정렬 UI, 무한 스크롤, 상태(로딩/빈/에러), 반응형(1440/375), URL 동기화, 상태 복원(클라이언트 측).
- **입력:** `screens.md`(영역/컴포넌트/인터랙션), `data-model.md`(FilterState/URL/복원), 디자인 토큰(M3).
- **출력:** `src/app`(화면), `src/components`, `src/domain/filter-url.ts` 클라이언트 연동.
- **참조:** `screens.md`, `data-model.md` §7~8, `nextjs-patterns` 스킬, `orchestrator` 스킬.
- **완료 기준:** 접근성(키보드/alt/헤딩) 충족, typecheck/lint 통과, 스토리/스냅샷(있으면) 갱신.

### 3.3 `backend-dev` (BFF/데이터)
- **책임:** BFF 엔드포인트(`/api/performances`, 상세, `/api/venues`), KOPIS 클라이언트·XML 파싱·정규화·지역 병합·캐싱, 공연장 동기화(D5), 서비스키 보안.
- **입력:** `kopis-integration.md`, `data-model.md`(도메인 타입/병합), `kopis-codes.md`(코드 매핑).
- **출력:** `src/server/**`, `src/domain/types.ts`, 동기화 스크립트.
- **참조:** `kopis-integration` 스킬, `data-model.md`, `kopis-codes.md`.
- **완료 기준:** 도메인 타입 계약 준수(클라이언트에 KOPIS 원형 노출 금지), 미검증 코드값 하드코딩 금지, 단위 테스트(정규화/병합) 통과.

### 3.4 `qa-engineer` (검증 게이트)
- **책임:** 변경에 대한 테스트 설계·실행, 회귀 점검, D1~D10 준수 검증, 접근성/성능(첫 로드 3초) 점검, "확인 필요" 항목이 미검증 상태로 하드코딩되지 않았는지 감사.
- **입력:** 변경 diff, 전 docs(특히 features D1~D10).
- **출력:** 테스트 코드(`*.test.ts`, e2e), 검증 리포트, 발견 이슈→`planner`로 환류.
- **참조:** 전 docs, `orchestrator` 스킬. **완료 기준:** typecheck+lint+unit+e2e 그린, 결정 위반 0건.

### 3.5 협업 흐름
```
요청 → planner(분해/문서정합) → frontend-dev / backend-dev(병렬 구현)
     → qa-engineer(검증 게이트) → 통과 시 완료 / 실패 시 planner로 환류
```

---

## 4. 스킬 정의

> 위치: `.claude/skills/*/SKILL.md`. 반복 도메인 지식을 캡슐화. 에이전트가 상황에 맞게 로드.

### 4.1 `orchestrator`
- **담는 지식:** 전체 작업 오케스트레이션 규칙 — 어떤 요청에 어떤 에이전트를 쓰는지, docs-우선 원칙, 결정(D1~D10) 게이트, 완료 기준(피드백 루프), 충돌 시 문서 갱신 절차.
- **사용 주체:** planner(주), qa(검증 흐름).
- **핵심 규칙:** "코드보다 docs 먼저", "결정 변경은 features.md 갱신 후", "완료=그린 빌드".

### 4.2 `nextjs-patterns`
- **담는 지식:** 이 프로젝트의 Next.js(App Router) 관례 — Server/Client 컴포넌트 경계, Route Handler(BFF) 작성 패턴, React Query `useInfiniteQuery` + 스크롤 복원(∴ data-model §7), URL 쿼리 동기화(`replaceState`+debounce, §8), M3 컴포넌트 적용 패턴, 에러/로딩 바운더리(S1-L/E/X 매핑).
- **사용 주체:** frontend-dev(주), backend-dev(Route Handler).
- **핵심 규칙:** 데이터 패칭은 서버/BFF 우선, 클라이언트는 도메인 타입만, 토큰은 M3.

### 4.3 `kopis-integration`
- **담는 지식:** KOPIS 연동 실무 — 4개 엔드포인트/파라미터, 서비스키 서버 전용, XML→도메인 정규화 규칙, 31일 제약(D3)·지역 병렬 병합(D4) 시퀀스, 캐싱/에러/레이트리밋(Risk 3), 자유 텍스트 원문 보존, "확인 필요" 코드값 취급(검증 전 하드코딩 금지).
- **사용 주체:** backend-dev(주), qa(검증).
- **핵심 규칙:** 브라우저 직접 호출 금지, 코드값은 `kopis-codes.md` 검증 후 단일 매핑 모듈로.

---

## 5. 피드백 루프 (CI / 린터 / 테스트)

### 5.1 로컬 게이트 (커밋 전)
- `pnpm typecheck`(tsc --noEmit) · `pnpm lint`(ESLint + Prettier) · `pnpm test`(Vitest/Jest 단위).
- pre-commit 훅(husky + lint-staged)으로 변경 파일 린트/포맷.

### 5.2 CI (PR 게이트)
```
on: pull_request
jobs:
  verify:
    - install (pnpm)
    - typecheck
    - lint
    - test (unit)
    - build (next build)
    - (선택) e2e (Playwright, 핵심 플로우: 목록→필터→상세→뒤로가기 복원)
```
- 모든 잡 그린이어야 머지. qa-engineer가 실패를 planner로 환류.

### 5.3 에이전트 ↔ 루프 연결
- 각 구현 에이전트는 작업 종료 전 로컬 게이트를 **스스로 실행**하고 결과를 출력에 포함.
- qa-engineer는 CI 동등 검증 + D1~D10 준수 + "확인 필요" 하드코딩 감사를 수행, 위반 시 머지 차단.
- 핵심 회귀 테스트(예시): 31일 초과 보정(D3), 지역 병합 중복 제거(D4), 뒤로가기 상태 복원(D8), URL↔필터 직렬화 라운드트립(§8), 정규화 원문 보존(prfcast 등).

---

## 6. 전체 디렉토리 구조 최종안

```
riff/
├─ AGENTS.md                      # 100줄 이내 목차 (§2)
├─ README.md                      # 사람용 개요(셋업/실행)
├─ package.json                   # scripts: dev/build/typecheck/lint/test/sync:venues
├─ .claude/
│  ├─ agents/
│  │  ├─ planner.md
│  │  ├─ frontend-dev.md
│  │  ├─ backend-dev.md
│  │  └─ qa-engineer.md
│  └─ skills/
│     ├─ orchestrator/SKILL.md
│     ├─ nextjs-patterns/SKILL.md
│     └─ kopis-integration/SKILL.md
├─ docs/
│  ├─ product/
│  │  ├─ overview.md              # 기획서
│  │  ├─ features.md              # 기능정의서(D1~D10 SSOT)
│  │  └─ screens.md               # 화면설계서(M3)
│  ├─ architecture/
│  │  ├─ data-model.md            # 도메인/상태/URL
│  │  └─ harness.md               # 본 문서
│  └─ api/
│     ├─ kopis-integration.md     # 연동 명세
│     └─ kopis-codes.md           # 코드 테이블(확인 필요 관리)
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 # S1 메인 '/'
│  │  ├─ performances/[mt20id]/page.tsx  # S2 상세
│  │  └─ api/
│  │     ├─ performances/route.ts
│  │     ├─ performances/[mt20id]/route.ts
│  │     └─ venues/route.ts
│  ├─ server/
│  │  ├─ kopis/{client,parse-xml,normalize,merge,raw-types}.ts
│  │  ├─ cache/index.ts
│  │  └─ venues/{sync,repo}.ts
│  ├─ domain/
│  │  ├─ types.ts                 # 도메인 타입(data-model.md)
│  │  ├─ filter-url.ts            # 필터↔쿼리 직렬화(§8)
│  │  └─ kopis-codes.ts           # 검증된 코드 매핑(생성은 검증 후)
│  └─ components/                 # M3 기반 UI(카드/필터칩/정렬/상태뷰)
├─ scripts/
│  └─ sync-venues.ts              # pnpm sync:venues
├─ tests/                         # unit/e2e
└─ .github/workflows/ci.yml       # §5.2 게이트
```

> 주의: 현재 작성된 문서 파일들은 `overview.md`/`features.md`가 루트 기준이고 신규 문서는 `docs/` 하위에 있다. 레포 통합 시 위 구조처럼 `docs/product/`로 이동하고 상호 링크 경로를 일괄 정리한다(상대 경로 갱신 필요).

---

## 7. 운영 메모 / 다음 단계

- [ ] `.claude/agents/*.md`, `.claude/skills/*/SKILL.md` 실제 파일 작성(본 §3·§4를 본문으로).
- [ ] `AGENTS.md`를 레포 루트에 배치(§2 초안 기반), 문서 경로 확정 후 링크 정리.
- [ ] CI 워크플로(`ci.yml`)와 pre-commit 훅 구성.
- [ ] 핵심 회귀 테스트 목록을 qa 스킬/테스트로 구체화(D3/D4/D8/§8/정규화).
- [ ] `kopis-codes.md` "확인 필요" 해소 후 `src/domain/kopis-codes.ts` 생성.
- [ ] 문서 통합 시 `overview.md`/`features.md`를 `docs/product/`로 이동 + 전 문서 상대 링크 갱신.

---

## 8. 기여 워크플로 (PR 기반)

v2부터 모든 변경은 **기능 브랜치 → PR → CI green → squash 머지** 경로를 따른다. 상세 규칙(브랜치 네이밍, 커밋 타입/이슈/D# 태그, PR↔이슈 `Closes`, CI 3잡 게이트, squash 정책)은 단일 출처 [`docs/CONTRIBUTING.md`](../CONTRIBUTING.md)에 고정한다. §5(피드백 루프)는 로컬/CI 게이트의 *내용*을, CONTRIBUTING은 그 게이트를 *어떤 프로세스로* 통과시키는지를 정의한다.

요약:
- 브랜치 `<type>/v<버전>-<슬러그>`(`feat`/`fix`/`docs`/`chore`).
- 커밋 `type(scope): 요약 (#이슈)` + D# 결정 태그.
- PR 본문 `Closes #N`로 이슈·마일스톤 연결, 결정 변경은 docs 선행.
- CI `verify`/`e2e`/`docs-guard` 전부 green이어야 squash 머지.
- 검증 깊이는 [`docs/process/qa-gate-tiers.md`](../process/qa-gate-tiers.md)의 Fast/Deep 티어로 결정.

---

## 9. 프로세스 검증 노트 (위임 정책 / QA 티어 / ROI)

> v2 세션이 이 프로세스 항목들의 실사례다(이슈 #3·#5·#6·#7). 본 절은 **관찰 기반 검증**이며, 완성된 회고는 별도 v2 회고 문서로 수렴한다(추측 수치 금지, 실제 PR/이슈 이력에 근거).

### 9.1 위임 정책 검증 (#3)

v2 위임 파이프라인: `orchestrator → planner(분해/docs정합) → frontend-dev/backend-dev(구현) → qa-engineer(검증)`. 작은 수정은 메인 직접 처리.

**잘 작동한 점:**
- **docs-우선 위임이 범위 이탈을 사전 차단.** planner가 M3 검색(#8) 착수 전 R1 게이트(D10 미갱신=범위 위반)를 잡아, `features.md` D10/F5와 `screens.md`를 **코드 전에** 갱신하도록 강제(exec-plan 2026-06-12 로그). 위임 없이 바로 구현했다면 결정-코드 드리프트 발생.
- **결정 추출 위임이 추측을 막음.** M2에서 planner가 DEC-A~E를 추출하고 DEC-A(저장소)/DEC-B(주기)를 **사람 결정 게이트**로 분리, 미결정 상태 구현 착수를 금지. 추측 기반 구현 0건.
- **qa 위임이 PR 머지 전 결함 포착.** M3에서 qa가 'F5.3 필터 초기화 비활성' Minor 결함을 머지 전 검출→PR 내 수정(PR #30).

**직접 처리가 적절했던 점:**
- 초소형 국소 수정(FilterBar isDefault 2줄류)은 풀 파이프라인이 과부하 → 메인 직접 처리 + CI green이 비용효율적이었다. 위임/직접 경계가 실무에서 동작.

**조정할 점(회고 이관):**
- "직접 처리" 임계의 명문 기준이 암묵적이었다 → `qa-gate-tiers.md §2`의 Fast/직접 처리 규칙으로 일부 흡수. 위임 비용(컨텍스트 전달 오버헤드) 대비 효과의 정량화는 9.3 측정틀로.

**판정:** 위임 정책은 v2에서 **유효하게 작동**. 큰 결정/기능=위임, 초소형=직접의 경계가 실효. **문서로 닫을 수 있음**(본 노트 + qa-gate-tiers).

### 9.2 QA 게이트 티어링 (#5)

정의·판정 기준·v2 적용 근거는 [`docs/process/qa-gate-tiers.md`](../process/qa-gate-tiers.md)로 고정. 요지: 큰 기능(M2/M3)=Deep(qa 풀 검증), 작은 버그(#22/#23, #24/#25)=Fast(E2E+CI). v2 적용 결과 과검증/과소검증 모두 회피.

**판정:** **문서로 닫을 수 있음.** 단 `.claude/` 에이전트 절차 반영은 사람 승인 필요(qa-gate-tiers §5 승인 요청 A1/A2).

### 9.3 하네스 ROI (#7)

완전한 with/without A/B 실험은 v2 단일 세션에서 불가(동일 작업을 양쪽으로 두 번 수행하지 않음). 따라서 **관찰 기반 정성 평가 + 향후 측정틀**을 제시한다. 추측 수치는 쓰지 않는다.

**v2에서 실제 관측된 정량 신호(오케스트레이션 有):**
| 신호 | 관측값 | 출처 |
|---|---|---|
| E2E가 발견한 결함 | 5건(#21~#25) | M1 E2E 도입 직후 검출, exec-plan 로그 |
| 그중 P0 차단요소 | 1건(#21 다중지역 병합 누락) | F-2 착수 전 차단, route.ts 재작성으로 해소 |
| qa가 머지 전 잡은 경계면/결정 결함 | M2·M3 각 1건(멱등성 관측·F5.3 충돌) | PR #27/#30 qa 판정 |
| docs-우선이 막은 범위 이탈 | 1건(D10 미갱신 검색 착수) | R1 게이트, exec-plan |
| CI가 잡은 로컬 미검출 | 1건(Node 25 lint 비호환을 CI Node 고정으로 통과 판정) | PR #27 |

**정성 평가:** 오케스트레이션(docs-우선+결정 게이트+qa 티어)이 **결정-코드 드리프트와 범위 이탈을 사전 차단**하는 데 기여(R1 게이트, 병합 누락 선차단). 비용은 위임 시 컨텍스트 전달·exec-plan 유지보수 오버헤드.

**향후 측정틀(v0.2 1개 기능으로 실측 권장):**
- **A/B 근사:** 한 기능을 (a) 풀 파이프라인, (b) 직접 구현(직후 qa 사후검증)으로 나눠 *동일 기능군*의 인접 작업에 적용 → 비교.
- **수집 지표:** ① 머지 전 검출 결함 수, ② 머지 후 회귀(재오픈 이슈) 수, ③ 결정/범위 위반 건수, ④ 리드타임(착수→머지), ⑤ 재작업 횟수(PR push 수).
- **가설:** 오케스트레이션은 ②④를 낮추고(드리프트·재작업 감소) ①을 높인다(조기 검출). 초소형 작업에서는 ④ 오버헤드가 이득을 상쇄 → Fast/직접 경계의 타당성 검증.

**판정:** 완전 A/B는 **추가 작업 필요**(v0.2 기능 1개로 실측). 현재는 **관찰 노트 + 측정틀까지 문서로 고정**, 정량 A/B는 v0.2 이관.
