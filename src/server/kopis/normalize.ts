import type {
  BookingRelate,
  IntroImage,
  Performance,
  PerformanceState,
  PerformanceSummary,
  Genre,
  Venue,
} from "@/domain/types";
import { GENRE_LABEL_MAP, STATE_LABEL_MAP, sidoLabelToCode } from "@/domain/kopis-codes";
import type {
  KopisPblprfrListItem,
  KopisPblprfrDetail,
  KopisPrfplcListItem,
  KopisPrfplcDetail,
  KopisRelate,
} from "./raw-types";

// ── 공통 헬퍼 ─────────────────────────────────────────────

/** 빈 문자열 / 공백만 -> undefined */
export function emptyToUndef(v?: string | null): string | undefined {
  if (v == null) return undefined;
  const trimmed = String(v).trim();
  return trimmed === "" ? undefined : trimmed;
}

/** "yyyy.MM.dd" -> "yyyy-MM-dd" */
export function kopisDateToISO(v: string): string {
  return v.replace(/\./g, "-");
}

/** KOPIS prfstate 라벨 -> PerformanceState */
export function toState(prfstate?: string): PerformanceState {
  if (!prfstate) return "UPCOMING";
  const trimmed = prfstate.trim();
  return STATE_LABEL_MAP[trimmed] ?? "UPCOMING";
}

/** KOPIS genrenm 라벨 -> Genre | undefined */
export function toGenre(genrenm?: string): Genre | undefined {
  if (!genrenm) return undefined;
  return GENRE_LABEL_MAP[genrenm.trim()];
}

/** "Y"/"N" -> boolean */
function toBool(v?: string): boolean | undefined {
  if (v === "Y") return true;
  if (v === "N") return false;
  return undefined;
}

// ── 목록 정규화 ───────────────────────────────────────────

export function toPerformanceSummary(
  raw: KopisPblprfrListItem,
): PerformanceSummary {
  return {
    id: raw.mt20id ?? "",
    title: emptyToUndef(raw.prfnm) ?? "",
    posterUrl: emptyToUndef(raw.poster),
    period: {
      from: raw.prfpdfrom ? kopisDateToISO(raw.prfpdfrom) : "",
      to: raw.prfpdto ? kopisDateToISO(raw.prfpdto) : "",
    },
    venueName: emptyToUndef(raw.fcltynm) ?? "",
    area: emptyToUndef(raw.area),
    genre: toGenre(raw.genrenm),
    genreLabel: emptyToUndef(raw.genrenm) ?? "",
    state: toState(raw.prfstate),
    openrun: toBool(raw.openrun),
  };
}

// ── 상세 정규화 ───────────────────────────────────────────

function normalizeRelates(
  raw?: { relate?: KopisRelate | KopisRelate[] },
): BookingRelate[] {
  if (!raw?.relate) return [];
  const arr = Array.isArray(raw.relate) ? raw.relate : [raw.relate];
  return arr
    .filter((r) => r.relateurl)
    .map((r) => ({
      name: emptyToUndef(r.relatenm),
      url: r.relateurl!,
    }));
}

function normalizeIntroImages(
  raw?: { styurl?: string | string[] },
): IntroImage[] {
  if (!raw?.styurl) return [];
  const arr = Array.isArray(raw.styurl) ? raw.styurl : [raw.styurl];
  return arr.filter(Boolean).map((url) => ({ url: String(url) }));
}

export function toPerformance(raw: KopisPblprfrDetail): Performance {
  const summary = toPerformanceSummary(raw as KopisPblprfrListItem);
  return {
    ...summary,
    venueId: emptyToUndef(raw.mt10id),
    hallId: emptyToUndef(raw.mt13id),
    ageGuidance: emptyToUndef(raw.prfage),
    runtime: emptyToUndef(raw.prfruntime),
    timeGuidance: emptyToUndef(raw.dtguidance),
    cast: emptyToUndef(raw.prfcast),
    crew: emptyToUndef(raw.prfcrew),
    story: emptyToUndef(raw.sty),
    priceGuidance: emptyToUndef(raw.pcseguidance),
    producers: {
      main: emptyToUndef(raw.entrpsnm),
      producer: emptyToUndef(raw.entrpsnmP),
      planner: emptyToUndef(raw.entrpsnmA),
      host: emptyToUndef(raw.entrpsnmH),
      supervisor: emptyToUndef(raw.entrpsnmS),
    },
    introImages: normalizeIntroImages(raw.styurls),
    bookings: normalizeRelates(raw.relates),
  };
}

// ── 공연시설 정규화 ───────────────────────────────────────

export function toVenue(
  raw: KopisPrfplcListItem | KopisPrfplcDetail,
  now?: Date,
): Venue {
  const detail = raw as KopisPrfplcDetail;
  return {
    id: raw.mt10id ?? "",
    name: emptyToUndef(raw.fcltynm) ?? "",
    sidoName: emptyToUndef(raw.sidonm),
    gugunName: emptyToUndef(raw.gugunnm),
    sidoCode: raw.sidonm ? sidoLabelToCode(raw.sidonm) : undefined,
    facilityChar: emptyToUndef(raw.fcltychartr),
    hallCount:
      raw.mt13cnt != null ? Number(raw.mt13cnt) || undefined : undefined,
    openYear: emptyToUndef(raw.opende),
    address: emptyToUndef(detail.adres),
    lat: detail.la != null ? Number(detail.la) || undefined : undefined,
    lng: detail.lo != null ? Number(detail.lo) || undefined : undefined,
    syncedAt: (now ?? new Date()).toISOString(),
  };
}
