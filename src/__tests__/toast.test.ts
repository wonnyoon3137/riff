import { describe, it, expect } from "vitest";
import { TOAST_DURATION_MS } from "@/components/common/Toast";

/**
 * D3 / T-08: 31일 초과 진입 시 인라인 토스트 안내.
 * 컴포넌트 렌더 테스트는 현 vitest(node) 환경 범위 밖이므로,
 * 토스트 계약 상수(스펙: screens.md §1.5 "노출 3초")를 검증한다.
 */
describe("Toast 계약 (screens.md §1.5)", () => {
  it("노출 시간은 3초(3000ms)", () => {
    expect(TOAST_DURATION_MS).toBe(3000);
  });
});
