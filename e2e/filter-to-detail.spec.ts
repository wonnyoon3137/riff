import { test, expect } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";

/**
 * 필터→상세 플로우.
 * 필터(지역) 적용 → 목록 갱신 → 항목 클릭 → 상세(S2) 진입 → 데이터 일치 검증.
 */
test("필터 적용 후 항목 클릭 시 상세 데이터가 일치한다", async ({ page }) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  // 데스크톱 필터바의 '지역' 트리거 (모바일 패널 DOM은 viewport상 숨김)
  const regionTrigger = page.getByRole("button", { name: "지역" });
  await regionTrigger.click();

  // 서울만 선택 → 목록이 서울 픽스처로 갱신
  await page.getByRole("option", { name: "서울특별시" }).click();
  await page.keyboard.press("Escape");

  // 필터 URL 동기화(debounce 300ms)가 정착될 때까지 대기.
  // 정착 전 클릭하면 보류 중인 router.replace가 네비게이션을 덮어쓴다(알려진 레이스).
  await expect(page).toHaveURL(/region=11/);

  const targetCard = page.getByRole("heading", { name: "서울 공연 A" });
  await expect(targetCard).toBeVisible();

  // 항목 클릭 → 상세 진입
  await page.getByRole("link", { name: /서울 공연 A/ }).click();

  await expect(page).toHaveURL(/\/performances\/SEOUL-1$/);

  // 상세(S2) 데이터 일치: 제목(h1)과 원문 보존 필드들
  await expect(page.getByRole("heading", { level: 1, name: "서울 공연 A" })).toBeVisible();
  await expect(page.getByText("러닝타임 120분")).toBeVisible();
  await expect(page.getByText("홍길동, 김철수")).toBeVisible();
  await expect(page.getByText("테스트 공연 줄거리 원문 보존 확인용 텍스트.")).toBeVisible();
});
