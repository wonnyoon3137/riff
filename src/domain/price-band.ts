// 가격 밴드 파서 (v3 P1-1)
// pcseguidance 자유 텍스트에서 가격을 추출하여 밴드로 분류한다.
// 원문 보존 원칙 불변 — 파서는 표시용 파생값만 생성.

export type PriceBand =
  | "FREE" //  무료/초대
  | "UNDER_30K" // ~3만
  | "UNDER_70K" // 3~7만
  | "OVER_70K" // 7만+
  | "VARIABLE"; // 가변/미정 (파싱 실패 포함)

export interface PriceBandResult {
  band: PriceBand;
  lowestPrice: number | null; // 추출된 최저가 (원), null이면 파싱 실패
  label: string; // UI 표시용 라벨
}

const BAND_LABELS: Record<PriceBand, string> = {
  FREE: "무료/초대",
  UNDER_30K: "~3만",
  UNDER_70K: "3~7만",
  OVER_70K: "7만+",
  VARIABLE: "가변/미정",
};

const FREE_PATTERNS = [
  /전석\s*초대/,
  /전석\s*무료/,
  /무료\s*공연/,
  /무료\s*관람/,
  /입장\s*무료/,
  /^무료$/,
];

/**
 * pcseguidance 텍스트에서 모든 가격(원 단위)을 추출한다.
 * "5만원" → 50000, "150,000원" → 150000, "5만5천원" → 55000
 */
export function extractPrices(text: string): number[] {
  const prices: number[] = [];

  // "N만" 또는 "N만N천" 패턴 (예: "5만원", "5만5천원", "12만원")
  const manRe = /(\d+)\s*만\s*(?:(\d+)\s*천\s*)?원?/g;
  let m: RegExpExecArray | null;
  while ((m = manRe.exec(text)) !== null) {
    const man = parseInt(m[1], 10) * 10000;
    const cheon = m[2] ? parseInt(m[2], 10) * 1000 : 0;
    prices.push(man + cheon);
  }

  // 콤마 구분 숫자 + "원" (예: "150,000원", "99,000원")
  const commaWonRe = /(\d{1,3}(?:,\d{3})+)\s*원/g;
  while ((m = commaWonRe.exec(text)) !== null) {
    const val = parseInt(m[1].replace(/,/g, ""), 10);
    if (val > 0) prices.push(val);
  }

  // 순수 숫자 + "원" (예: "5000원", "150000원") — 만/콤마에 안 잡힌 것
  const plainWonRe = /(?<!\d[,.])\b(\d{4,6})\s*원/g;
  while ((m = plainWonRe.exec(text)) !== null) {
    const val = parseInt(m[1], 10);
    // 이미 콤마 패턴으로 잡힌 위치와 겹치지 않으면 추가
    if (val > 0 && !prices.includes(val)) prices.push(val);
  }

  return [...new Set(prices)];
}

function isFreeText(text: string): boolean {
  const normalized = text.trim();
  if (normalized === "무료" || normalized === "0원") return true;
  return FREE_PATTERNS.some((re) => re.test(normalized));
}

function priceToBand(price: number): PriceBand {
  if (price === 0) return "FREE";
  if (price <= 30000) return "UNDER_30K";
  if (price <= 70000) return "UNDER_70K";
  return "OVER_70K";
}

/**
 * pcseguidance 자유 텍스트를 가격 밴드로 분류한다.
 * - 다수 등급이면 최저가 기준 밴드 (보수적)
 * - 파싱 실패/빈 문자열/가격 문의 등은 VARIABLE (거짓 제외 방지)
 */
export function parsePriceBand(
  priceGuidance: string | undefined | null,
): PriceBandResult {
  if (!priceGuidance || priceGuidance.trim() === "") {
    return { band: "VARIABLE", lowestPrice: null, label: BAND_LABELS.VARIABLE };
  }

  const text = priceGuidance.trim();

  // 무료/초대 판별
  if (isFreeText(text)) {
    return { band: "FREE", lowestPrice: 0, label: BAND_LABELS.FREE };
  }

  // 가격 추출
  const prices = extractPrices(text);

  if (prices.length === 0) {
    // 숫자 없음 = "가격 문의", "추후 공지" 등
    return { band: "VARIABLE", lowestPrice: null, label: BAND_LABELS.VARIABLE };
  }

  const lowest = Math.min(...prices);
  const band = priceToBand(lowest);
  return { band, lowestPrice: lowest, label: BAND_LABELS[band] };
}
