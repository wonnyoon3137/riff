import { test, expect } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";

/**
 * D8 상태 보존 플로우 + 회귀 가드(#22, #23).
 */

/**
 * #23 회귀: 무한 스크롤로 2페이지 로드한 위치에서 상세 진입 → 뒤로가기 시
 * loadedPages가 복원되어 2페이지가 다시 채워지고, 2페이지 영역의 스크롤
 * 오프셋이 클램프 없이 복원된다.
 */
test("2페이지 로드 후 상세 진입→뒤로가기 시 페이지 수와 스크롤 위치가 복원된다", async ({
  page,
}) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  // 1) 1페이지(30건) 렌더 확인
  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();

  // 2) 하단으로 스크롤해 2페이지(공연 31~60번) 로드 트리거
  await page.getByRole("heading", { name: "공연 30번" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "공연 45번" })).toBeVisible();

  // 3) 2페이지 영역의 카드까지 스크롤 → 1페이지만으로는 불가능한 오프셋 형성
  await page.getByRole("heading", { name: "공연 50번" }).scrollIntoViewIfNeeded();
  const savedScrollY = await page.evaluate(() => window.scrollY);

  // 4) 2페이지 카드 클릭 → 상세 진입 (saveScroll: loadedPages=2 저장)
  await page.getByRole("link", { name: /공연 50번/ }).click();
  await expect(page).toHaveURL(/\/performances\/PERF-050$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "공연 50번" }),
  ).toBeVisible();

  // 5) 뒤로가기 → 목록 복원
  await page.goBack();

  // 2페이지 카드가 다시 렌더(loadedPages 복원으로 콘텐츠 높이 확보)
  await expect(page.getByRole("heading", { name: "공연 50번" })).toBeVisible();

  // 스크롤 위치가 클램프 없이 저장 위치 부근으로 복원 (rAF 기반 → 폴링)
  await expect
    .poll(async () => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeGreaterThan(savedScrollY - 200);
});

/**
 * #22 회귀: 지역 필터 선택 직후(debounce 300ms 내) 카드를 클릭해도
 * 보류 중이던 router.replace가 상세 네비게이션을 덮어쓰지 않는다.
 */
test("필터 선택 직후 카드 클릭 시 상세 진입이 유지된다 (debounce 레이스 없음)", async ({
  page,
}) => {
  await mockPerformanceApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();

  // 1) 정렬 필터를 변경해 debounce URL 동기화를 보류 상태로 만든다.
  await page.getByRole("button", { name: "시작일 먼 순" }).click();

  // 2) debounce(300ms)가 끝나기 전에 곧바로 카드 클릭 → 상세 진입 시도.
  //    flush가 동작하지 않으면 보류된 replace가 상세 진입을 덮어써 목록으로 복귀한다.
  await page.getByRole("link", { name: /공연 1번/ }).click();

  // 3) 상세 URL 유지 + 상세 헤딩 표시. 그리고 보류 replace로 인해 목록으로
  //    되돌아가지 않는지 잠시 안정성 확인.
  await expect(page).toHaveURL(/\/performances\/PERF-001$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "공연 1번" }),
  ).toBeVisible();
  await page.waitForTimeout(400); // debounce 윈도우 + 여유
  await expect(page).toHaveURL(/\/performances\/PERF-001$/);
});

/**
 * 기존 계약: 필터(정렬) + 스크롤 위치 복원 (1페이지 범위).
 */
test("상세 진입 후 뒤로가면 필터와 스크롤 위치가 복원된다", async ({ page }) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  await page.getByRole("button", { name: "시작일 먼 순" }).click();
  await expect(page).toHaveURL(/sort=start_desc/);

  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();
  await page.getByRole("heading", { name: "공연 24번" }).scrollIntoViewIfNeeded();

  const savedScrollY = await page.evaluate(() => window.scrollY);
  expect(savedScrollY).toBeGreaterThan(200);

  await page.getByRole("link", { name: /공연 24번/ }).click();
  await expect(page).toHaveURL(/\/performances\/PERF-024$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "공연 24번" }),
  ).toBeVisible();

  await page.goBack();

  await expect(page).toHaveURL(/sort=start_desc/);
  await expect(
    page.getByRole("button", { name: "시작일 먼 순" }),
  ).toHaveAttribute("aria-pressed", "true");

  await expect
    .poll(async () => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeGreaterThan(savedScrollY - 150);
});
