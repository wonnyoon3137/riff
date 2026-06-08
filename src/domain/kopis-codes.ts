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

// 시도명 -> 코드 역매핑 (공연시설 sidonm 라벨 -> signgucode)
// KOPIS sidonm은 약칭("서울", "경기")일 수 있으므로 약칭도 포함
export const SIDO_LABEL_TO_CODE: Record<string, SidoCode> = {};
for (const s of SIDO_LIST) {
  SIDO_LABEL_TO_CODE[s.name] = s.code;
}
// 약칭 매핑 (KOPIS sidonm 응답에서 관찰되는 패턴)
const SIDO_SHORT_NAMES: Record<string, SidoCode> = {
  서울: "11",
  부산: "26",
  대구: "27",
  인천: "28",
  광주: "29",
  대전: "30",
  울산: "31",
  세종: "36",
  경기: "41",
  강원: "51",
  충북: "43",
  충남: "44",
  전북: "45",
  전남: "46",
  경북: "47",
  경남: "48",
  제주: "50",
};
Object.assign(SIDO_LABEL_TO_CODE, SIDO_SHORT_NAMES);

export function sidoLabelToCode(label: string): SidoCode | undefined {
  return SIDO_LABEL_TO_CODE[label.trim()];
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
