import type {
  DateRange,
  FilterState,
  Genre,
  PeriodPreset,
  SortOrder,
} from "./types";
import { GENRE_SLUG_MAP, GENRE_TO_SLUG, SIDO_LIST, GUGUN_MAP } from "./kopis-codes";

// 시도 코드 -> 정식 명칭 역매핑 (#24). URL은 코드만 저장(단방향)하므로
// 역직렬화 시 표시 라벨을 SIDO_LIST(검증표 §3)에서 복원한다.
const SIDO_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  SIDO_LIST.map((s) => [s.code, s.name]),
);

// 구군 코드 -> 구군 명칭 역매핑 (URL 역직렬화 시 라벨 복원용).
const GUGUN_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.values(GUGUN_MAP).flatMap((entries) =>
    entries.map((e) => [e.code, e.name]),
  ),
);

const MAX_RANGE_DAYS = 31;

// 검색어 최소 길이 (F5.4). trim 후 이 미만이면 shprfnm 미전송 (공연장 자동완성 q<2 가드와 일관).
export const SEARCH_MIN_LENGTH = 2;

/**
 * 검색어를 정규화한다 (F5.4 공백 정규화 / 2자 가드).
 * 앞뒤 공백 제거 후 2자 미만이면 undefined(검색 비활성). 내부 공백은 보존.
 */
export function normalizeSearchTerm(
  term: string | undefined | null,
): string | undefined {
  if (!term) return undefined;
  const trimmed = term.trim();
  return trimmed.length >= SEARCH_MIN_LENGTH ? trimmed : undefined;
}

// ── 디폴트 필터 (D1) ──────────────────────────────────────
export function defaultFilterState(): FilterState {
  const today = new Date();
  const to = new Date(today);
  to.setDate(to.getDate() + 29); // 오늘 포함 30일
  return {
    period: {
      preset: "DEFAULT_30D",
      range: {
        from: toISODate(today),
        to: toISODate(to),
      },
    },
    regions: [],
    isNationwide: true,
    genres: [],
    sort: "START_ASC",
  };
}

// ── FilterState -> URLSearchParams (디폴트는 생략) ────────
export function filterToQuery(f: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  const def = defaultFilterState();

  // period
  if (f.period.preset !== def.period.preset) {
    params.set("period", f.period.preset.toLowerCase());
  }
  if (
    f.period.preset === "CUSTOM" ||
    f.period.range.from !== def.period.range.from ||
    f.period.range.to !== def.period.range.to
  ) {
    if (f.period.preset !== "DEFAULT_30D") {
      params.set("from", f.period.range.from);
      params.set("to", f.period.range.to);
    }
  }

  // regions
  if (!f.isNationwide && f.regions.length > 0) {
    const regionStr = f.regions
      .map((r) => (r.gugunCode ? `${r.sidoCode}:${r.gugunCode}` : r.sidoCode))
      .join(",");
    params.set("region", regionStr);
  }

  // genres
  if (f.genres.length > 0) {
    params.set("genre", f.genres.map((g) => GENRE_TO_SLUG[g]).join(","));
  }

  // venue
  if (f.venueId) {
    params.set("venue", f.venueId);
  }

  // sort
  if (f.sort !== def.sort) {
    params.set("sort", f.sort.toLowerCase());
  }

  // 검색어 (F5.3 ?q=). trim 후 2자 미만이면 미전송 (F5.4).
  const search = normalizeSearchTerm(f.searchTerm);
  if (search) {
    params.set("q", search);
  }

  // 아티스트 (F8). 미선택 시 생략.
  if (f.artistId) {
    params.set("artist", f.artistId);
  }

  return params;
}

// ── URLSearchParams -> FilterState (폴백/보정 포함) ───────
export function queryToFilter(q: URLSearchParams): FilterState {
  const base = defaultFilterState();

  // period
  const periodParam = q.get("period")?.toUpperCase() as
    | PeriodPreset
    | undefined;
  const fromParam = q.get("from");
  const toParam = q.get("to");

  if (periodParam && isValidPreset(periodParam)) {
    base.period.preset = periodParam;
    if (periodParam === "CUSTOM" && fromParam && toParam) {
      base.period.range = clampRange({ from: fromParam, to: toParam });
    } else if (periodParam !== "CUSTOM" && periodParam !== "DEFAULT_30D") {
      base.period.range = presetToRange(periodParam);
    }
  } else if (fromParam && toParam) {
    base.period.preset = "CUSTOM";
    base.period.range = clampRange({ from: fromParam, to: toParam });
  }

  // regions
  const regionParam = q.get("region");
  if (regionParam && regionParam !== "all") {
    base.isNationwide = false;
    base.regions = regionParam.split(",").map((seg) => {
      const [sido, gugun] = seg.split(":");
      // 라벨은 URL에 없으므로 코드→정식 명칭으로 복원(#24).
      // 알 수 없는 코드는 코드 문자열을 폴백 라벨로 사용.
      const sidoName = SIDO_CODE_TO_NAME[sido] ?? sido;
      let label = sidoName;
      if (gugun) {
        const gugunName = GUGUN_CODE_TO_NAME[gugun];
        if (gugunName) {
          // Shorten sido prefix for chip display (e.g., "서울 종로구")
          const short = sidoName
            .replace(/특별자치도$/, "")
            .replace(/특별자치시$/, "")
            .replace(/특별시$/, "")
            .replace(/광역시$/, "")
            .replace(/도$/, "");
          label = `${short} ${gugunName}`;
        }
      }
      return {
        sidoCode: sido,
        gugunCode: gugun || undefined,
        label,
      };
    });
  }

  // genres
  const genreParam = q.get("genre");
  if (genreParam) {
    base.genres = genreParam
      .split(",")
      .map((slug) => GENRE_SLUG_MAP[slug.toLowerCase()])
      .filter((g): g is Genre => g !== undefined);
  }

  // venue
  const venueParam = q.get("venue");
  if (venueParam) {
    base.venueId = venueParam;
  }

  // sort
  const sortParam = q.get("sort")?.toUpperCase() as SortOrder | undefined;
  if (sortParam === "START_ASC" || sortParam === "START_DESC") {
    base.sort = sortParam;
  }

  // 검색어 (F5.3 ?q=). 2자 미만은 비활성(undefined) (F5.4).
  base.searchTerm = normalizeSearchTerm(q.get("q"));

  // 아티스트 (F8).
  const artistParam = q.get("artist");
  if (artistParam) {
    base.artistId = artistParam;
  }

  return base;
}

// ── 활성 필터 판정 (F2.5 필터 초기화) ─────────────────────
// "필터 초기화" 버튼 활성/비활성 및 모바일 배지 카운트의 단일 진실원본.
// resetFilter()가 defaultFilterState()로 되돌리며 sort도 기본값으로
// 복귀시키므로(#25), sort 축도 활성 판정에 포함한다. searchTerm 선례와 일관.

/** 필터가 디폴트 상태인지(= "필터 초기화" 비활성 조건). */
export function isDefaultFilter(f: FilterState): boolean {
  const def = defaultFilterState();
  return (
    f.period.preset === def.period.preset &&
    f.isNationwide === def.isNationwide &&
    f.regions.length === 0 &&
    f.genres.length === 0 &&
    !f.venueId &&
    !normalizeSearchTerm(f.searchTerm) &&
    !f.artistId &&
    f.sort === def.sort
  );
}

/** 활성 필터 축 개수(모바일 배지용). 기간/지역/장르/공연장/검색어/정렬. */
export function countActiveFilters(f: FilterState): number {
  const def = defaultFilterState();
  let count = 0;
  if (f.period.preset !== def.period.preset) count++;
  if (!f.isNationwide && f.regions.length > 0) count++;
  if (f.genres.length > 0) count++;
  if (f.venueId) count++;
  if (normalizeSearchTerm(f.searchTerm)) count++;
  if (f.artistId) count++;
  if (f.sort !== def.sort) count++;
  return count;
}

// ── 캐시/세션 키용 해시 ───────────────────────────────────
export function filterHash(f: FilterState): string {
  const parts = [
    f.period.range.from,
    f.period.range.to,
    f.isNationwide
      ? "nationwide"
      : f.regions.map((r) => r.sidoCode + (r.gugunCode || "")).join("+"),
    f.genres.join("+") || "all",
    f.venueId || "",
    f.sort,
    // 검색어별 캐시 분리 (F5.5). 2자 미만은 미전송과 동일(빈 문자열).
    normalizeSearchTerm(f.searchTerm) || "",
    // 아티스트별 캐시 분리 (F8).
    f.artistId || "",
  ];
  return parts.join("|");
}

// ── 헬퍼 ─────────────────────────────────────────────────
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidPreset(v: string): v is PeriodPreset {
  return ["THIS_MONTH", "NEXT_MONTH", "MONTH_AFTER", "CUSTOM", "DEFAULT_30D"].includes(v);
}

export function presetToRange(preset: PeriodPreset): DateRange {
  const now = new Date();
  switch (preset) {
    case "THIS_MONTH": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return clampRange({ from: toISODate(from), to: toISODate(to) });
    }
    case "NEXT_MONTH": {
      const from = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return clampRange({ from: toISODate(from), to: toISODate(to) });
    }
    case "MONTH_AFTER": {
      const from = new Date(now.getFullYear(), now.getMonth() + 2, 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      return clampRange({ from: toISODate(from), to: toISODate(to) });
    }
    default: {
      const from = now;
      const to = new Date(now);
      to.setDate(to.getDate() + 29);
      return { from: toISODate(from), to: toISODate(to) };
    }
  }
}

/** 31일 초과 시 to를 from+30일로 보정 (D3) */
export function clampRange(range: DateRange): DateRange {
  const from = new Date(range.from);
  const to = new Date(range.to);
  const diffDays =
    Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays > MAX_RANGE_DAYS) {
    const clamped = new Date(from);
    clamped.setDate(clamped.getDate() + MAX_RANGE_DAYS - 1);
    return { from: range.from, to: toISODate(clamped) };
  }
  return range;
}

/** range가 31일을 초과하는지 */
export function isRangeExceeded(range: DateRange): boolean {
  const from = new Date(range.from);
  const to = new Date(range.to);
  const diffDays =
    Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > MAX_RANGE_DAYS;
}
