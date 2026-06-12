import type { Genre, GugunCode, PerformanceState, SidoCode } from "./types";

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

// ── 구군 코드 (kopis-codes.md section 4, 행정표준코드 앞4자리) ──────────
// signgucodesub: 행정표준코드(법정동코드) 앞 4자리.
// 출처: 행정안전부 행정표준코드(법정동코드), KOPIS 공통코드 PDF.
// 서울(11xx)은 kopis-codes.md §4.1에서 전량 검증 완료.
// 나머지 시도는 행정표준코드 체계 기반 — 동일 출처(법정동코드 앞 4자리).

export interface GugunEntry {
  code: GugunCode;
  name: string;
}

/**
 * 시도코드 -> 해당 시도의 구군 목록 (signgucodesub).
 * 키: SidoCode(2자리), 값: {code(4자리), name} 배열.
 */
export const GUGUN_MAP: Record<SidoCode, GugunEntry[]> = {
  // ── 11 서울특별시 (25구, kopis-codes.md §4.1 검증 완료) ──
  "11": [
    { code: "1111", name: "종로구" },
    { code: "1114", name: "중구" },
    { code: "1117", name: "용산구" },
    { code: "1120", name: "성동구" },
    { code: "1121", name: "광진구" },
    { code: "1123", name: "동대문구" },
    { code: "1126", name: "중랑구" },
    { code: "1129", name: "성북구" },
    { code: "1130", name: "강북구" },
    { code: "1132", name: "도봉구" },
    { code: "1135", name: "노원구" },
    { code: "1138", name: "은평구" },
    { code: "1141", name: "서대문구" },
    { code: "1144", name: "마포구" },
    { code: "1147", name: "양천구" },
    { code: "1150", name: "강서구" },
    { code: "1153", name: "구로구" },
    { code: "1154", name: "금천구" },
    { code: "1156", name: "영등포구" },
    { code: "1159", name: "동작구" },
    { code: "1162", name: "관악구" },
    { code: "1165", name: "서초구" },
    { code: "1168", name: "강남구" },
    { code: "1171", name: "송파구" },
    { code: "1174", name: "강동구" },
  ],

  // ── 26 부산광역시 (16구군) ──
  "26": [
    { code: "2611", name: "중구" },
    { code: "2614", name: "서구" },
    { code: "2617", name: "동구" },
    { code: "2620", name: "영도구" },
    { code: "2623", name: "부산진구" },
    { code: "2626", name: "동래구" },
    { code: "2629", name: "남구" },
    { code: "2632", name: "북구" },
    { code: "2635", name: "해운대구" },
    { code: "2638", name: "사하구" },
    { code: "2641", name: "금정구" },
    { code: "2644", name: "강서구" },
    { code: "2647", name: "연제구" },
    { code: "2650", name: "수영구" },
    { code: "2653", name: "사상구" },
    { code: "2671", name: "기장군" },
  ],

  // ── 27 대구광역시 (8구군) ──
  // 참고: 군위군은 2023.7 경북→대구 편입. KOPIS가 신코드(2772) 사용 여부는
  // 실 데이터로 확인 필요. 구코드(4772)도 병행 유지.
  "27": [
    { code: "2711", name: "중구" },
    { code: "2714", name: "동구" },
    { code: "2717", name: "서구" },
    { code: "2720", name: "남구" },
    { code: "2723", name: "북구" },
    { code: "2726", name: "수성구" },
    { code: "2729", name: "달서구" },
    { code: "2771", name: "달성군" },
    { code: "2772", name: "군위군" }, // 2023.7 경북→대구 편입
  ],

  // ── 28 인천광역시 (10구군) ──
  "28": [
    { code: "2811", name: "중구" },
    { code: "2814", name: "동구" },
    { code: "2817", name: "미추홀구" },
    { code: "2818", name: "연수구" },
    { code: "2820", name: "남동구" },
    { code: "2823", name: "부평구" },
    { code: "2826", name: "계양구" },
    { code: "2829", name: "서구" },
    { code: "2871", name: "강화군" },
    { code: "2872", name: "옹진군" },
  ],

  // ── 29 광주광역시 (5구) ──
  "29": [
    { code: "2911", name: "동구" },
    { code: "2914", name: "서구" },
    { code: "2917", name: "남구" },
    { code: "2920", name: "북구" },
    { code: "2923", name: "광산구" },
  ],

  // ── 30 대전광역시 (5구) ──
  "30": [
    { code: "3011", name: "동구" },
    { code: "3014", name: "중구" },
    { code: "3017", name: "서구" },
    { code: "3020", name: "유성구" },
    { code: "3023", name: "대덕구" },
  ],

  // ── 31 울산광역시 (5구군) ──
  "31": [
    { code: "3111", name: "중구" },
    { code: "3114", name: "남구" },
    { code: "3117", name: "동구" },
    { code: "3120", name: "북구" },
    { code: "3171", name: "울주군" },
  ],

  // ── 36 세종특별자치시 (하위 구군 없음 — 단일 행정구역) ──
  "36": [
    { code: "3611", name: "세종시" },
  ],

  // ── 41 경기도 (31시군) ──
  "41": [
    { code: "4111", name: "수원시" },
    { code: "4113", name: "성남시" },
    { code: "4115", name: "의정부시" },
    { code: "4117", name: "안양시" },
    { code: "4119", name: "부천시" },
    { code: "4121", name: "광명시" },
    { code: "4122", name: "평택시" },
    { code: "4125", name: "동두천시" },
    { code: "4127", name: "안산시" },
    { code: "4128", name: "고양시" },
    { code: "4129", name: "과천시" },
    { code: "4131", name: "구리시" },
    { code: "4133", name: "남양주시" },
    { code: "4135", name: "오산시" },
    { code: "4136", name: "시흥시" },
    { code: "4137", name: "군포시" },
    { code: "4139", name: "의왕시" },
    { code: "4141", name: "하남시" },
    { code: "4143", name: "용인시" },
    { code: "4145", name: "파주시" },
    { code: "4146", name: "이천시" },
    { code: "4148", name: "안성시" },
    { code: "4150", name: "김포시" },
    { code: "4155", name: "화성시" },
    { code: "4157", name: "광주시" },
    { code: "4159", name: "양주시" },
    { code: "4161", name: "포천시" },
    { code: "4163", name: "여주시" },
    { code: "4171", name: "연천군" },
    { code: "4173", name: "가평군" },
    { code: "4175", name: "양평군" },
  ],

  // ── 51 강원특별자치도 (18시군) ──
  "51": [
    { code: "5111", name: "춘천시" },
    { code: "5113", name: "원주시" },
    { code: "5115", name: "강릉시" },
    { code: "5117", name: "동해시" },
    { code: "5119", name: "태백시" },
    { code: "5121", name: "속초시" },
    { code: "5123", name: "삼척시" },
    { code: "5172", name: "홍천군" },
    { code: "5173", name: "횡성군" },
    { code: "5175", name: "영월군" },
    { code: "5176", name: "평창군" },
    { code: "5177", name: "정선군" },
    { code: "5178", name: "철원군" },
    { code: "5179", name: "화천군" },
    { code: "5180", name: "양구군" },
    { code: "5181", name: "인제군" },
    { code: "5182", name: "고성군" },
    { code: "5183", name: "양양군" },
  ],

  // ── 43 충청북도 (11시군) ──
  "43": [
    { code: "4311", name: "청주시" },
    { code: "4313", name: "충주시" },
    { code: "4315", name: "제천시" },
    { code: "4372", name: "보은군" },
    { code: "4373", name: "옥천군" },
    { code: "4374", name: "영동군" },
    { code: "4375", name: "증평군" },
    { code: "4376", name: "진천군" },
    { code: "4377", name: "괴산군" },
    { code: "4378", name: "음성군" },
    { code: "4379", name: "단양군" },
  ],

  // ── 44 충청남도 (15시군) ──
  "44": [
    { code: "4413", name: "천안시" },
    { code: "4415", name: "공주시" },
    { code: "4418", name: "보령시" },
    { code: "4420", name: "아산시" },
    { code: "4421", name: "서산시" },
    { code: "4423", name: "논산시" },
    { code: "4425", name: "계룡시" },
    { code: "4427", name: "당진시" },
    { code: "4471", name: "금산군" },
    { code: "4476", name: "부여군" },
    { code: "4477", name: "서천군" },
    { code: "4479", name: "청양군" },
    { code: "4480", name: "홍성군" },
    { code: "4481", name: "예산군" },
    { code: "4482", name: "태안군" },
  ],

  // ── 45 전라북도 (14시군) ──
  "45": [
    { code: "4511", name: "전주시" },
    { code: "4513", name: "군산시" },
    { code: "4514", name: "익산시" },
    { code: "4518", name: "정읍시" },
    { code: "4519", name: "남원시" },
    { code: "4521", name: "김제시" },
    { code: "4571", name: "완주군" },
    { code: "4572", name: "진안군" },
    { code: "4573", name: "무주군" },
    { code: "4574", name: "장수군" },
    { code: "4575", name: "임실군" },
    { code: "4577", name: "순창군" },
    { code: "4579", name: "고창군" },
    { code: "4580", name: "부안군" },
  ],

  // ── 46 전라남도 (22시군) ──
  "46": [
    { code: "4611", name: "목포시" },
    { code: "4613", name: "여수시" },
    { code: "4615", name: "순천시" },
    { code: "4617", name: "나주시" },
    { code: "4623", name: "광양시" },
    { code: "4671", name: "담양군" },
    { code: "4672", name: "곡성군" },
    { code: "4673", name: "구례군" },
    { code: "4677", name: "고흥군" },
    { code: "4678", name: "보성군" },
    { code: "4679", name: "화순군" },
    { code: "4680", name: "장흥군" },
    { code: "4681", name: "강진군" },
    { code: "4682", name: "해남군" },
    { code: "4683", name: "영암군" },
    { code: "4684", name: "무안군" },
    { code: "4686", name: "함평군" },
    { code: "4687", name: "영광군" },
    { code: "4688", name: "장성군" },
    { code: "4689", name: "완도군" },
    { code: "4690", name: "진도군" },
    { code: "4691", name: "신안군" },
  ],

  // ── 47 경상북도 (22시군, 군위군은 2023.7 대구 편입) ──
  "47": [
    { code: "4711", name: "포항시" },
    { code: "4713", name: "경주시" },
    { code: "4715", name: "김천시" },
    { code: "4717", name: "안동시" },
    { code: "4719", name: "구미시" },
    { code: "4721", name: "영주시" },
    { code: "4723", name: "영천시" },
    { code: "4725", name: "상주시" },
    { code: "4728", name: "문경시" },
    { code: "4729", name: "경산시" },
    { code: "4772", name: "군위군" }, // KOPIS가 구코드(4772) 유지 가능 — 병행 등록
    { code: "4773", name: "의성군" },
    { code: "4775", name: "청송군" },
    { code: "4776", name: "영양군" },
    { code: "4777", name: "영덕군" },
    { code: "4778", name: "청도군" },
    { code: "4779", name: "고령군" },
    { code: "4780", name: "성주군" },
    { code: "4781", name: "칠곡군" },
    { code: "4782", name: "예천군" },
    { code: "4783", name: "봉화군" },
    { code: "4784", name: "울진군" },
    { code: "4785", name: "울릉군" },
  ],

  // ── 48 경상남도 (18시군) ──
  "48": [
    { code: "4812", name: "창원시" },
    { code: "4817", name: "진주시" },
    { code: "4822", name: "통영시" },
    { code: "4824", name: "사천시" },
    { code: "4825", name: "김해시" },
    { code: "4827", name: "밀양시" },
    { code: "4831", name: "거제시" },
    { code: "4833", name: "양산시" },
    { code: "4872", name: "의령군" },
    { code: "4873", name: "함안군" },
    { code: "4874", name: "창녕군" },
    { code: "4875", name: "고성군" },
    { code: "4877", name: "남해군" },
    { code: "4878", name: "하동군" },
    { code: "4879", name: "산청군" },
    { code: "4881", name: "함양군" },
    { code: "4882", name: "거창군" },
    { code: "4883", name: "합천군" },
  ],

  // ── 50 제주특별자치도 (2시) ──
  "50": [
    { code: "5011", name: "제주시" },
    { code: "5013", name: "서귀포시" },
  ],
};

// ── 구군 라벨 -> 구군코드 역매핑 (gugunnm -> GugunCode) ───────────────
// Venue 동기화 시 prfplc 응답의 gugunnm(라벨)을 구군코드로 변환하는 데 사용.
// 시도코드를 알고 있어야 정확한 매핑 가능(예: "중구"는 서울/부산/대구/인천/대전 등에 존재).

/**
 * 특정 시도 내에서 구군 라벨 -> GugunCode 역매핑.
 * @param sidoCode 시도코드 (2자리)
 * @param gugunName 구군 라벨 (예: "종로구", "해운대구")
 * @returns GugunCode(4자리) 또는 undefined
 */
export function gugunLabelToCode(
  sidoCode: SidoCode,
  gugunName: string | null | undefined,
): GugunCode | undefined {
  if (!sidoCode || !gugunName) return undefined;
  const trimmed = gugunName.replace(/\s+/g, "");
  if (!trimmed) return undefined;
  const entries = GUGUN_MAP[sidoCode];
  if (!entries) return undefined;
  const found = entries.find((e) => e.name === trimmed);
  return found?.code;
}

/**
 * 구군코드에서 시도코드를 추출한다 (앞 2자리).
 */
export function gugunCodeToSido(gugunCode: GugunCode): SidoCode {
  return gugunCode.slice(0, 2);
}

/**
 * 구군코드 -> 구군 라벨 조회.
 */
export function gugunCodeToLabel(
  gugunCode: GugunCode,
): string | undefined {
  const sidoCode = gugunCodeToSido(gugunCode);
  const entries = GUGUN_MAP[sidoCode];
  if (!entries) return undefined;
  const found = entries.find((e) => e.code === gugunCode);
  return found?.name;
}

// 데이터 품질 관측용: 구군 매핑 실패 카운트.
const unmatchedGugunLabels = new Map<string, number>();

/**
 * 구군 라벨 -> GugunCode 역매핑 (관측 로깅 포함 버전).
 * 시도코드 없이 전체 검색. 동명 구군이 있으면 첫 매칭 반환 + 경고.
 * 시도코드를 아는 경우 gugunLabelToCode()를 사용할 것.
 */
export function gugunLabelToCodeLoose(
  gugunName: string | null | undefined,
): GugunCode | undefined {
  if (!gugunName) return undefined;
  const trimmed = gugunName.replace(/\s+/g, "");
  if (!trimmed) return undefined;

  for (const entries of Object.values(GUGUN_MAP)) {
    const found = entries.find((e) => e.name === trimmed);
    if (found) return found.code;
  }

  const prev = unmatchedGugunLabels.get(gugunName) ?? 0;
  unmatchedGugunLabels.set(gugunName, prev + 1);
  if (prev === 0) {
    console.warn(`[gugun-mapping] 미매핑 구군 라벨: "${gugunName}"`);
  }
  return undefined;
}

/** 관측된 미매핑 구군 라벨 스냅샷. */
export function getUnmatchedGugunLabels(): Record<string, number> {
  return Object.fromEntries(unmatchedGugunLabels);
}

/** 미매핑 구군 카운터 초기화. */
export function resetUnmatchedGugunLabels(): void {
  unmatchedGugunLabels.clear();
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
