// 출연진(prfcast) 자유 텍스트 파서 PoC (v3 P2-1)
// prfcast 원문에서 사람/팀 이름 토큰을 분리·정제한다.
// 원문 보존 불변 — 추출 결과는 별도 데이터(PerformanceArtist)로 저장.
// 규칙 기반 PoC. 정확도 100% 불가 전제 (후단 수동 보정 P2-3 있음).

export interface CastExtraction {
  name: string; // 추출된 이름 (정제 후)
  rawExtract: string; // 원문에서 발췌한 부분
  role?: string; // 역할/배역 (추출 가능 시)
}

// ── 역할어 사전 ─────────────────────────────────────────────
// 이름 앞에 붙는 역할 접두어. 이름에서 제거하고 role로 분류.
const ROLE_PREFIXES = [
  "음악감독",
  "예술감독",
  "무대감독",
  "조연출",
  "연출",
  "작곡",
  "작사",
  "안무",
  "지휘",
  "협연",
  "출연",
  "독창",
  "독주",
  "반주",
  "해설",
  "진행",
  "사회",
  "객원",
] as const;

// 접미사: "외", "등" — 목록 끝에 붙는 불완전 표시
const SUFFIX_PARTICLES = /\s*[외등]\s*$/;

// 괄호 안 배역명 패턴: "홍길동(왕자역)" 또는 "홍길동(왕자)"
const PAREN_ROLE_RE = /^(.+?)\s*[(\uFF08](.+?)[)\uFF09]\s*$/;

// ── 내부 유틸 ───────────────────────────────────────────────

/**
 * 텍스트를 1차 세그먼트로 분할한다.
 * 슬래시(/) 구분이 역할 접두어와 함께 쓰이는 패턴을 우선 처리한다.
 * 예: "음악감독 홍길동 / 출연 김철수, 이영희"
 *   → ["음악감독 홍길동", "출연 김철수, 이영희"]
 */
function splitSegments(text: string): string[] {
  // 슬래시로 먼저 분할
  return text.split(/\s*\/\s*/).filter((s) => s.trim().length > 0);
}

/**
 * 세그먼트에서 역할 접두어를 감지·분리한다.
 * "음악감독 홍길동" → { role: "음악감독", rest: "홍길동" }
 * "김철수" → { role: undefined, rest: "김철수" }
 */
function extractRolePrefix(
  segment: string,
): { role: string | undefined; rest: string } {
  const trimmed = segment.trim();
  for (const prefix of ROLE_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length).trim();
      // 역할어 뒤에 실제 이름이 있는 경우만 역할로 인정
      if (rest.length > 0) {
        return { role: prefix, rest };
      }
    }
  }
  return { role: undefined, rest: trimmed };
}

/**
 * 개별 이름 토큰을 정제한다.
 * - 앞뒤 공백 제거
 * - "외", "등" 접미사 제거
 * - 괄호 안 배역명 추출
 */
function cleanNameToken(
  token: string,
  inheritedRole: string | undefined,
): CastExtraction | null {
  let cleaned = token.trim();
  if (cleaned.length === 0) return null;

  // "외", "등" 접미사 제거
  cleaned = cleaned.replace(SUFFIX_PARTICLES, "").trim();
  if (cleaned.length === 0) return null;

  // 괄호 안 배역명 추출: "홍길동(왕자역)"
  const parenMatch = PAREN_ROLE_RE.exec(cleaned);
  if (parenMatch) {
    const name = parenMatch[1].trim();
    const parenRole = parenMatch[2].trim();
    if (name.length === 0) return null;
    return {
      name,
      rawExtract: token.trim(),
      role: parenRole || inheritedRole,
    };
  }

  // 역할어 단독인지 체크: "출연", "연출" 등만 있으면 이름이 아님
  if (ROLE_PREFIXES.some((p) => cleaned === p)) return null;

  // 역할어가 이름 안에 남아있을 수 있는 경우 한번 더 체크
  // 예: 콤마 분할 후 "출연 김철수" 같은 토큰
  const { role: tokenRole, rest } = extractRolePrefix(cleaned);
  if (tokenRole) {
    if (rest.length === 0) return null;
    return {
      name: rest,
      rawExtract: token.trim(),
      role: tokenRole,
    };
  }

  if (cleaned.length === 0) return null;

  return {
    name: cleaned,
    rawExtract: token.trim(),
    ...(inheritedRole ? { role: inheritedRole } : {}),
  };
}

// ── 메인 함수 ───────────────────────────────────────────────

/**
 * prfcast 자유 텍스트에서 출연진 이름을 추출한다.
 *
 * 처리 패턴:
 * - 콤마 구분: "홍길동, 김철수, 이영희"
 * - 슬래시 구분: "홍길동 / 김철수"
 * - "외"/"등" 접미사: "홍길동, 김철수 외"
 * - 역할 접두: "음악감독 홍길동 / 출연 김철수, 이영희"
 * - 괄호 배역: "홍길동(주인공역), 김철수(조연)"
 *
 * @param prfcast - KOPIS prfcast 필드 원문
 * @returns 추출된 출연진 배열. 빈 입력이나 추출 실패 시 빈 배열.
 */
export function extractCastNames(
  prfcast: string | null | undefined,
): CastExtraction[] {
  if (!prfcast || prfcast.trim() === "") {
    return [];
  }

  const text = prfcast.trim();
  const results: CastExtraction[] = [];

  // 1단계: 슬래시로 세그먼트 분할
  const segments = splitSegments(text);

  for (const segment of segments) {
    // 2단계: 세그먼트에서 역할 접두어 분리
    const { role: segmentRole, rest } = extractRolePrefix(segment);

    // 3단계: 콤마로 개별 이름 분할
    const nameTokens = rest.split(/\s*,\s*/);

    for (const token of nameTokens) {
      const extraction = cleanNameToken(token, segmentRole);
      if (extraction) {
        results.push(extraction);
      }
    }
  }

  return results;
}
