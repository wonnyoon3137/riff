# Riff — ARCHITECTURE

> 도메인·레이어링의 최상위 맵. 상세 데이터 모델은 `docs/architecture/data-model.md`, API는 `docs/api/`.
> 이 문서의 규칙은 **기계적으로 강제**(커스텀 린트 + 구조 테스트)하는 것을 목표로 한다.
> (원칙 출처: OpenAI harness engineering — 엄격한 레이어·단방향 의존, 경계 파싱)

## 1. 비즈니스 도메인

v0.1은 단일 핵심 도메인이다.

| 도메인 | 책임 | 주요 화면 |
|---|---|---|
| `performances` | 공연 목록 탐색·필터·정렬·상세 (KOPIS pblprfr) | S1, S2 |
| `venues` | 공연장 마스터(자체 DB 동기화, KOPIS prfplc) | S1 공연장 필터 |

## 2. 레이어 (도메인 내부, 단방향)

각 도메인은 고정된 레이어를 따르며, 의존은 **아래→위 한 방향**만 허용한다.

```
Types  →  Config  →  Repo  →  Service  →  Runtime(BFF)  →  UI
```

| 레이어 | 역할 | 예 |
|---|---|---|
| Types | 도메인 타입·열거형(순수) | `src/domain/types.ts` |
| Config | 상수·코드 매핑·필터 직렬화 | `src/domain/kopis-codes.ts`, `filter-url.ts` |
| Repo | 외부 데이터 접근(KOPIS 호출, DB) | `src/server/kopis/*`, `src/server/venues/repo.ts` |
| Service | 정규화·병합·정렬·캐싱(비즈니스 규칙) | `src/server/kopis/normalize.ts`, `merge.ts` |
| Runtime(BFF) | Route Handler(요청/응답 경계) | `src/app/api/**/route.ts` |
| UI | React 컴포넌트·화면 | `src/app/(pages)`, `src/components` |

규칙:
- UI는 **도메인 타입(JSON)만** 소비한다. KOPIS 원형(XML/raw)을 절대 보지 않는다.
- 상위 레이어는 하위만 import. 역방향(예: Service→UI) 금지.
- 레이어 점프 최소화(예: UI가 Repo 직접 호출 금지 → Runtime 경유).

## 3. 교차 관심사 — Providers

레이어를 가로지르는 것(인증은 v0.1 없음, KOPIS 클라이언트, 캐시, 텔레메트리)은
**명시적 Providers 인터페이스**로만 유입한다. 그 외 경로는 금지.

```
Providers = { kopisClient, cache, (logger) }
   └─ Service/Runtime이 주입받아 사용. Repo가 직접 전역 fetch 금지.
```

## 4. 경계 파싱 (Parse, don't validate)

KOPIS 경계에서 원형 데이터를 **도메인 타입으로 파싱**한다(라이브러리 미지정, Zod 등 스키마 파싱 권장).
- 입력: KOPIS XML → `parse-xml` → raw 객체 → `normalize` → 도메인 타입.
- 빈 문자열/누락은 `undefined`로 정리. 날짜 `yyyy.MM.dd`→ISO.
- 자유 텍스트 필드는 파싱하지 않고 원문 보존(∴ data-model §1).

## 5. 데이터 흐름 (요약)

```
[Browser/UI] ──HTTPS──> [BFF Route Handler] ──HTTP──> [KOPIS Open API]
     ▲                        │  normalize/merge/cache
     │  도메인 타입 JSON        ▼
     └──────────────── [도메인 타입]      [자체 DB: venues] (D5 동기화)
```

- 지역 다중 선택(D4): BFF가 시도별 병렬 호출 → 병합·중복제거(mt20id)·정렬·슬라이스.
- 상태 보존(D8): 필터=URL 쿼리, 누적 페이지=React Query 캐시, scrollY=sessionStorage.

## 6. 기계적 강제(목표)

- 커스텀 ESLint 규칙: 레이어 의존 방향, KOPIS 직접호출 금지(클라이언트), 하드코딩 hex 금지, 미검증 코드 상수 금지.
- 구조 테스트: import 그래프 검사(상위→하위만), 도메인 타입 경계 노출 검사.
- 린트 에러 메시지에 **수정 지침**을 담아 에이전트 컨텍스트에 주입.

> 상세 타입/스키마: `docs/architecture/data-model.md`. KOPIS 명세: `docs/api/kopis-integration.md`.
