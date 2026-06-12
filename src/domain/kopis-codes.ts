import type { Genre, PerformanceState, SidoCode } from "./types";

// ── 장르: shcate 코드 <-> Genre enum (kopis-codes.md section 2, verified) ──
export const GENRE_CODE_MAP: Record<string, Genre> = {
  AAAA: "THEATER",
  BBBC: "DANCE",
  BBBE: "POPULAR_DANCE",
  CCCA: "CLASSIC",
  CCCC: "KOREAN_MUSIC",
  CCCD: "POPULAR_MUSIC",
  EEEA: "COMPLEX",
  EEEB: "CIRCUS_MAGIC",
  GGGA: "MUSICAL",
} as const;

export const GENRE_TO_SHCATE: Record<Genre, string> = {
  THEATER: "AAAA",
  DANCE: "BBBC",
  POPULAR_DANCE: "BBBE",
  CLASSIC: "CCCA",
  KOREAN_MUSIC: "CCCC",
  POPULAR_MUSIC: "CCCD",
  COMPLEX: "EEEA",
  CIRCUS_MAGIC: "EEEB",
  MUSICAL: "GGGA",
} as const;

// KOPIS 응답의 genrenm 라벨 -> Genre enum
export const GENRE_LABEL_MAP: Record<string, Genre> = {
  연극: "THEATER",
  "무용(서양/한국무용)": "DANCE",
  대중무용: "POPULAR_DANCE",
  "서양음악(클래식)": "CLASSIC",
  "한국음악(국악)": "KOREAN_MUSIC",
  대중음악: "POPULAR_MUSIC",
  복합: "COMPLEX",
  "서커스/마술": "CIRCUS_MAGIC",
  뮤지컬: "MUSICAL",
} as const;

export const GENRE_DISPLAY_LABELS: Record<Genre, string> = {
  THEATER: "연극",
  DANCE: "무용",
  POPULAR_DANCE: "대중무용",
  CLASSIC: "클래식",
  KOREAN_MUSIC: "국악",
  POPULAR_MUSIC: "대중음악",
  COMPLEX: "복합",
  CIRCUS_MAGIC: "서커스/마술",
  MUSICAL: "뮤지컬",
} as const;

// ── 공연 상태: 라벨 <-> enum (kopis-codes.md section 1, verified) ──
export const STATE_LABEL_MAP: Record<string, PerformanceState> = {
  공연예정: "UPCOMING",
  공연중: "ONGOING",
  공연완료: "ENDED",
} as const;

export const STATE_CODE_MAP: Record<PerformanceState, string> = {
  UPCOMING: "01",
  ONGOING: "02",
  ENDED: "03",
} as const;

// ── 시도 코드 (kopis-codes.md section 3, verified) ──
export interface SidoEntry {
  code: SidoCode;
  name: string;
}

export const SIDO_LIST: SidoEntry[] = [
  { code: "11", name: "서울특별시" },
  { code: "26", name: "부산광역시" },
  { code: "27", name: "대구광역시" },
  { code: "28", name: "인천광역시" },
  { code: "29", name: "광주광역시" },
  { code: "30", name: "대전광역시" },
  { code: "31", name: "울산광역시" },
  { code: "36", name: "세종특별자치시" },
  { code: "41", name: "경기도" },
  { code: "51", name: "강원특별자치도" },
  { code: "43", name: "충청북도" },
  { code: "44", name: "충청남도" },
  { code: "45", name: "전라북도" },
  { code: "46", name: "전라남도" },
  { code: "47", name: "경상북도" },
  { code: "48", name: "경상남도" },
  { code: "50", name: "제주특별자치도" },
] as const;

// ── 시도 라벨 -> signgucode 역매핑 (T-04) ───────────────────
// 공연시설(prfplc) 응답의 sidonm은 코드가 아니라 라벨로 오며,
// 정식 명칭("경상북도") / 축약 라벨("경북") / 구 명칭("강원도")이
// 혼재할 수 있다. 코드값은 모두 kopis-codes.md §3 검증표에서만 온다.
//
// 별칭 테이블: 정규화된 라벨 -> SidoCode.
// 키는 normalizeSidoLabel()로 정규화된 형태(공백 제거)와 일치해야 한다.
const SIDO_ALIAS_TO_CODE: Record<string, SidoCode> = {
  // 11 서울
  서울특별시: "11",
  서울시: "11",
  서울: "11",
  // 26 부산
  부산광역시: "26",
  부산시: "26",
  부산: "26",
  // 27 대구
  대구광역시: "27",
  대구시: "27",
  대구: "27",
  // 28 인천
  인천광역시: "28",
  인천시: "28",
  인천: "28",
  // 29 광주
  광주광역시: "29",
  광주시: "29",
  광주: "29",
  // 30 대전
  대전광역시: "30",
  대전시: "30",
  대전: "30",
  // 31 울산
  울산광역시: "31",
  울산시: "31",
  울산: "31",
  // 36 세종
  세종특별자치시: "36",
  세종시: "36",
  세종: "36",
  // 41 경기
  경기도: "41",
  경기: "41",
  // 51 강원 (구 명칭 "강원도" 포함)
  강원특별자치도: "51",
  강원도: "51",
  강원: "51",
  // 43 충북
  충청북도: "43",
  충북: "43",
  // 44 충남
  충청남도: "44",
  충남: "44",
  // 45 전북 (구 명칭 "전라북도" / 신 명칭 "전북특별자치도" 모두 51처럼 표기 변동 가능)
  전북특별자치도: "45",
  전라북도: "45",
  전북: "45",
  // 46 전남
  전라남도: "46",
  전남: "46",
  // 47 경북
  경상북도: "47",
  경북: "47",
  // 48 경남
  경상남도: "48",
  경남: "48",
  // 50 제주 (구 명칭 "제주도" 포함)
  제주특별자치도: "50",
  제주도: "50",
  제주: "50",
};

// 정식 명칭은 SIDO_LIST(=§3)에서 자동 보강하여 표가 §3과 항상 일치하도록 보장.
for (const s of SIDO_LIST) {
  SIDO_ALIAS_TO_CODE[s.name] = s.code;
}

// 하위 호환용 export (normalize.ts 등에서 참조).
export const SIDO_LABEL_TO_CODE: Record<string, SidoCode> = SIDO_ALIAS_TO_CODE;

/**
 * 시도 라벨을 별칭 매칭용으로 정규화한다.
 * - 앞뒤/내부 공백 제거 (KOPIS 응답에 "서울 특별시" 류 변형 방지)
 */
export function normalizeSidoLabel(label: string): string {
  return label.replace(/\s+/g, "");
}

// 데이터 품질 관측용: 매핑 실패 라벨 카운트(던지지 않음).
const unmatchedSidoLabels = new Map<string, number>();

/**
 * 시도 라벨 -> signgucode 역매핑.
 * 매칭 실패 시 undefined 반환(예외 던지지 않음) + 미지 라벨을 카운트/로그.
 * 구군(signgucodesub) 역매핑은 v0.2 보류이므로 본 함수는 시도까지만 처리한다.
 */
export function sidoLabelToCode(
  label: string | null | undefined,
): SidoCode | undefined {
  if (!label) return undefined;
  const key = normalizeSidoLabel(label);
  if (!key) return undefined;
  const code = SIDO_ALIAS_TO_CODE[key];
  if (code) return code;

  const prev = unmatchedSidoLabels.get(label) ?? 0;
  unmatchedSidoLabels.set(label, prev + 1);
  if (prev === 0) {
    // 첫 관측 시에만 경고 로그(노이즈 억제). 운영 중 미커버 라벨 발견용.
    console.warn(`[sido-mapping] 미매핑 시도 라벨: "${label}"`);
  }
  return undefined;
}

/** 관측된 미매핑 라벨 스냅샷(데이터 품질 점검용). */
export function getUnmatchedSidoLabels(): Record<string, number> {
  return Object.fromEntries(unmatchedSidoLabels);
}

/** 미매핑 카운터 초기화(테스트/배치 경계용). */
export function resetUnmatchedSidoLabels(): void {
  unmatchedSidoLabels.clear();
}

// ── URL 직렬화용 Genre slug ──
export const GENRE_SLUG_MAP: Record<string, Genre> = {
  theater: "THEATER",
  dance: "DANCE",
  popular_dance: "POPULAR_DANCE",
  classic: "CLASSIC",
  korean_music: "KOREAN_MUSIC",
  popular_music: "POPULAR_MUSIC",
  complex: "COMPLEX",
  circus_magic: "CIRCUS_MAGIC",
  musical: "MUSICAL",
} as const;

export const GENRE_TO_SLUG: Record<Genre, string> = Object.fromEntries(
  Object.entries(GENRE_SLUG_MAP).map(([slug, genre]) => [genre, slug]),
) as Record<Genre, string>;
