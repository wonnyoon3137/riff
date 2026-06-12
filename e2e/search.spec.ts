import { test, expect } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";

/**
 * F5 공연명 검색 플로우 (S1 §2.3a).
 * 검색 입력 → 목록 갱신(?q= 동기화) → 상세 진입 → 뒤로가기 시 검색어 복원(D8).
 *
 * 결정론: 픽스처가 `q` 부분일치로 응답. "공연 7번"은 PAGE_1에서 유일 매칭
 * ("공연 17번"·"공연 27번"과 부분일치하지 않음).
 */
test("검색→목록 갱신→상세→뒤로가기 시 검색어가 복원된다", async ({ page }) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  // 초기: 전국 목록(공연 1번..30번)
  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();

  // 공연명 검색 입력 → debounce(300ms) 후 ?q= 동기화 + 재조회
  const search = page.getByRole("searchbox", { name: "공연명 검색" });
  await search.fill("공연 7번");

  await expect(page).toHaveURL(/q=/);
  // 검색어가 URL에 인코딩되어 들어감(space→'+'). URLSearchParams로 디코드해 확인.
  expect(new URL(page.url()).searchParams.get("q")).toBe("공연 7번");

  // 목록이 검색 결과로 좁혀짐(유일 매칭)
  await expect(page.getByRole("heading", { name: "공연 7번" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "공연 1번" })).toHaveCount(0);

  // 상세 진입
  await page.getByRole("link", { name: /공연 7번/ }).click();
  await expect(page).toHaveURL(/\/performances\//);
  await expect(
    page.getByRole("heading", { level: 1, name: "공연 7번" }),
  ).toBeVisible();

  // 뒤로가기 → 검색어가 입력창과 목록에 복원(D8)
  await page.goBack();
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByRole("searchbox", { name: "공연명 검색" })).toHaveValue(
    "공연 7번",
  );
  await expect(page.getByRole("heading", { name: "공연 7번" })).toBeVisible();
});

test("2자 미만 입력은 검색 미적용(전체 목록 유지, F5.4)", async ({ page }) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();

  const search = page.getByRole("searchbox", { name: "공연명 검색" });
  await search.fill("공");

  // 2자 미만 → ?q= 미동기화, 전체 목록 유지
  await expect(page.getByText("2자 이상")).toBeVisible();
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();
});

test("검색어만 입력해도 '필터 초기화' 버튼이 활성화되고 클릭 시 검색이 해제된다 (F5.3)", async ({
  page,
}) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  const search = page.getByRole("searchbox", { name: "공연명 검색" });
  await search.fill("공연 7번");
  await expect(page).toHaveURL(/q=/);

  // 검색어가 유일한 활성 상태여도 초기화 버튼은 활성(isDefault가 searchTerm 반영)
  const reset = page.getByRole("button", { name: "필터 초기화" });
  await expect(reset).toBeEnabled();
  await reset.click();

  // 초기화 → 검색어도 함께 비워짐
  await expect(page).not.toHaveURL(/q=/);
  await expect(search).toHaveValue("");
  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();
});

test("clear(X) 버튼으로 검색을 해제하면 전체 목록으로 복귀한다", async ({
  page,
}) => {
  await mockPerformanceApi(page);
  await page.goto("/");

  const search = page.getByRole("searchbox", { name: "공연명 검색" });
  await search.fill("공연 7번");
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByRole("heading", { name: "공연 7번" })).toBeVisible();

  await page.getByRole("button", { name: "검색어 지우기" }).click();

  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByRole("heading", { name: "공연 1번" })).toBeVisible();
});
