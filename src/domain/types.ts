// ── 공연 상태 ──────────────────────────────────────────────
// KOPIS prfstate. 응답은 라벨("공연중"), 요청은 코드("02").
export type PerformanceState = "UPCOMING" | "ONGOING" | "ENDED";

// ── 장르 ──────────────────────────────────────────────────
// KOPIS shcate 코드 <-> 내부 enum. kopis-codes.md section 2 (verified)
export type Genre =
  | "THEATER" // 연극       AAAA
  | "DANCE" // 무용       BBBC
  | "POPULAR_DANCE" // 대중무용   BBBE
  | "CLASSIC" // 서양음악   CCCA
  | "KOREAN_MUSIC" // 한국음악   CCCC
  | "POPULAR_MUSIC" // 대중음악   CCCD
  | "COMPLEX" // 복합       EEEA
  | "CIRCUS_MAGIC" // 서커스/마술 EEEB
  | "MUSICAL"; // 뮤지컬     GGGA

// ── 지역 코드 ─────────────────────────────────────────────
export type SidoCode = string; // 행정표준 앞2자리, e.g. "11"
export type GugunCode = string; // 행정표준 앞4자리, e.g. "1111"

// ── 날짜 범위 ─────────────────────────────────────────────
export interface DateRange {
  from: string; // ISO yyyy-MM-dd
  to: string;
}

// ── 공연 목록 카드 ────────────────────────────────────────
export interface PerformanceSummary {
  id: string; // mt20id
  title: string; // prfnm
  posterUrl?: string; // poster
  period: DateRange; // prfpdfrom ~ prfpdto
  venueName: string; // fcltynm
  area?: string; // area
  genre?: Genre; // genrenm -> enum
  genreLabel: string; // genrenm 원문
  state: PerformanceState; // prfstate
  openrun?: boolean; // openrun Y/N -> boolean
}

// ── 제작 정보 ─────────────────────────────────────────────
export interface ProducerInfo {
  main?: string; // entrpsnm
  producer?: string; // entrpsnmP (제작사)
  planner?: string; // entrpsnmA (기획사)
  host?: string; // entrpsnmH (주최)
  supervisor?: string; // entrpsnmS (주관)
}

// ── 소개 이미지 ───────────────────────────────────────────
export interface IntroImage {
  url: string; // styurls > styurl
}

// ── 예매처 링크 ───────────────────────────────────────────
export interface BookingRelate {
  name?: string; // relatenm (optional)
  url: string; // relateurl
}

// ── 공연 상세 ─────────────────────────────────────────────
export interface Performance extends PerformanceSummary {
  venueId?: string; // mt10id
  hallId?: string; // mt13id
  venueAddress?: string; // adres (시설 상세에서 보강)
  ageGuidance?: string; // prfage (원문 보존)
  runtime?: string; // prfruntime
  timeGuidance?: string; // dtguidance (원문 보존)
  cast?: string; // prfcast (원문 보존)
  crew?: string; // prfcrew (원문 보존)
  story?: string; // sty (원문 보존)
  priceGuidance?: string; // pcseguidance (원문 보존)
  producers?: ProducerInfo;
  introImages: IntroImage[];
  bookings: BookingRelate[];
  matchedArtists?: MatchedArtist[]; // v3 F7: BFF에서 매칭된 출연 아티스트
}

// ── 공연장(Venue) ─────────────────────────────────────────
export interface Venue {
  id: string; // mt10id (PK)
  name: string; // fcltynm
  sidoName?: string; // sidonm
  gugunName?: string; // gugunnm
  sidoCode?: SidoCode; // 라벨->코드 파생
  gugunCode?: GugunCode;
  facilityChar?: string; // fcltychartr (라벨)
  hallCount?: number; // mt13cnt
  openYear?: string; // opende
  address?: string; // adres (상세에서만)
  lat?: number; // la  (v0.1 미사용)
  lng?: number; // lo  (v0.1 미사용)
  syncedAt: string; // ISO datetime
}

// ── 필터 상태 ─────────────────────────────────────────────
export type PeriodPreset =
  | "THIS_MONTH"
  | "NEXT_MONTH"
  | "MONTH_AFTER"
  | "CUSTOM"
  | "DEFAULT_30D";

export type SortOrder = "START_ASC" | "START_DESC";

export interface RegionSelection {
  sidoCode: SidoCode;
  gugunCode?: GugunCode;
  label: string;
}

export interface FilterState {
  period: {
    preset: PeriodPreset;
    range: DateRange;
  };
  regions: RegionSelection[];
  isNationwide: boolean;
  genres: Genre[];
  venueId?: string;
  sort: SortOrder;
  searchTerm?: string; // 공연명 검색 (KOPIS shprfnm). trim 후 2자 미만이면 미전송 (F5)
}

// ── 목록 복원 상태 ────────────────────────────────────────
export interface ListRestoreState {
  filter: FilterState;
  scrollY: number;
  loadedPages: number;
  totalCount?: number;
  savedAt: number; // epoch ms
}

// ── 아티스트 (v3 P2) ─────────────────────────────────────
/** 아티스트 마스터 (자체 DB, data-model §3.5 / §5.5) */
export interface Artist {
  id: string; // auto-increment (SQLite INTEGER → string으로 노출)
  name: string; // 대표 이름 (정규화된 표기)
  aliases?: string[]; // 표기 변형 ("BTS", "방탄소년단")
  mbid?: string; // MusicBrainz Artist ID
  matchConfidence?: number; // 외부 API 매칭 신뢰도 (0~1)
  isManuallyVerified: boolean; // 수동 보정 완료 여부
  meta?: Record<string, unknown>; // 확장용 메타
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

/** 공연<->아티스트 출연 관계 (자체 DB, data-model §3.5 / §5.5) */
export interface PerformanceArtist {
  mt20id: string; // 공연 KOPIS ID
  artistId: string; // Artist.id
  rawExtract: string; // prfcast에서 추출한 원문 발췌
  role?: string; // 역할(배역)
  extractedAt: string; // ISO datetime
}

// ── 매칭 아티스트 (BFF 상세 응답용, v3 F7) ──────────────
/** BFF 상세 응답에 포함되는 매칭된 아티스트 정보 */
export interface MatchedArtist {
  id: string;
  name: string;
  role?: string;
  rawExtract: string;
}

// ── BFF 응답 ──────────────────────────────────────────────
export interface PerformanceListResponse {
  items: PerformanceSummary[];
  page: number;
  rows: number;
  hasNext: boolean;
  totalApprox?: number;
  adjusted?: { reason: "RANGE_31D" };
}
