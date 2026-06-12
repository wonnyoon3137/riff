import { test, expect } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";

/**
 * v4 Q-1 (#45): 가격 밴드 칩 E2E.
 *
 * 상세 페이지(/performances/[mt20id])의 가격 영역에 밴드 칩이 표시되는지 검증.
 * 픽스처의 priceGuidance("R석 100,000원 / S석 80,000원")는 최저가 80,000원이므로
 * parsePriceBand -> OVER_70K -> 라벨 "7만+" 으로 분류된다.
 */

const VALID_BAND_LABELS = ["무료/초대", "~3만", "3~7만", "7만+", "가변/미정"];

test.describe("가격 밴드 칩", () => {
  test.beforeEach(async ({ page }) => {
    await mockPerformanceApi(page);
  });

  test("목록에서 공연 클릭 -> 상세의 가격 영역에 밴드 칩이 표시된다", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();

    // 목록에서 첫 카드 클릭 -> 상세 진입
    await page.getByRole("link", { name: /공연 1번/ }).click();
    await expect(page).toHaveURL(/\/performances\/PERF-001$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "공연 1번" }),
    ).toBeVisible();

    // 가격 섹션 존재 확인 (h2 "가격")
    const priceHeading = page.getByRole("heading", {
      level: 2,
      name: "가격",
    });
    await expect(priceHeading).toBeVisible();

    // 가격 원문 보존 확인
    await expect(
      page.getByText("R석 100,000원 / S석 80,000원"),
    ).toBeVisible();

    // 가격 밴드 칩 존재: heading row 근처에 밴드 라벨이 표시됨
    // 픽스처 priceGuidance의 최저가 80,000원 -> OVER_70K -> "7만+"
    const priceSection = priceHeading.locator("..");
    const chipText = await priceSection
      .locator("span")
      .filter({ hasText: /^(무료\/초대|~3만|3~7만|7만\+|가변\/미정)$/ })
      .first()
      .textContent();

    expect(chipText).toBeTruthy();
    expect(VALID_BAND_LABELS).toContain(chipText);
    // 구체적으로 OVER_70K 밴드 확인
    expect(chipText).toBe("7만+");
  });

  test("가격 밴드 칩 텍스트가 5종 밴드 중 하나이다", async ({ page }) => {
    // 서울 공연 A 상세로 직접 진입
    await page.goto("/");
    await mockPerformanceApi(page);

    // 지역 필터로 서울 선택 후 상세 진입
    const regionTrigger = page.getByRole("button", { name: "지역" });
    await regionTrigger.click();
    await page.getByRole("option", { name: "서울특별시" }).click();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/region=11/);

    await expect(
      page.getByRole("heading", { name: "서울 공연 A" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /서울 공연 A/ }).click();
    await expect(page).toHaveURL(/\/performances\/SEOUL-1$/);

    // 가격 섹션의 밴드 칩 검증
    const priceHeading = page.getByRole("heading", {
      level: 2,
      name: "가격",
    });
    await expect(priceHeading).toBeVisible();

    const priceSection = priceHeading.locator("..");
    const chipText = await priceSection
      .locator("span")
      .filter({ hasText: /^(무료\/초대|~3만|3~7만|7만\+|가변\/미정)$/ })
      .first()
      .textContent();

    expect(chipText).toBeTruthy();
    expect(VALID_BAND_LABELS).toContain(chipText);
  });
});
