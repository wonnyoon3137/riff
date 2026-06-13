import { test, expect } from "@playwright/test";
import {
  mockPerformanceApi,
  mockArtistSearchApi,
} from "./fixtures/performances";

/**
 * v4 P3-4 (#60): 아티스트 필터 E2E.
 *
 * ArtistFilter 자동완성 -> 선택 -> URL ?artist=<id> 반영 -> 목록 교차 필터.
 * 상세 페이지 ArtistChip 클릭 -> 목록 필터 적용.
 * D8 상태 복원(뒤로가기 시 아티스트 필터 유지).
 *
 * 픽스처:
 * - 홍길동(artist-1): PERF-001, PERF-003, PERF-005 출연
 * - 김철수(artist-2): PERF-002, PERF-004 출연
 * - 전국 목록: 공연 1번(PERF-001) ~ 공연 30번(PERF-030)
 */

test.describe("아티스트 필터", () => {
  test.beforeEach(async ({ page }) => {
    await mockPerformanceApi(page);
    await mockArtistSearchApi(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("자동완성 입력 -> 후보 표시 -> 선택 -> 결과 필터링 + URL 반영", async ({
    page,
  }) => {
    // 아티스트 필터 트리거 클릭
    const trigger = page.getByRole("button", { name: "아티스트" });
    await trigger.click();

    // 검색 입력란에 "홍길동" 입력
    const searchInput = page.getByRole("textbox", { name: "아티스트 검색" });
    await expect(searchInput).toBeVisible();
    await searchInput.fill("홍길동");

    // 자동완성 후보 표시 대기 (300ms debounce + network)
    const option = page.getByRole("option", { name: /홍길동/ });
    await expect(option).toBeVisible({ timeout: 5_000 });

    // 홍길동 선택
    await option.click();

    // URL에 ?artist=artist-1 반영
    await expect(page).toHaveURL(/artist=artist-1/, { timeout: 10_000 });

    // 목록이 홍길동 출연 공연으로 필터링 (PERF-001, PERF-003, PERF-005)
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 3번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 5번" }),
    ).toBeVisible();

    // 홍길동 미출연 공연은 사라짐
    await expect(
      page.getByRole("heading", { name: "공연 2번" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "공연 10번" }),
    ).toHaveCount(0);
  });

  test("2자 미만 입력 시 자동완성 미표시 (F8 가드)", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "아티스트" });
    await trigger.click();

    const searchInput = page.getByRole("textbox", { name: "아티스트 검색" });
    await searchInput.fill("홍");

    // 2자 미만 -> 힌트 메시지 표시, 후보 미표시
    await expect(page.getByText("2자 이상")).toBeVisible();
    await expect(
      page.getByRole("option", { name: /홍길동/ }),
    ).toHaveCount(0);
  });

  test("아티스트 필터 해제 -> 전체 목록 복귀", async ({ page }) => {
    // 홍길동 선택
    const trigger = page.getByRole("button", { name: "아티스트" });
    await trigger.click();
    const searchInput = page.getByRole("textbox", { name: "아티스트 검색" });
    await searchInput.fill("홍길동");
    await page.getByRole("option", { name: /홍길동/ }).click();
    await expect(page).toHaveURL(/artist=artist-1/, { timeout: 10_000 });

    // 선택된 아티스트 칩의 제거 버튼 클릭
    await page.getByRole("button", { name: "홍길동 제거" }).click();

    // URL에서 artist 파라미터 사라짐
    await expect(page).not.toHaveURL(/artist=/, { timeout: 10_000 });

    // 전체 목록 복귀
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 2번" }),
    ).toBeVisible();
  });

  test("아티스트 + 장르 필터 AND 결합", async ({ page }) => {
    // 뮤지컬 장르 선택 (픽스처 기본 genre=MUSICAL)
    const musicalChip = page.getByRole("button", { name: "뮤지컬" });
    await musicalChip.click();
    await expect(page).toHaveURL(/genre=musical/, { timeout: 10_000 });

    // 홍길동 아티스트 선택
    const artistTrigger = page.getByRole("button", { name: "아티스트" });
    await artistTrigger.click();
    const searchInput = page.getByRole("textbox", { name: "아티스트 검색" });
    await searchInput.fill("홍길동");
    await page.getByRole("option", { name: /홍길동/ }).click();

    // URL에 genre + artist 모두 반영
    await expect(page).toHaveURL(/artist=artist-1/, { timeout: 10_000 });
    await expect(page).toHaveURL(/genre=musical/);

    // AND 결합: 뮤지컬 + 홍길동 출연 공연만 표시
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 3번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 2번" }),
    ).toHaveCount(0);
  });

  test("상세 페이지 아티스트 칩 클릭 -> 목록으로 이동 + ?artist=<id> 적용", async ({
    page,
  }) => {
    // 공연 1번 상세 진입 (PERF-001 -> matchedArtists에 홍길동)
    await page.getByRole("link", { name: /공연 1번/ }).click();
    await expect(page).toHaveURL(/\/performances\/PERF-001/);
    await expect(
      page.getByRole("heading", { level: 1, name: "공연 1번" }),
    ).toBeVisible();

    // 출연 섹션에 홍길동 아티스트 칩 표시 확인
    const artistChip = page.getByRole("link", { name: /홍길동/ });
    await expect(artistChip).toBeVisible({ timeout: 10_000 });

    // 아티스트 칩 클릭 -> 목록으로 이동 + ?artist=artist-1
    await artistChip.click();

    // 목록 페이지로 이동 + artist 필터 적용
    await expect(page).toHaveURL(/\/?.*artist=artist-1/, { timeout: 10_000 });

    // 목록이 홍길동 출연 공연으로 필터링
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 3번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 2번" }),
    ).toHaveCount(0);
  });

  test("뒤로가기 시 아티스트 필터 상태가 복원된다 (D8)", async ({ page }) => {
    // 홍길동 선택
    const trigger = page.getByRole("button", { name: "아티스트" });
    await trigger.click();
    const searchInput = page.getByRole("textbox", { name: "아티스트 검색" });
    await searchInput.fill("홍길동");
    await page.getByRole("option", { name: /홍길동/ }).click();
    await expect(page).toHaveURL(/artist=artist-1/, { timeout: 10_000 });

    // 필터링된 목록 확인
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();

    // 상세 진입
    await page.getByRole("link", { name: /공연 1번/ }).click();
    await expect(page).toHaveURL(/\/performances\/PERF-001/);
    await expect(
      page.getByRole("heading", { level: 1, name: "공연 1번" }),
    ).toBeVisible();

    // 뒤로가기
    await page.goBack();

    // URL에 artist 파라미터 복원
    await expect(page).toHaveURL(/artist=artist-1/, { timeout: 10_000 });

    // 필터링된 목록 복원 (홍길동 출연 공연만)
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 3번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 2번" }),
    ).toHaveCount(0);
  });

  test("필터 초기화 시 아티스트 필터도 해제된다", async ({ page }) => {
    // 홍길동 선택
    const trigger = page.getByRole("button", { name: "아티스트" });
    await trigger.click();
    const searchInput = page.getByRole("textbox", { name: "아티스트 검색" });
    await searchInput.fill("홍길동");
    await page.getByRole("option", { name: /홍길동/ }).click();
    await expect(page).toHaveURL(/artist=artist-1/, { timeout: 10_000 });

    // 필터 초기화 버튼 클릭
    const reset = page.getByRole("button", { name: "필터 초기화" });
    await expect(reset).toBeEnabled();
    await reset.click();

    // artist 파라미터 사라짐
    await expect(page).not.toHaveURL(/artist=/, { timeout: 10_000 });

    // 전체 목록 복귀
    await expect(
      page.getByRole("heading", { name: "공연 1번" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "공연 2번" }),
    ).toBeVisible();
  });

  test("자동완성에서 부분일치 결과가 정확히 표시된다 (aliases 포함)", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: "아티스트" });
    await trigger.click();
    const searchInput = page.getByRole("textbox", { name: "아티스트 검색" });

    // "홍길" 입력 -> 홍길동, 홍길순 모두 부분일치
    await searchInput.fill("홍길");
    await expect(
      page.getByRole("option", { name: /홍길동/ }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("option", { name: /홍길순/ }),
    ).toBeVisible();

    // "김철" -> 김철수만 매칭
    await searchInput.fill("김철");
    await expect(
      page.getByRole("option", { name: /김철수/ }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("option", { name: /홍길동/ }),
    ).toHaveCount(0);
  });
});
