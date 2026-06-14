import { test, expect } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";

/**
 * 인증 관련 E2E (P4-5).
 *
 * 실제 OAuth 플로우는 외부 provider 의존이라 E2E 범위 밖.
 * - 로그인 페이지 렌더링 검증
 * - 헤더 비로그인 상태 UI 검증
 * - 비로그인 상태에서 기존 탐색 기능 정상 동작 (회귀 방지)
 */

test.describe("S3 로그인 페이지", () => {
  test("/login 접근 시 로그인 페이지가 렌더링된다", async ({ page }) => {
    await page.goto("/login");

    // 페이지 기본 구성 요소
    await expect(page.getByText("Riff")).toBeVisible();
    await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();

    // 소셜 로그인 버튼 2개 렌더링
    await expect(
      page.getByRole("button", { name: "카카오 계정으로 로그인" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "구글 계정으로 로그인" }),
    ).toBeVisible();

    // 약관 동의 텍스트
    await expect(page.getByText("이용약관")).toBeVisible();
    await expect(page.getByText("개인정보처리방침")).toBeVisible();
  });
});

test.describe("헤더 인증 상태 UI", () => {
  test("비로그인 상태에서 헤더에 '로그인' 버튼이 표시된다", async ({ page }) => {
    await mockPerformanceApi(page);
    await page.goto("/");

    const loginLink = page.getByRole("link", { name: "로그인" });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("헤더 '로그인' 버튼 클릭 시 /login으로 이동한다", async ({ page }) => {
    await mockPerformanceApi(page);
    await page.goto("/");

    await page.getByRole("link", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  });
});

test.describe("비로그인 회귀 방지", () => {
  test("비로그인 상태에서 공연 목록 탐색이 정상 동작한다", async ({ page }) => {
    await mockPerformanceApi(page);
    await page.goto("/");

    // 전국 기본 목록 렌더링 (NATIONWIDE_PAGE_1 첫 항목)
    await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();

    // 필터(지역) 동작 확인
    const regionTrigger = page.getByRole("button", { name: "지역" });
    await regionTrigger.click();
    await expect(page.getByRole("option", { name: "서울특별시" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("비로그인 상태에서 공연 상세 진입이 정상 동작한다", async ({ page }) => {
    await mockPerformanceApi(page);
    await page.goto("/");

    // 전국 기본 목록의 첫 항목 클릭 → 상세
    await page.getByRole("link", { name: /공연 1번/ }).first().click();
    await expect(page).toHaveURL(/\/performances\/PERF-001$/);
    await expect(page.getByRole("heading", { level: 1, name: "공연 1번" })).toBeVisible();
  });
});
