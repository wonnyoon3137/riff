# Exec Plan 0001 — 프로젝트 부트스트랩

| 항목 | 내용 |
|---|---|
| 상태 | active (Phase A·B 완료, Phase C 대기) |
| 작성일 | 2026-06-08 |
| 담당 | planner → backend-dev / frontend-dev → qa-engineer |

> 실행 계획은 일급 산출물이다(OpenAI harness 원칙). 진행/완료/의사결정 로그를 이 파일에 누적한다.

## 목표
빈 레포에 Next.js 앱을 스캐폴딩하고, 도메인 타입·BFF·S1/S2 화면의 뼈대를 세워 "다음 달 서울 뮤지컬 탐색 → 상세 → 뒤로가기 복원" 핵심 플로우를 동작시킨다.

## ⛔ 체크포인트 — Phase C 전에 반드시 멈춤 (사람 개입)
**Phase A·B(스캐폴딩·도메인·BFF)는 연속 진행한다. 그러나 Phase C(화면 구현 = 마크업)는 시작하지 않는다.**
사용자(혜원)가 Figma 와이어프레임을 직접 만든 뒤 진행하기로 했다. Phase B 완료 시점에 **멈추고 사용자에게 알린 뒤, 명시적 승인(또는 와이어프레임 전달)을 받기 전까지 Phase C에 착수하지 않는다.** 와이어프레임이 준비되면 그것과 `docs/product/screens.md`를 함께 보고 Phase C를 진행한다.

## 관련 결정
D1~D10 전체. 특히 D1(디폴트), D2(무한스크롤), D3(31일), D4(지역 병합), D6(debounce), D8(상태 복원).

## 작업 분해

### Phase A — 스캐폴딩 (backend-dev 주도)
1. `pnpm create next-app`(App Router, TS, ESLint) 또는 수동 스캐폴딩. `package.json` 스크립트 정합.
2. 의존성 설치: `@tanstack/react-query`, `fast-xml-parser`, `zod`, 테스트(vitest, playwright).
3. `.env.local` 구성(`.env.example` 기반), KOPIS 서비스키 주입.
4. 폴더 골격: `src/domain`, `src/server/kopis`, `src/server/venues`, `src/app/api`, `src/components`.

### Phase B — 도메인 + BFF (backend-dev)
5. `src/domain/types.ts`(data-model §3), `kopis-codes.ts`(✅ 검증값만), `filter-url.ts`(§8).
6. `src/server/kopis/{client,parse-xml,raw-types,normalize,merge}.ts`(kopis-integration 스킬).
7. Route Handler: `/api/performances`, `/api/performances/[mt20id]`, `/api/venues`.
8. 단위 테스트: 정규화(원문 보존), 병합(중복제거/정렬), 31일 보정, URL 라운드트립.

### Phase C — 화면 (frontend-dev) ⛔ 시작 전 사람 승인 필요(상단 체크포인트 참조: Figma 와이어프레임 선행)
9. React Query Provider, `useInfiniteQuery` 목록 훅, 스크롤 복원 훅.
10. S1: 상단바/필터바(월·지역·장르·공연장)/정렬/카드 그리드/무한스크롤/상태(로딩·빈·에러).
11. S2: 포스터/정보/예매처 버튼/갤러리, 뒤로가기 복원.
12. Material 3 토큰 적용(색/타이포), 반응형(1440/375), 접근성.

### Phase D — 검증 (qa-engineer)
13. 경계면 교차 비교(API 응답 ↔ 훅). D1~D10 감사. 미검증 코드 하드코딩 0 확인.
14. e2e: 핵심 플로우 1개 + 에러 플로우 1개.

## 완료 기준
- `pnpm typecheck && pnpm lint && pnpm test` 그린, 핵심 e2e 통과.
- 핵심 플로우(필터→목록→상세→뒤로가기 복원) 동작.
- docs와 구현 일치.

## 리스크
- KOPIS rate limit 미검증(Risk 3) → 캐싱/동시성 상한으로 완화, 실측.
- 지역 다중 병합 페이지네이션 정확도 → 실측 후 방식 확정.
- 구군 전체 코드 데이터화 필요(kopis-codes §4).

## 진행 로그
- 2026-06-09 Phase A 완료: pnpm install, tsconfig/next.config/vitest.config/eslint 설정, 폴더 골격(src/domain, src/server/kopis, src/app/api, src/components), 기본 layout/page.
- 2026-06-09 Phase B 완료:
  - domain: types.ts(모든 도메인 타입), kopis-codes.ts(장르/상태/시도 코드 매핑, verified), filter-url.ts(FilterState<->URL 직렬화, 31일 보정)
  - server/kopis: raw-types.ts, parse-xml.ts(fast-xml-parser, 단일/배열 정규화), client.ts(타임아웃+재시도), normalize.ts(정규화, 원문 보존), merge.ts(중복제거+정렬+슬라이스)
  - Route Handlers: /api/performances(목록, 다중지역 병합), /api/performances/[mt20id](상세), /api/venues(스텁)
  - 테스트 33개 통과: normalize, merge, filter-url round-trip, parse-xml
  - typecheck + lint + test 전부 그린

## 의사결정 로그
- 2026-06-08: 하네스 구조 채택(OpenAI 목차+docs / revfactory agents·skills). KOPIS 코드값 공식 검증 완료 반영.
- 2026-06-09: /api/venues는 자체 DB 연동 전까지 스텁으로 빈 결과 반환(D5 동기화는 DB 선정 후 구현).
