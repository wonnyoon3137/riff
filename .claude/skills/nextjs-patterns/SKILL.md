---
name: nextjs-patterns
description: "Riff의 Next.js(App Router) 구현 관례 스킬. Server/Client 경계, Route Handler(BFF) 작성, React Query useInfiniteQuery+스크롤 복원, URL 쿼리 동기화(replaceState+debounce), Material 3 적용, 로딩/빈/에러 바운더리를 정의. Riff에서 화면·BFF·데이터패칭 코드를 작성·수정할 때 반드시 이 스킬을 적용할 것."
---

# nextjs-patterns — Riff Next.js 관례

Riff 프론트엔드/BFF의 "어떻게"를 정의한다. 화면 명세는 `docs/product/screens.md`, 데이터는 `docs/architecture/data-model.md` 참조.

## 왜 이렇게 하는가
엄격한 경계와 예측 가능한 구조에서 에이전트가 가장 잘 동작한다. Server/Client 경계를 명확히 하고 데이터 패칭을 BFF로 모으면, UI는 도메인 타입만 다루게 되어 KOPIS 변경의 영향이 BFF에 격리된다.

## Server / Client 경계
- 데이터 패칭은 **서버/BFF 우선**. KOPIS 호출은 Route Handler(`src/app/api/**/route.ts`)에서만.
- 클라이언트 컴포넌트는 도메인 타입 JSON만 소비. `"use client"`는 상호작용 필요한 곳에만.
- 서비스키 등 비밀은 서버 전용. `NEXT_PUBLIC_` 금지.

## Route Handler(BFF)
- `/api/performances`: 필터/정렬/페이지 수신 → (지역 다중 시) 병렬 호출·병합 → 정규화 → 슬라이스 → `PerformanceListResponse`.
- `/api/performances/[mt20id]`: 상세 정규화(원문 보존).
- `/api/venues?q=`: 자체 DB 조회(KOPIS 미호출).
- 구현 규칙은 `kopis-integration` 스킬 참조.

## React Query — 무한 스크롤 + 상태 복원 (D2/D8)
- `useInfiniteQuery`, `queryKey = ["performances", normalizedFilter]`. 같은 필터로 복귀 시 누적 페이지가 캐시에서 즉시 복원.
- 스크롤 위치(scrollY)는 React Query가 관리 안 함 → 라우트 이탈 시 sessionStorage(`riff:list:{filterHash}`)에 저장, 복귀 시 렌더 후 `scrollTo`.
- 페이지 번호는 URL 미포함. deep link 특정 페이지 복원 미지원(F1.2).

## URL 쿼리 동기화 (F2.5/D6)
- 필터 변경 → `filterToQuery()` → `router.replace`(히스토리 오염 방지) + **debounce 300ms**.
- 진입/공유 → `queryToFilter()`(폴백·31일 보정 포함). 디폴트 값은 URL에서 생략.
- 직렬화 모듈: `src/domain/filter-url.ts`.

## Material 3 적용
- 색상은 M3 color role, 타이포는 M3 type scale(하드코딩 금지). 컴포넌트 매핑은 screens §7.
- 상태 색: 공연예정=primary-container, 공연중=secondary-container, 완료=surface-variant.

## 로딩 / 빈 / 에러 바운더리
- 최초 로드=스켈레톤 그리드, 추가 로드=하단 스피너, 빈=S1-E(+초기화), 에러=S1-X(+재시도). (screens §2.9)
- Suspense/error boundary로 상태를 컴포넌트 경계에 매핑.

## 접근성 / 성능 (NFR)
- 키보드 네비, 포커스 링(primary 2px), 포스터 alt(공연명), 헤딩 구조.
- 포스터 lazy-load, 첫 페이지 3초 이내 체감(스켈레톤).
