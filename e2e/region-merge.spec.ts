import { test, expect } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";

/**
 * D4 지역 다중 병합 플로우 (시도 레벨만; 구군은 R5 보류).
 * 서울 + 부산 선택 → 목록이 두 지역 병합 결과로 갱신되는지 검증.
 */
test("여러 시도를 선택하면 목록이 병합 결과로 갱신된다", async ({ page }) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  const regionTrigger = page.getByRole("button", { name: "지역" });

  // 서울 선택
  await regionTrigger.click();
  await page.getByRole("option", { name: "서울특별시" }).click();
  // 부산 추가 선택 (드롭다운 유지)
  await page.getByRole("option", { name: "부산광역시" }).click();
  await page.keyboard.press("Escape");

  // 병합 결과: 서울 2건 + 부산 2건 모두 노출
  await expect(page.getByRole("heading", { name: "서울 공연 A" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "서울 공연 B" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "부산 공연 A" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "부산 공연 B" })).toBeVisible();

  // URL에 두 시도코드가 병합되어 직렬화됨 (URL↔필터 라운드트립, §8)
  await expect(page).toHaveURL(/region=11%2C26|region=11,26/);
});
