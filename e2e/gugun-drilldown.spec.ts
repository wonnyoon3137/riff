import { test, expect } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";

/**
 * v4 Q-1 (#45): 구군 드릴다운 E2E.
 *
 * 시도 선택 -> 구군 목록 펼침 -> 구군 선택 -> URL 반영 -> 결과 갱신.
 * RegionFilter의 drilldown UI와 filter-url 직렬화(region=11:1168)를 검증한다.
 */

test.describe("구군 드릴다운", () => {
  test.beforeEach(async ({ page }) => {
    await mockPerformanceApi(page);
    await page.goto("/");
    // 초기 목록 렌더 대기
    await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();
  });

  test("시도(서울) 구군 드릴다운 -> 강남구 선택 -> URL에 region=11:1168 반영 + 결과 갱신", async ({
    page,
  }) => {
    // 1) 지역 드롭다운 열기
    const regionTrigger = page.getByRole("button", { name: "지역" });
    await regionTrigger.click();

    // 2) 서울특별시 행의 드릴다운(chevron) 버튼 클릭 -> 구군 목록 진입
    await page
      .getByRole("button", { name: "서울특별시 구군 선택" })
      .click();

    // 3) 구군 드릴다운 뷰: "서울특별시" 뒤로가기 헤더 + 강남구 옵션 확인
    const listbox = page.getByRole("listbox", {
      name: "서울특별시 구군 선택",
    });
    await expect(listbox).toBeVisible();
    await expect(
      page.getByRole("option", { name: "강남구" }),
    ).toBeVisible();

    // 4) 강남구 선택
    await page.getByRole("option", { name: "강남구" }).click();
    await page.keyboard.press("Escape");

    // 5) URL에 region=11:1168 반영 확인
    await expect(page).toHaveURL(/region=11%3A1168|region=11:1168/);

    // 6) 목록이 강남구 픽스처로 갱신
    await expect(
      page.getByRole("heading", { name: "강남 공연 A" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "강남 공연 B" }),
    ).toBeVisible();

    // 7) 전국 기본 목록 항목은 사라짐
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toHaveCount(0);
  });

  test("구군 선택 해제 -> 시도 전체로 복귀", async ({ page }) => {
    // 1) 강남구 선택까지 진행
    const regionTrigger = page.getByRole("button", { name: "지역" });
    await regionTrigger.click();
    await page
      .getByRole("button", { name: "서울특별시 구군 선택" })
      .click();
    await page.getByRole("option", { name: "강남구" }).click();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/region=11%3A1168|region=11:1168/);

    // 2) 칩에서 강남구 제거 (label: "서울 강남구 제거")
    await page.getByRole("button", { name: /강남구 제거/ }).click();

    // 3) 전국으로 복귀: region 파라미터 없어짐
    await expect(page).not.toHaveURL(/region=/);

    // 4) 전국 기본 목록 복귀
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();
  });

  test("전국 선택 시 기존 구군 선택이 해제된다", async ({ page }) => {
    // 1) 강남구 선택
    const regionTrigger = page.getByRole("button", { name: "지역" });
    await regionTrigger.click();
    await page
      .getByRole("button", { name: "서울특별시 구군 선택" })
      .click();
    await page.getByRole("option", { name: "강남구" }).click();
    // 뒤로가기로 시도 목록으로 돌아감
    await page.getByText("서울특별시").first().click();
    await expect(page).toHaveURL(/region=/);

    // 2) 전국 선택
    await page.getByRole("option", { name: "전국" }).click();
    await page.keyboard.press("Escape");

    // 3) region 파라미터 해제
    await expect(page).not.toHaveURL(/region=/);

    // 4) 전국 목록 복귀
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();
  });

  test("시도 전체 선택(서울특별시 전체) 시 구군 선택이 시도 레벨로 승격된다", async ({
    page,
  }) => {
    // 1) 강남구 선택
    const regionTrigger = page.getByRole("button", { name: "지역" });
    await regionTrigger.click();
    await page
      .getByRole("button", { name: "서울특별시 구군 선택" })
      .click();
    await page.getByRole("option", { name: "강남구" }).click();

    // 2) "서울특별시 전체" 선택 -> 구군 코드 사라지고 시도 코드만
    await page.getByRole("option", { name: "서울특별시 전체" }).click();
    await page.keyboard.press("Escape");

    // URL: region=11 (구군 코드 없음)
    await expect(page).toHaveURL(/region=11(?![\d:])/);

    // 서울 시도 레벨 픽스처 결과
    await expect(
      page.getByRole("heading", { name: "서울 공연 A" }),
    ).toBeVisible();
  });
});
