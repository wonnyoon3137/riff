# Riff — AGENTS.md

> 이 파일은 **백과사전이 아니라 목차(map)** 다. 상세는 `docs/`를 따라가라.
> 작업 전 관련 문서를 먼저 읽고, 결정이 바뀌면 코드보다 문서를 먼저 고친다.
> (원칙 출처: OpenAI harness engineering — AGENTS.md ~100줄 목차 + docs/ 기록 시스템)

## 프로젝트 한 줄
Riff: 인터넷에 흩어진 공연 정보를 한 화면에서 탐색하는 서비스. v0.1은 KOPIS 기반 목록·필터·상세.

## 기술 스택
- Next.js(App Router, TypeScript) · React Query(무한 스크롤/캐시)
- BFF: Next Route Handler (KOPIS 호출·XML 파싱·정규화·지역 병합·캐싱)
- 디자인 시스템: Material 3 (Figma: Material 3 Design Kit)
- 데이터: KOPIS Open API + 자체 DB(공연장 마스터만)

## 문서 지도 — 먼저 읽어라 (system of record)
- 기획 — `docs/product/overview.md` (배경/타겟/범위/리스크)
- 기능 — `docs/product/features.md` (F1~F4, 의사결정 **D1~D10 = SSOT**)
- 화면 — `docs/product/screens.md` (S1 메인, S2 상세, 상태/반응형/M3 매핑)
- 데이터 — `docs/architecture/data-model.md` (도메인 타입/상태보존/URL 스키마)
- 아키텍처 — `ARCHITECTURE.md` (레이어링·의존 방향)
- 하네스 — `docs/architecture/harness.md` (에이전트/스킬 설계 근거)
- API — `docs/api/kopis-integration.md` (4개 엔드포인트/BFF/시퀀스, ✅검증)
- 코드값 — `docs/api/kopis-codes.md` (장르/지역/상태 코드, ✅검증)
- 계획 — `docs/exec-plans/active/` (진행 중), `completed/`, `tech-debt-tracker.md`

## 핵심 결정 — 어기지 말 것 (출처 features.md D1~D10)
- D1 디폴트: 오늘부터 30일·전국·전체 장르 / D9 정렬: 시작일 가까운·먼 순
- D2 무한 스크롤 / D8 뒤로가기 상태 보존(스크롤+페이지수+필터)
- D3 월 범위 31일 제한(**KOPIS API 강제**, resultCode 05) / D4 지역 다중→BFF 병렬 병합
- D5 공연장 마스터 사전 동기화(KOPIS prfplc) / D6 필터 즉시 반영(debounce 300ms)
- D7 상세 지도 제외 / D10 검색 v0.2 이관

## 불변 규칙 (기계적 강제 대상 — ARCHITECTURE.md/린터)
- KOPIS 서비스키는 **서버 전용**. 브라우저에서 KOPIS 직접 호출 금지.
- 경계에서 데이터 파싱: KOPIS 원형(XML)은 BFF에서 도메인 타입으로 정규화. UI는 도메인 타입만.
- 자유 텍스트(prfcast/pcseguidance/sty/prfage/dtguidance)는 v0.1 파싱 금지, 원문 보존.
- 색상/타이포는 M3 토큰만(하드코딩 hex 금지).
- 미검증 코드값 하드코딩 금지 — 확정값만 `src/domain/kopis-codes.ts`로.
- 외부 예매 링크: `target="_blank" rel="noopener noreferrer"`. 예매처명(relatenm) optional.

## 레이어 (도메인 내부, 단방향 — ARCHITECTURE.md 참조)
Types → Config → Repo → Service → Runtime(BFF) → UI.
교차 관심사(KOPIS client, cache, telemetry)는 Providers 인터페이스로만 유입.

## 에이전트 / 스킬 (.claude/)
- 에이전트: `.claude/agents/` — planner · frontend-dev · backend-dev · qa-engineer
- 스킬: `.claude/skills/` — orchestrator · nextjs-patterns · kopis-integration
- 누가=에이전트, 어떻게=스킬. 오케스트레이터가 순서/협업을 조율.

## 작업 방식
- 변경 전 관련 docs 읽기 → 결정 변경 시 features.md/docs 먼저 갱신.
- 계획은 일급 산출물: 비자명한 작업은 `docs/exec-plans/active/`에 실행계획 작성.
- 완료 기준 = `pnpm typecheck && pnpm lint && pnpm test` 그린(§ 피드백 루프).
- 중간 산출물은 `_workspace/`(gitignore), 최종만 커밋.

## 명령어
- 개발 `pnpm dev` · 빌드 `pnpm build`
- 타입 `pnpm typecheck` · 린트 `pnpm lint` · 테스트 `pnpm test` / `pnpm test:e2e`
- 공연장 동기화 `pnpm sync:venues`

## 디렉토리 빠른 지도
- `src/app` 화면/라우트(S1 `/`, S2 `/performances/[mt20id]`) + `api/`(BFF)
- `src/server` KOPIS client/normalize/merge/cache + venues
- `src/domain` 도메인 타입·필터-URL 직렬화·코드 매핑
- `src/components` M3 기반 UI
- `docs` 기록 시스템 · `.claude` 하네스 · `.github/workflows` CI

## 하지 말 것
- D1~D10에 어긋나는 구현, 문서 미갱신 상태의 결정 변경.
- 미검증 KOPIS 코드값으로 필터 하드코딩.
- 로그인/검색/지도 등 v0.1 범위 외 기능 임의 추가.
