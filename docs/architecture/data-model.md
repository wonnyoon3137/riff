# Riff — 데이터 모델 (Data Model)

| 항목 | 내용 |
|---|---|
| 서비스명 | Riff (리프) |
| 버전 | v0.1 (MVP) |
| 작성일 | 2026-06-08 |
| 상태 | Draft |
| 기반 문서 | [`overview.md`](../../overview.md) · [`features.md`](../../features.md) · [`screens.md`](../product/screens.md) |
| 관련 문서 | [`kopis-integration.md`](../api/kopis-integration.md) · [`kopis-codes.md`](../api/kopis-codes.md) |

> 본 문서는 Riff v0.1의 **내부 도메인 모델**과 **상태 관리 스키마**를 정의한다. KOPIS 외부 응답을 내부 도메인 타입으로 정규화하는 경계, 공연장 마스터 데이터 동기화, 지역 다중 선택 병합, 무한 스크롤 상태 보존, URL 동기화 스키마를 포함한다.
>
> 표기: 코드는 TypeScript. KOPIS 응답 필드명은 외부 원본 그대로 표기하고 내부 도메인은 camelCase로 정규화한다. 추측이 위험한 KOPIS 코드값/필드는 단정하지 않고 "확인 필요"로 표기하며, 실제 검증은 [`kopis-codes.md`](../api/kopis-codes.md) / [`kopis-integration.md`](../api/kopis-integration.md)에서 수행한다.

---

## 목차

- 1. 설계 원칙
- 2. 도메인 엔티티 개요
- 3. 도메인 타입 정의 (TypeScript)
- 4. KOPIS 응답 → 도메인 매핑
- 5. 공연장 마스터 데이터 동기화 (D5)
- 6. 지역 다중 선택 병합 (D4)
- 7. 무한 스크롤 + 상태 보존 (D2 / D8)
- 8. URL 쿼리스트링 동기화 스키마
- 9. 기능/결정 매핑 (F1~F4 / D1~D10)
- 10. 미해결 / 확인 필요

---

## 1. 설계 원칙

1. **외부/내부 경계 분리.** KOPIS 응답 타입(`Kopis*`)과 내부 도메인 타입(`Performance`, `Venue`)을 분리한다. UI/화면은 **도메인 타입만** 사용하고, KOPIS 원형 타입은 BFF 정규화 레이어 안에서만 존재한다.
2. **자유 텍스트 원문 보존.** `prfcast`(출연진), `pcseguidance`(티켓가격) 등 KOPIS가 자유 텍스트로 주는 필드는 **v0.1에서 파싱하지 않고 원문 문자열을 그대로 보존**한다(∴ 기획서 Risk 2, features F3.1). 구조화는 v0.2 자체 인덱스 단계로 이관.
3. **null 안전.** KOPIS는 필드 누락/빈 문자열이 잦다. 도메인 타입에서 선택 필드는 `?`(optional) 또는 명시적 `null`로 표현하고, 정규화 시 빈 문자열은 `undefined`로 정리한다.
4. **단일 식별자.** 공연 식별자는 `mt20id`, 공연장 식별자는 `mt10id`를 내부 PK로 사용한다(KOPIS 키 그대로). 자체 PK를 새로 만들지 않는다(v0.1).
5. **v0.1 비저장 원칙.** 공연 데이터는 **저장하지 않고** 매 요청 시 KOPIS에서 조회(필요 시 캐시). **예외: 공연장 마스터(Venue, D5), 아티스트 마스터(Artist, v3), 사용자 계정(User/Account/Session, v5 P4)** 을 자체 DB에 저장. 이 자체 DB가 v0.2 자체 인덱스의 기반이 된다.

---

## 2. 도메인 엔티티 개요

| 엔티티 | 설명 | 출처 | 저장 |
|---|---|---|---|
| `Performance` | 공연. 목록 카드/상세의 핵심 엔티티 | KOPIS `pblprfr` 목록/상세 | 비저장(조회/캐시) |
| `PerformanceSummary` | 공연 목록 카드용 축약 뷰 | KOPIS 목록 | 비저장 |
| `Venue` | 공연장(공연시설) | KOPIS `prfplc` | **자체 DB 저장(D5)** |
| `BookingRelate` | 예매처 링크 (상세의 `relates[]`) | KOPIS 상세 `relates` | 비저장 |
| `IntroImage` | 소개 이미지 (상세 `styurls`) | KOPIS 상세 | 비저장 |
| `Artist` | 아티스트(출연자). 하이브리드 수집(prfcast 추출+MusicBrainz 매칭+수동 보정) | KOPIS prfcast + MusicBrainz | **자체 DB 저장(v3)** |
| `PerformanceArtist` | 공연↔아티스트 출연 관계 | prfcast 추출 파이프라인 | **자체 DB 저장(v3)** |
| `User` | 사용자 계정. 소셜 OAuth(카카오/구글) | Auth.js OAuth | **자체 DB 저장(v5)** |
| `Account` | OAuth provider 연결 정보 (Auth.js adapter) | Auth.js | **자체 DB 저장(v5)** |
| `Session` | 로그인 세션 (Auth.js adapter) | Auth.js | **자체 DB 저장(v5)** |
| `FilterState` | 사용자가 선택한 필터 상태 | 클라이언트 | URL/세션 |
| `ListState` | 목록 화면 복원용 상태(스크롤/페이지/필터) | 클라이언트 | 세션(채택안 §7) |

관계:
- `PerformanceSummary`(목록) → `Performance`(상세)는 동일 `mt20id`로 연결되는 **상세화 관계**(목록은 부분 필드, 상세는 전체 필드).
- `Performance` *—has many—* `BookingRelate`, `IntroImage`.
- `Performance` *—references—* `Venue`(공연장명/코드). v0.1에서 상세의 공연장 정보는 KOPIS 상세 응답값을 우선 사용하고, 필터용 공연장 마스터는 별도 `Venue` 테이블에서 관리.

---

## 3. 도메인 타입 정의 (TypeScript)

> 위치 권장: `src/domain/types.ts`. KOPIS 원형 타입은 `src/server/kopis/raw-types.ts`(BFF 내부 전용).

### 3.1 공연 상태 / 장르 / 지역 (열거형)

```ts
/** 공연 상태 (KOPIS prfstate). 라벨/코드 매핑은 kopis-codes.md 참조 */
export type PerformanceState = "UPCOMING" | "ONGOING" | "ENDED";
//  UPCOMING=공연예정, ONGOING=공연중, ENDED=공연완료

/** 장르 (KOPIS shcate 코드 ↔ 내부 enum). 코드값 확정: kopis-codes.md §2 (✅ 검증 완료) */
export type Genre =
  | "THEATER"        // 연극            shcate=AAAA
  | "DANCE"          // 무용(서양/한국)  shcate=BBBC
  | "POPULAR_DANCE"  // 대중무용         shcate=BBBE
  | "CLASSIC"        // 서양음악(클래식)  shcate=CCCA
  | "KOREAN_MUSIC"   // 한국음악(국악)   shcate=CCCC
  | "POPULAR_MUSIC"  // 대중음악         shcate=CCCD
  | "COMPLEX"        // 복합            shcate=EEEA
  | "CIRCUS_MAGIC"   // 서커스/마술      shcate=EEEB
  | "MUSICAL";       // 뮤지컬          shcate=GGGA
//  ※ KOPIS shcate에 "기타"는 없음(ETC 삭제). 목록/상세 응답은 genrenm(라벨)로 오므로 라벨→enum 매핑 사용.

/** 시도 코드 (KOPIS signgucode, 행정표준 앞2자리). 구군은 signgucodesub(앞4자리). 전체표: kopis-codes.md §3·§4 (✅) */
export type SidoCode = string;   // 예: "11"(서울특별시), "41"(경기도) ✅
export type GugunCode = string;  // 예: "1111"(서울 종로구) ✅
```

### 3.2 Performance (공연)

```ts
/** 목록 카드용 축약 뷰 (KOPIS pblprfr 목록 응답 기준) */
export interface PerformanceSummary {
  id: string;                 // mt20id
  title: string;              // prfnm
  posterUrl?: string;         // poster
  period: DateRange;          // prfpdfrom ~ prfpdto
  venueName: string;          // fcltynm
  area?: string;              // area (지역 표시용 문자열)
  genre?: Genre;              // genrenm/shcate → 내부 enum
  genreLabel: string;         // genrenm 원문(표시용)
  state: PerformanceState;    // prfstate
  openrun?: boolean;          // openrun "Y"/"N" → boolean (오픈런 여부, 확인 필요)
}

/** 상세 전체 (KOPIS pblprfr/{mt20id} 상세 응답 기준) */
export interface Performance extends PerformanceSummary {
  // 공연장 (✅ 상세 응답에 포함 확인)
  venueId?: string;           // mt10id (공연시설ID, 예 FC001431)
  hallId?: string;            // mt13id (공연장ID, 예 FC001431-01) — 참고
  venueAddress?: string;      // adres (※ 공연시설 상세 응답에만 존재 → 보강 필요)
  // 메타
  ageGuidance?: string;       // prfage (관람연령, 원문 보존)
  runtime?: string;           // prfruntime (러닝타임, 텍스트)
  timeGuidance?: string;      // dtguidance (공연 시간 안내, 원문 보존)
  firstRegDate?: string;      // frstregdt (최초등록일) — 참고
  // 자유 텍스트 — v0.1 파싱 안 함 (Risk 2)
  cast?: string;              // prfcast (출연진, 원문 보존) ✅
  crew?: string;              // prfcrew (제작진, 원문 보존) ✅
  story?: string;             // sty (줄거리, 원문 보존)
  priceGuidance?: string;     // pcseguidance (티켓가격, 원문 보존)
  // 제작/주최 정보
  producers?: ProducerInfo;
  // 콘텐츠
  introImages: IntroImage[];  // styurls
  bookings: BookingRelate[];  // relates[]
}

export interface DateRange {
  /** ISO yyyy-MM-dd 로 정규화 */
  from: string;  // prfpdfrom
  to: string;    // prfpdto
}

export interface ProducerInfo {
  main?: string;       // entrpsnm  (기획제작사 전체) ✅
  producer?: string;   // entrpsnmP (제작사) ✅
  planner?: string;    // entrpsnmA (기획사) ✅  ※ 정정: A=기획사
  host?: string;       // entrpsnmH (주최) ✅
  supervisor?: string; // entrpsnmS (주관) ✅  ※ 정정: S=주관
}

export interface IntroImage {
  url: string;         // styurls > styurl[] 항목 ✅
}

/** 예매처 링크 (KOPIS 상세 relates > relate[]) */
export interface BookingRelate {
  name?: string;       // relatenm (예매처명) ✅ ※ 정정: relatenmr 아님. optional(없는 항목 존재)
  url: string;         // relateurl (예매 URL) ✅
}
```

### 3.3 Venue (공연장 마스터 — 자체 DB)

```ts
/** 공연시설. KOPIS prfplc(시설 목록/상세)에서 사전 동기화하여 자체 DB에 저장 (D5) */
export interface Venue {
  id: string;            // mt10id (PK) ✅
  name: string;          // fcltynm (공연시설명) ✅
  sidoName?: string;     // sidonm  (시도 라벨, 예 "경북") ✅ 목록 응답
  gugunName?: string;    // gugunnm (구군 라벨, 예 "경주시") ✅ 목록 응답
  sidoCode?: SidoCode;   // ※ 응답에 코드 없음 → 라벨→코드 매핑으로 파생(kopis-codes.md §3)
  gugunCode?: GugunCode; // ※ 응답에 코드 없음 → 파생(kopis-codes.md §4)
  facilityChar?: string; // fcltychartr (시설특성 라벨, 예 "문예회관") ✅
  hallCount?: number;    // mt13cnt (공연장 수) ✅
  openYear?: string;     // opende (개관연도) ✅
  address?: string;      // adres (※ 공연시설 상세 응답에만 존재)
  lat?: number;          // la (위도, 상세에만) — v0.1 미사용(D7)
  lng?: number;          // lo (경도, 상세에만) — v0.1 미사용
  // 동기화 메타
  syncedAt: string;      // ISO datetime, 마지막 동기화 시각
}
```

### 3.4 필터 상태 / 목록 상태

```ts
/** 사용자 선택 필터 (UI 단일 진실원본). URL 쿼리와 1:1 동기화(§8) */
export interface FilterState {
  /** 월별: 프리셋 또는 직접 범위. 항상 정규화된 from/to를 가짐 */
  period: {
    preset: "THIS_MONTH" | "NEXT_MONTH" | "MONTH_AFTER" | "CUSTOM" | "DEFAULT_30D";
    range: DateRange;     // 실제 적용 범위(31일 이내로 보정됨, D3)
  };
  /** 지역: 다중 선택. 전국이면 빈 배열 또는 isNationwide=true (D4) */
  regions: RegionSelection[];
  isNationwide: boolean;  // true면 regions 무시(전국)
  /** 장르: 다중. 빈 배열 = 전체 장르 */
  genres: Genre[];
  /** 공연장: 단일(v0.1). 없으면 undefined */
  venueId?: string;
  /** 아티스트 필터: 단일 선택 (F8, v4 P3). 미선택 시 undefined */
  artistId?: string;
  /** 정렬 (F4) */
  sort: "START_ASC" | "START_DESC";
}

export interface RegionSelection {
  sidoCode: SidoCode;
  gugunCode?: GugunCode;  // 없으면 시도 전체
  label: string;          // 표시용 "서울" / "서울 강남구"
}

/** 목록 화면 복원용 상태 (D2/D8) — 보존 스키마는 §7 */
export interface ListRestoreState {
  filter: FilterState;    // 적용 필터 (URL로도 복원되지만 스냅샷 보관)
  scrollY: number;        // 픽셀 스크롤 위치
  loadedPages: number;    // 무한 스크롤로 로드된 페이지 수 (1-base)
  totalCount?: number;    // 마지막으로 알던 총 건수(표시용)
  savedAt: number;        // epoch ms (만료 판단용)
}
```

### 3.5 Artist (아티스트 마스터 — 자체 DB, v3 P2)

```ts
/** 아티스트 마스터 (자체 DB, v3 P2) */
export interface Artist {
  id: string;               // 자체 생성 ID (UUID 또는 auto-increment)
  name: string;              // 대표 이름 (정규화된 표기)
  aliases?: string[];        // 표기 변형 ("BTS", "방탄소년단", "防弾少年団")
  mbid?: string;             // MusicBrainz Artist ID (외부 식별자)
  matchConfidence?: number;  // 외부 API 매칭 신뢰도 (0~1)
  isManuallyVerified: boolean; // 수동 보정 완료 여부
  meta?: Record<string, unknown>; // 확장용 메타(이미지 URL 등, 후속)
  createdAt: string;         // ISO datetime
  updatedAt: string;         // ISO datetime
}

/** 공연↔아티스트 출연 관계 (자체 DB, v3 P2) */
export interface PerformanceArtist {
  mt20id: string;            // 공연 KOPIS ID (FK, 비저장 공연의 참조키)
  artistId: string;          // Artist.id (FK)
  rawExtract: string;        // prfcast에서 추출한 원문 발췌 (원문 보존 원칙)
  role?: string;             // 역할(배역) — 추출 가능 시
  extractedAt: string;       // ISO datetime
}
```

---

## 4. KOPIS 응답 → 도메인 매핑

> KOPIS 원형 응답은 XML이 기본이며 JSON 변환 사용 가능(상세는 [`kopis-integration.md`](../api/kopis-integration.md)). 아래 매핑은 **필드 의미 기준**이며, 일부 필드명/유무는 "확인 필요". 정규화 함수는 BFF 레이어(`src/server/kopis/normalize.ts`)에 둔다.

### 4.1 공연 목록 (`pblprfr` 목록) → `PerformanceSummary`

| 도메인 필드 | KOPIS 필드 | 정규화 규칙 |
|---|---|---|
| `id` | `mt20id` | 그대로 |
| `title` | `prfnm` | trim |
| `posterUrl` | `poster` | 빈 문자열 → undefined |
| `period.from/to` | `prfpdfrom`/`prfpdto` | `yyyy.MM.dd` → ISO `yyyy-MM-dd` |
| `venueName` | `fcltynm` | trim |
| `area` | `area` | 빈 → undefined |
| `genreLabel` | `genrenm` | 원문 |
| `genre` | `genrenm` | 라벨 → 내부 enum (목록 응답에 shcate 코드 없음. kopis-codes.md §2) ✅ |
| `state` | `prfstate` | 공연중→ONGOING, 공연예정→UPCOMING, 공연완료→ENDED ✅ |
| `openrun` | `openrun` | "Y"→true / "N"→false ✅ |

### 4.2 공연 상세 (`pblprfr/{mt20id}`) → `Performance`

| 도메인 필드 | KOPIS 필드 | 정규화 규칙 |
|---|---|---|
| (목록 공통 필드) | 위와 동일 | |
| `venueId` | `mt10id` | 상세 응답 포함 ✅ |
| `hallId` | `mt13id` | 공연장ID ✅ (참고) |
| `venueAddress` | `adres` | ※ 공연시설 **상세** 응답에만 존재 → 보강 |
| `ageGuidance` | `prfage` | **원문 보존** |
| `runtime` | `prfruntime` | 원문 |
| `timeGuidance` | `dtguidance` | **원문 보존** |
| `cast` | `prfcast` | **원문 보존(파싱 금지)** ✅ |
| `crew` | `prfcrew` | **원문 보존** ✅ |
| `story` | `sty` | **원문 보존**(줄바꿈 유지) |
| `priceGuidance` | `pcseguidance` | **원문 보존(파싱 금지)** |
| `producers.main/producer/planner/host/supervisor` | `entrpsnm`/`entrpsnmP`/`entrpsnmA`/`entrpsnmH`/`entrpsnmS` | ✅ (P=제작사·A=기획사·H=주최·S=주관) |
| `introImages[]` | `styurls.styurl` | 배열 정규화(단일/복수) ✅ |
| `bookings[]` | `relates.relate[]` | `{name?: relatenm, url: relateurl}` ✅ name optional |

> **자유 텍스트 원문 보존 대상(명시):** `prfcast`, `pcseguidance`, `prfage`, `dtguidance`, `sty`, `prfruntime`. v0.1은 이들을 가공 없이 문자열로 전달하고 UI에서 그대로(줄바꿈 보존) 노출한다.

### 4.3 공연시설 (`prfplc` 목록/상세) → `Venue`

| 도메인 필드 | KOPIS 필드 | 정규화 규칙 |
|---|---|---|
| `id` | `mt10id` | PK ✅ |
| `name` | `fcltynm` | trim ✅ |
| `sidoName` | `sidonm` | 시도 라벨(목록 응답) ✅ |
| `gugunName` | `gugunnm` | 구군 라벨(목록 응답) ✅ |
| `sidoCode`/`gugunCode` | (응답에 없음) | 라벨→코드 매핑으로 파생(kopis-codes.md §3·§4) |
| `facilityChar` | `fcltychartr` | 라벨(예 문예회관) ✅ |
| `hallCount` | `mt13cnt` | 숫자 변환 ✅ |
| `openYear` | `opende` | 개관연도 ✅ |
| `address` | `adres` | ※ **상세 응답에만** 존재 ✅ |
| `lat/lng` | `la`/`lo` | 상세에만. 숫자 변환, v0.1 미사용 ✅ |

### 4.4 정규화 함수 시그니처 (참고)

```ts
// src/server/kopis/normalize.ts
export function toPerformanceSummary(raw: KopisPblprfrListItem): PerformanceSummary;
export function toPerformance(raw: KopisPblprfrDetail): Performance;
export function toVenue(raw: KopisPrfplcItem): Venue;

// 공통 헬퍼
function emptyToUndef(v?: string): string | undefined;        // "" → undefined
function kopisDateToISO(v: string): string;                   // "2026.06.10" → "2026-06-10"
function toState(prfstate: string): PerformanceState;         // 라벨→enum: 공연예정/공연중/공연완료 ✅
function toGenre(genrenm: string, shcate?: string): Genre | undefined;
```

---

## 5. 공연장 마스터 데이터 동기화 (D5)

> ∴ D5(공연장 마스터 사전 동기화), features F2.4. 목적: 공연장 필터 자동완성을 KOPIS 실시간 호출 없이 자체 DB로 빠르게 제공하고, v0.2 자체 인덱스의 기반을 만든다.

### 5.1 데이터 흐름

```
[스케줄러] ──(주기 실행)──▶ KOPIS prfplc 목록 조회(페이지네이션 전량)
     │                              │
     │                              ▼
     │                       toVenue() 정규화
     │                              │
     ▼                              ▼
 (초기 1회 일괄)            자체 DB venues 테이블 upsert(mt10id 기준)
                                    │
                                    ▼
                  공연장 자동완성 API(BFF)가 venues에서 조회 → S1 필터
```

### 5.2 저장 구조 (자체 DB)

`venues` 테이블(또는 동등 컬렉션):

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` (PK) | string | mt10id |
| `name` | string | 검색 대상(인덱스) |
| `name_normalized` | string | 검색용 정규화(공백/대소문자 제거) — 자동완성 매칭 |
| `area` | string | |
| `sido_name` | string | sidonm 라벨(목록 응답) |
| `gugun_name` | string | gugunnm 라벨(목록 응답) |
| `sido_code` | string | nullable. 라벨→코드 파생(kopis-codes.md §3) |
| `gugun_code` | string | nullable. 파생 |
| `address` | string | nullable (상세 응답에서 보강) |
| `lat` / `lng` | number | nullable, v0.1 미사용 |
| `synced_at` | datetime | 마지막 동기화 |

인덱스: `name_normalized`(자동완성 prefix/contains 검색), `id` unique.

### 5.3 동기화 방식

- **초기 1회 일괄 fetch:** prfplc 목록을 끝까지 페이지네이션하며 전량 upsert.
- **주기 갱신:** 스케줄 빈도는 **확인 필요**(후보: 주 1회). 공연장은 변동이 드물어 일/주 단위로 충분. 갱신 시 전량 재fetch upsert(소규모이므로 단순 전량 동기화 채택, delta 동기화는 v0.2).
- **삭제 처리:** v0.1은 hard delete 미적용(KOPIS에서 사라진 시설도 유지). 필요 시 `is_active` 플래그는 v0.2.

### 5.4 자동완성 조회 API (요약)

`GET /api/venues?q={keyword}` → `venues`에서 `name_normalized LIKE %q%` 상위 N개(예 20) 반환. 상세 설계는 [`kopis-integration.md`](../api/kopis-integration.md) §BFF.

---

## 5.5 아티스트 마스터 데이터 (v3 P2)

> Venue 선례(§5)와 동일한 구조. 목적: 상세 페이지 아티스트 칩 표시(F7)의 데이터 토대를 구축하고, 후속 아티스트 필터(P3)의 기반을 만든다.

### 5.5.1 데이터 흐름

```
[prfcast 추출 파이프라인] ──▶ prfcast 원문에서 아티스트명 추출
         │
         ▼
[MusicBrainz 매칭] ──▶ 추출된 이름으로 MusicBrainz API 조회, mbid + 신뢰도 획득
         │
         ▼
[수동 보정] ──▶ 매칭 신뢰도 낮은 항목 수동 검증/보정
         │
         ▼
artists 테이블 upsert (name 기준 중복 판별)
performance_artists 테이블 upsert (mt20id + artist_id 기준)
```

### 5.5.2 저장 구조 (자체 DB)

**`artists` 테이블:**

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` (PK) | string | 자체 생성 ID (UUID 또는 auto-increment) |
| `name` | string | 대표 이름 (정규화 표기). 인덱스 |
| `aliases` | JSON | 표기 변형 배열. nullable |
| `mbid` | string | MusicBrainz Artist ID. nullable |
| `match_confidence` | number | 외부 API 매칭 신뢰도 (0~1). nullable |
| `is_manually_verified` | boolean | 수동 보정 완료 여부. default false |
| `created_at` | datetime | 생성 시각 |
| `updated_at` | datetime | 최종 갱신 시각 |

인덱스: `name`(검색), `mbid` unique nullable, `id` unique.

**`performance_artists` 테이블:**

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `mt20id` + `artist_id` (composite PK) | string, string | 공연 KOPIS ID + Artist.id |
| `raw_extract` | string | prfcast에서 추출한 원문 발췌 (원문 보존 불변) |
| `role` | string | 역할(배역). nullable |
| `extracted_at` | datetime | 추출 시각 |

### 5.5.3 동기화 방식

- **upsert 멱등:** Venue sync 선례와 동일. 동일 아티스트(name 기준)가 이미 존재하면 갱신, 없으면 삽입.
- **prfcast 원문 보존 불변:** 추출은 별도 `performance_artists` 테이블에 사본(`raw_extract`)으로 적재. 원본 `prfcast` 필드는 기존대로 `Performance.cast`에 원문 보존(§1.2 원칙 유지).
- **매칭 파이프라인:** prfcast 추출 → MusicBrainz 매칭 → 수동 보정의 3단계. 각 단계는 독립 실행 가능(부분 실행 허용).

---

## 6. 지역 다중 선택 병합 (D4)

> ∴ D4(지역 다중 선택 허용), features F2.2. 제약: **KOPIS API는 단일 지역 코드만 수용**. 따라서 다중 선택은 클라이언트가 아닌 **BFF에서 병렬 호출 후 병합**한다.

### 6.1 처리 모델

```
FilterState.regions = [서울, 경기]  (isNationwide=false)
            │
            ▼  BFF /api/performances 가 수신
   ┌────────┴─────────┐
   ▼                  ▼
KOPIS 호출(서울)   KOPIS 호출(경기)     ← 병렬 (Promise.all)
   │                  │
   └────────┬─────────┘
            ▼
   병합(merge) + 중복 제거(mt20id) + 정렬(FilterState.sort) + 페이지 슬라이스
            ▼
   PerformanceSummary[] 반환
```

### 6.2 병합 규칙

1. **중복 제거:** 동일 `mt20id`는 1건으로(같은 공연이 여러 지역 코드에 잡히는 경우 방지).
2. **정렬:** 병합 후 `sort` 기준으로 재정렬(시작일 ASC/DESC). KOPIS 자체 정렬은 신뢰하지 않음(∴ F4, 클라이언트/BFF 정렬).
3. **페이지네이션 일관성:** 다중 지역 병합 시 **페이지 경계가 어긋나는 문제**가 있다. v0.1 채택:
   - 각 지역에 대해 동일 페이지(cpage) 범위를 요청하기 어렵기 때문에, **BFF가 "필요한 페이지까지" 각 지역을 충분히 fetch → 병합 → 전체에서 30개씩 슬라이스**하는 방식.
   - 단순화를 위해 v0.1은 **지역별 cpage를 함께 증가**시키고 병합 결과를 정렬·슬라이스. 경계 정확성의 미세 오차는 허용(확인 필요: 부하/정확도 검증).
4. **전국 처리:** `isNationwide=true`면 지역 코드 없이 단일 호출(병합 불필요).

### 6.3 부하/캐싱 고려

다중 지역 = 호출 N배. BFF 캐싱(§ kopis-integration.md)으로 완화. 선택 지역 조합 + 필터 + 페이지를 캐시 키로.

---

## 7. 무한 스크롤 + 상태 보존 (D2 / D8)

> ∴ D2(무한 스크롤), D8(뒤로가기 시 스크롤+페이지수+필터 보존), features F1.2/F3.3.

### 7.1 보존해야 할 상태 (재확인)

목록(S1)에서 상세(S2)로 갔다가 **뒤로가기**로 돌아올 때 복원 대상:
1. 적용 필터 (`FilterState`) — URL 쿼리로도 복원 가능하나 스냅샷 보관.
2. 스크롤 위치 (`scrollY`).
3. 로드된 페이지 수 (`loadedPages`) — 예: 3페이지(90개)까지 로드돼 있었으면 복귀 시 동일하게 90개 렌더 후 scrollY로.

스키마: `ListRestoreState`(§3.4).

### 7.2 트레이드오프 비교

| 기준 | (A) sessionStorage | (B) React Query 캐시(+window.history state) |
|---|---|---|
| 데이터(카드 90개) 재렌더 | 캐시 없으면 **재요청 필요**(스크롤/페이지수만 저장) | 페이지별 응답이 **캐시에 남아 즉시 복원**, 재요청 없음 |
| 구현 복잡도 | 낮음(상태 객체 직렬화) | 중간(queryKey 설계 + infinite query + 스크롤 복원 훅) |
| 새로고침(F5) 후 | 살아있음(세션 동안) | 메모리 캐시는 휘발(persist 안 하면 사라짐) |
| 뒤로가기 UX | 데이터 재요청 시 깜빡임 가능 | 즉시 복원, 가장 매끄러움 |
| 메모리 | 작음 | 페이지 누적 시 증가(상한 관리 필요) |
| 서버 부하 | 복귀마다 재조회 가능 | 캐시 hit로 절감 |
| URL 공유 | 필터는 URL에 있어 OK | 동일 |

### 7.3 v0.1 채택안 (확정)

**채택: (B) React Query `useInfiniteQuery` 캐시 + 스크롤 위치 복원을 sessionStorage 병행.**

근거:
- 무한 스크롤로 누적된 페이지를 **재요청 없이 즉시 복원**하는 것이 D8의 UX 목표("스크롤 위치 + 로드된 페이지 수 보존")에 가장 부합.
- `useInfiniteQuery`의 `queryKey = ["performances", normalizedFilter]`로 두면, 같은 필터로 복귀 시 누적 페이지가 그대로 캐시에서 복원됨.
- 다만 **스크롤 위치(scrollY)** 는 React Query가 관리하지 않으므로, 라우트 이탈 시 `scrollY`를 sessionStorage(또는 history state)에 저장하고 복귀 시 페이지 렌더 완료 후 `scrollTo`로 복원.
- 캐시 상한: `gcTime`(구 cacheTime) 적정값 설정. 페이지 누적이 과도하면 상한 페이지 수 제한(확인 필요).

채택 스키마 저장 위치:
- `FilterState` → **URL 쿼리스트링**(단일 진실원본, §8).
- 누적 페이지 데이터 → **React Query 캐시**(queryKey = 정규화 필터).
- `scrollY`, `loadedPages`(보조) → **sessionStorage** 키 `riff:list:{filterHash}`.

```ts
// 스크롤 복원 훅 개략
function useListScrollRestore(filterHash: string) {
  // 이탈 시: sessionStorage.setItem(`riff:list:${filterHash}`, JSON.stringify({ scrollY, loadedPages, savedAt }))
  // 복귀 시: 페이지 렌더 후 window.scrollTo(0, saved.scrollY)
}
```

> 참고: deep link로 특정 페이지 복원은 미지원(∴ F1.2, 페이지 번호 URL 미포함). 직접 URL 진입 시 항상 1페이지부터.

---

## 8. URL 쿼리스트링 동기화 스키마

> ∴ features F1.2/F2.5(필터 URL 반영, 공유·북마크). 페이지 번호는 **미포함**.

### 8.1 매핑 표

| FilterState 경로 | 쿼리 파라미터 | 형식 | 예시 |
|---|---|---|---|
| `period.preset` | `period` | enum | `period=next_month` |
| `period.range.from` | `from` | yyyy-MM-dd | `from=2026-07-01` |
| `period.range.to` | `to` | yyyy-MM-dd | `to=2026-07-31` |
| `regions[]` | `region` | csv of `sido[:gugun]` | `region=11,41:4111` |
| `isNationwide` | (region 생략 또는 `region=all`) | — | 전국이면 region 파라미터 없음 |
| `genres[]` | `genre` | csv enum | `genre=musical,theater` |
| `venueId` | `venue` | string(mt10id) | `venue=FC001234` |
| `sort` | `sort` | enum | `sort=start_asc` |
| `artistId` | `artist` | string(Artist.id) | `artist=42` |

전체 예시:
```
/?period=custom&from=2026-07-01&to=2026-07-31&region=11,41&genre=musical&sort=start_asc
```

### 8.2 규칙

1. **디폴트는 생략.** 디폴트(30일·전국·전체 장르·start_asc·아티스트 미선택)와 같은 값은 URL에 쓰지 않아 URL을 깔끔하게(∴ D1). 즉 빈 `/`는 디폴트 상태. 아티스트 미선택 시 `artist` 파라미터 생략.
2. **period 우선순위:** `preset=custom`이면 `from`/`to` 사용. 프리셋이면 BFF/클라이언트가 프리셋→범위를 계산(서버 시간 기준), `from`/`to`는 생략 가능. 단 **공유 안정성**을 위해 프리셋이어도 계산된 `from`/`to`를 함께 기록하는 것을 권장(확인 필요: 프리셋 vs 절대범위 정책).
3. **31일 제약 반영(D3):** URL의 `from`/`to`가 31일을 초과하면 진입 시 보정 + 토스트.
4. **파싱 실패 안전:** 알 수 없는/잘못된 값은 무시하고 디폴트로 폴백.
5. **단일 진실원본:** UI 상태 변경 → URL `replaceState` 갱신(히스토리 오염 방지, debounce 300ms ∴ D6). 뒤로가기/공유 진입 → URL → `FilterState` 복원.

### 8.3 직렬화/역직렬화 시그니처

```ts
// src/domain/filter-url.ts
export function filterToQuery(f: FilterState): URLSearchParams;   // 디폴트는 생략
export function queryToFilter(q: URLSearchParams): FilterState;   // 폴백/보정 포함(31일 등)
export function filterHash(f: FilterState): string;               // 캐시/세션 키용 안정 해시
```

---

## 9. 기능/결정 매핑 (F1~F4 / D1~D10)

| ID | 항목 | 본 문서 반영 |
|---|---|---|
| F1 | 공연 목록 탐색 | §3.2 PerformanceSummary, §4.1 매핑 |
| F2 | 필터링 | §3.4 FilterState, §6 지역 병합, §8 URL |
| F3 | 공연 상세 | §3.2 Performance, §4.2 매핑(원문 보존) |
| F4 | 정렬 | FilterState.sort, §6.2 병합 후 정렬 |
| F8 | 아티스트 필터 | §3.4 FilterState.artistId, §8.1 URL artist, §8.2-1 디폴트 생략 |
| D1 | 디폴트 30일·전국·전체·아티스트 미선택 | §8.2-1 디폴트 생략 |
| D2 | 무한 스크롤 | §7 채택안(useInfiniteQuery) |
| D3 | 31일 제한 | §3.4 period.range 보정, §8.2-3 |
| D4 | 지역 다중 선택 | §6 BFF 병렬 호출+병합 |
| D5 | 공연장 사전 동기화 | §5 Venue 마스터 |
| D6 | 즉시 반영(debounce 300) | §8.2-5 |
| D7 | 지도 제외 | §3.3 lat/lng 저장만, 미사용 |
| D8 | 뒤로가기 상태 보존 | §7 ListRestoreState + 채택안 |
| D9 | 정렬 옵션 | FilterState.sort |
| D10 | 검색 v0.1 제외 | 도메인에 검색 인덱스 미포함 |

---

## 10. 미해결 / 확인 필요

> KOPIS 필드명·코드값은 2026-06-08 공식 명세로 **검증 완료**(✅). 정정 내역은 [`kopis-integration.md`](../api/kopis-integration.md) §10, 코드표는 [`kopis-codes.md`](../api/kopis-codes.md) 참조.

### 검증으로 해소(✅)
- KOPIS 필드명: `mt10id`/`mt13id`(상세 포함), `relatenm`/`relateurl`(← `relatenmr` 오류 정정), `entrpsnm`/`entrpsnmP/A/H/S`(매핑 정정), `prfcrew`, `styurls>styurl[]`, `mt13cnt`, `la`/`lo`, `sidonm`/`gugunnm`.
- `prfstate` 라벨(공연예정/공연중/공연완료), `shcate` 장르 코드, `signgucode`/`signgucodesub` 체계 → kopis-codes.md 확정.

### 남은 결정/실측(설계·운영 사안)
- [ ] **공연장 동기화 주기**(주 1회 후보) 확정.
- [ ] **지역 다중 병합 페이지네이션** 정확도/부하 실측.
- [ ] **시설 시도/구군 코드 역매핑**(라벨→코드) 구현 방식.
- [ ] **URL period 정책**: 프리셋 저장 vs 절대범위(from/to) 저장.
- [ ] **React Query 캐시 상한/gcTime** 튜닝.
