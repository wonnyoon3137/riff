import type {
  DateRange,
  FilterState,
  Genre,
  PeriodPreset,
  SortOrder,
} from "./types";
import { GENRE_SLUG_MAP, GENRE_TO_SLUG } from "./kopis-codes";

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
      return {
        sidoCode: sido,
        gugunCode: gugun || undefined,
        label: sido,
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

  return base;
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
