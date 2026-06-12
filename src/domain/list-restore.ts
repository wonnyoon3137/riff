import type { FilterState, ListRestoreState } from "./types";
import { filterHash } from "./filter-url";

/**
 * 목록(S1) 복원 상태 직렬화/역직렬화 + 복원 결정 로직 (D2/D8).
 *
 * 저장 스키마는 data-model §7 `ListRestoreState`를 따른다.
 * 순수 함수로 분리해 (DOM 없이) 단위 테스트 가능하게 한다.
 * 훅(`useScrollRestore`)은 여기에 sessionStorage / scrollTo만 얹는다.
 */

export const LIST_RESTORE_KEY_PREFIX = "riff:list:";

export function listRestoreKey(filter: FilterState): string {
  return `${LIST_RESTORE_KEY_PREFIX}${filterHash(filter)}`;
}

/** 무한 스크롤 페이지당 행 수 (usePerformances와 동일해야 함). */
export const ROWS_PER_PAGE = 30;

/**
 * 복원 스냅샷을 직렬화한다. 음수/NaN 방어 포함.
 */
export function serializeRestore(
  state: Omit<ListRestoreState, "savedAt"> & { savedAt?: number },
): string {
  const payload: ListRestoreState = {
    filter: state.filter,
    scrollY: Number.isFinite(state.scrollY) ? Math.max(0, state.scrollY) : 0,
    loadedPages:
      Number.isFinite(state.loadedPages) && state.loadedPages > 0
        ? Math.floor(state.loadedPages)
        : 1,
    totalCount: state.totalCount,
    savedAt: state.savedAt ?? Date.now(),
  };
  return JSON.stringify(payload);
}

/**
 * 직렬화 문자열을 복원 스냅샷으로 파싱한다.
 * 손상/구버전(과거: scrollY만 저장한 숫자 문자열)도 안전하게 처리.
 */
export function parseRestore(raw: string | null): ListRestoreState | null {
  if (!raw) return null;

  // 구버전 호환: 과거에는 scrollY 숫자만 저장했다.
  const asNumber = Number(raw);
  if (raw.trim() !== "" && Number.isFinite(asNumber) && !raw.includes("{")) {
    return {
      filter: null as unknown as FilterState, // 구버전엔 필터 스냅샷 없음
      scrollY: Math.max(0, asNumber),
      loadedPages: 1,
      savedAt: 0,
    };
  }

  try {
    const obj = JSON.parse(raw) as Partial<ListRestoreState>;
    if (typeof obj !== "object" || obj === null) return null;
    const scrollY =
      typeof obj.scrollY === "number" && Number.isFinite(obj.scrollY)
        ? Math.max(0, obj.scrollY)
        : 0;
    const loadedPages =
      typeof obj.loadedPages === "number" &&
      Number.isFinite(obj.loadedPages) &&
      obj.loadedPages > 0
        ? Math.floor(obj.loadedPages)
        : 1;
    return {
      filter: (obj.filter ?? null) as FilterState,
      scrollY,
      loadedPages,
      totalCount: obj.totalCount,
      savedAt: typeof obj.savedAt === "number" ? obj.savedAt : 0,
    };
  } catch {
    return null;
  }
}

/**
 * 복원 진행 결정. 콘텐츠 높이가 확보되기 전에 scrollTo가 클램프되는
 * 결함(#23)을 막기 위해, "필요한 페이지 수만큼 로드됐는지"를 게이트로 둔다.
 *
 * @param target       복원하려는 스냅샷
 * @param currentPages 현재 캐시에 로드된 페이지 수
 * @param hasNextPage  더 가져올 페이지가 있는지
 * @returns
 *   - action "fetch": 아직 페이지가 부족 → fetchNextPage 필요
 *   - action "scroll": 충분히 로드됨 → scrollTo(target.scrollY) 실행
 *   - action "wait": 더 못 가져오는데 부족(끝 도달) → 가능한 만큼만 복원(scroll)
 */
export function decideRestoreStep(
  target: Pick<ListRestoreState, "loadedPages">,
  currentPages: number,
  hasNextPage: boolean,
): { action: "fetch" | "scroll" } {
  if (currentPages >= target.loadedPages) {
    return { action: "scroll" };
  }
  if (hasNextPage) {
    return { action: "fetch" };
  }
  // 목표보다 적게 로드됐지만 더 가져올 수 없음(데이터가 줄었거나 끝) → 그대로 복원.
  return { action: "scroll" };
}
