import { test, expect } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";

/**
 * D8 상태 보존 플로우.
 * 필터 적용 + 스크롤 → 상세 진입 → 뒤로가기 → 목록 상태(필터·스크롤 위치) 복원.
 */
test("상세 진입 후 뒤로가면 필터와 스크롤 위치가 복원된다", async ({ page }) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  // 1) 정렬 필터 변경 → URL에 반영(상태 보존 대상)
  await page.getByRole("button", { name: "시작일 먼 순" }).click();
  await expect(page).toHaveURL(/sort=start_desc/);

  // 2) 첫 페이지(30건) 내에서 스크롤 위치 형성.
  //    (스크롤 복원은 재방문 시 1페이지만 재요청하므로 2페이지가 필요한
  //     위치는 현재 복원되지 않는다 — 한계는 보고서에 별도 기록.)
  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();
  // 첫 페이지의 아래쪽 카드까지 스크롤
  await page.getByRole("heading", { name: "공연 24번" }).scrollIntoViewIfNeeded();

  const savedScrollY = await page.evaluate(() => window.scrollY);
  expect(savedScrollY).toBeGreaterThan(200);

  // 3) 현재 뷰포트에 보이는 카드를 클릭 → 상세 진입 (saveScroll 트리거).
  //    스크롤 위치 근처의 카드를 골라야 click 전 자동 스크롤로 위치가 바뀌지 않는다.
  await page.getByRole("link", { name: /공연 24번/ }).click();
  await expect(page).toHaveURL(/\/performances\/PERF-024$/);
  await expect(page.getByRole("heading", { level: 1, name: "공연 24번" })).toBeVisible();

  // 4) 뒤로가기 → 목록 복원
  await page.goBack();

  // 필터(정렬) 복원: URL과 활성 버튼 상태
  await expect(page).toHaveURL(/sort=start_desc/);
  await expect(
    page.getByRole("button", { name: "시작일 먼 순" }),
  ).toHaveAttribute("aria-pressed", "true");

  // 스크롤 위치 복원 (requestAnimationFrame 기반이므로 폴링).
  // 저장 위치 부근으로 복원되었는지 확인(약간의 오차 허용).
  await expect
    .poll(async () => page.evaluate(() => window.scrollY), {
      timeout: 5000,
    })
    .toBeGreaterThan(savedScrollY - 150);
});
