/**
 * React Query 캐시 설정 SSOT (#17 / data-model §7.3).
 *
 * 값의 근거는 두 출처를 따른다.
 * - data-model.md §7.2~7.3: 무한 스크롤 누적 페이지를 "재요청 없이 즉시 복원"
 *   (D8)하려면 목록 캐시(gcTime)가 S1→S2→뒤로가기 왕복 동안 살아 있어야 한다.
 * - kopis-integration SKILL §"에러/캐싱": "목록 5~10분, 상세 30~60분" 캐시 권장.
 *   (KOPIS 데이터는 분 단위로 바뀌지 않으므로 신선도보다 호출 절감이 우선.)
 *
 * staleTime: 이 시간 동안은 캐시를 신선한 것으로 보고 재요청하지 않는다(배경 refetch X).
 * gcTime   : 관찰자(컴포넌트)가 모두 언마운트된 뒤 캐시를 메모리에서 폐기하기까지의 시간.
 *            D8 복원의 캐시 hit 여부를 좌우하는 값이다.
 */

const MINUTE = 60 * 1000;

/**
 * 목록(performances) 캐시.
 *
 * - staleTime 5분: kopis 권장 "목록 5~10분"의 하한. 목록은 prfstate/신규 등록이
 *   바뀔 수 있어 상세보다 짧게 둔다.
 * - gcTime 10분: kopis 권장 상한(10분)과 일치. S1에서 S2 상세를 보고 뒤로가기로
 *   복귀하는 일반 동선(수십 초~수 분)에서 목록 누적 페이지 캐시가 살아남아
 *   재요청 0으로 즉시 복원된다(§7.3 D8). 10분을 넘겨 캐시가 폐기된 경우는
 *   useScrollRestore의 sessionStorage loadedPages 복원(#23)이 페이지를 다시
 *   채워 동선을 보전한다 → gcTime 만료가 기능을 깨지 않는다.
 */
export const LIST_STALE_TIME = 5 * MINUTE;
export const LIST_GC_TIME = 10 * MINUTE;

/**
 * 상세(performance detail) 캐시.
 *
 * - staleTime 30분 / gcTime 60분: kopis 권장 "상세 30~60분". 상세 정보(출연·제작·
 *   예매처·이미지)는 거의 불변이라 길게 캐시해 KOPIS 호출(동시성 ≤5, ≈11 req/s
 *   상한)을 아낀다. 같은 공연을 재방문해도 60분 내라면 캐시 hit.
 */
export const DETAIL_STALE_TIME = 30 * MINUTE;
export const DETAIL_GC_TIME = 60 * MINUTE;

/**
 * QueryClient 전역 디폴트.
 *
 * 목록 기준값을 디폴트로 두고(다수 쿼리가 목록 계열), 상세 훅은 자체 옵션으로
 * 더 긴 값을 덮어쓴다. refetchOnWindowFocus는 꺼서 탭 복귀마다 KOPIS를 때리지
 * 않는다(rate limit 보호). 일시 5xx/timeout 대비 retry 1회.
 */
export const DEFAULT_QUERY_OPTIONS = {
  staleTime: LIST_STALE_TIME,
  gcTime: LIST_GC_TIME,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

/**
 * maxPages(useInfiniteQuery 캐시 상한): **채택하지 않음**.
 *
 * data-model §7.3 line 409은 "페이지 누적 과도 시 상한 페이지 수 제한(확인 필요)"
 * 이라 적었으나, maxPages는 상한 초과 시 윈도우 밖(앞쪽) 페이지를 캐시에서 버린다.
 * 이는 D8 복원(#23)과 정면 충돌한다: loadedPages=N으로 복귀해 앞 페이지부터
 * 다시 채우는데, maxPages<N이면 앞 페이지가 즉시 폐기돼 목록 상단이 비고
 * scrollY 복원도 어긋난다. 또한 D2 무한 스크롤에서 위로 다시 스크롤하면 버려진
 * 페이지가 사라져 사용자에게 빈 구간이 보인다.
 *
 * 결론: 메모리 상한은 maxPages(페이지 윈도잉)가 아니라 gcTime(관찰자 소멸 후
 * 시간 기반 폐기)로 관리한다. 한 세션의 목록 누적은 30개/페이지 × 현실적 스크롤
 * 깊이 수준이라 메모리 부담이 작고, 필터 변경 시 queryKey가 바뀌어 이전 누적은
 * gcTime 후 자연 회수된다. 따라서 maxPages 미설정이 D2/D8과 정합한다.
 */
export const PERFORMANCES_MAX_PAGES = undefined;
