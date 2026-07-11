import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";
import { setAuthCookie } from "./fixtures/auth";

/**
 * Following Feed(F11) E2E (P6-3).
 *
 * 결정론 보장: 모든 외부 의존(BFF /api/follows/feed, 인증 /api/auth/session,
 * 팔로우 /api/follows)을 네트워크 레벨에서 모킹한다. 실 KOPIS/OAuth/DB 의존 없음.
 *
 * 인증 전략(v6 Following E2E와 동일):
 * - middleware: setAuthCookie()로 JWE 쿠키 주입
 * - 클라이언트 useSession: mockAuthenticated()로 /api/auth/session 모킹
 */

const TEST_USER = {
  id: "user-test-1",
  name: "테스트 유저",
  email: "test@example.com",
};

const SESSION_FIXTURE = {
  user: { id: TEST_USER.id, name: TEST_USER.name, email: TEST_USER.email },
  expires: "2999-01-01T00:00:00.000Z",
};

async function mockAuthenticated(page: Page): Promise<void> {
  await page.route("**/api/auth/session", async (route: Route) => {
    await route.fulfill({ json: SESSION_FIXTURE });
  });
}

/** /api/follows/feed 응답 모킹 헬퍼. */
async function mockFollowingFeed(
  page: Page,
  response: { performances: unknown[]; hasFollowedArtists: boolean },
): Promise<void> {
  await page.route("**/api/follows/feed", async (route: Route) => {
    await route.fulfill({ json: response });
  });
}

/** AppBar 드롭다운 열기용: /api/follows 빈 응답(팔로우 상태 초기화). */
async function mockFollowsEmpty(page: Page): Promise<void> {
  await page.route("**/api/follows", async (route: Route) => {
    await route.fulfill({ json: { artists: [] } });
  });
}

test.describe("F11 Following Feed — /following-feed 접근 제어", () => {
  test("시나리오1: 비로그인 상태에서 /following-feed 접근 시 /login으로 redirect된다", async ({
    page,
  }) => {
    await page.goto("/following-feed");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "로그인" }),
    ).toBeVisible();
  });
});

test.describe("F11 Following Feed — 공연 목록 렌더링", () => {
  test("시나리오2: 로그인 + 팔로잉 공연 있음 → 공연 카드가 렌더링된다", async ({
    page,
  }) => {
    await setAuthCookie(page, TEST_USER);
    await mockAuthenticated(page);
    await mockFollowsEmpty(page);
    await mockFollowingFeed(page, {
      hasFollowedArtists: true,
      performances: [
        {
          id: "FEED-001",
          title: "팔로잉 공연 테스트",
          period: { from: "2026-08-01", to: "2026-08-31" },
          venueName: "테스트 공연장",
          area: "서울",
          genreLabel: "뮤지컬",
          genre: "MUSICAL",
          state: "UPCOMING",
        },
      ],
    });
    await mockPerformanceApi(page);

    await page.goto("/following-feed");
    await expect(
      page.getByRole("heading", { name: "팔로잉 공연", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /팔로잉 공연 테스트/ }),
    ).toBeVisible();
  });

  test("시나리오3: 로그인 + 팔로잉 아티스트 없음 → 팔로우 유도 빈 상태가 표시된다", async ({
    page,
  }) => {
    await setAuthCookie(page, TEST_USER);
    await mockAuthenticated(page);
    await mockFollowsEmpty(page);
    await mockFollowingFeed(page, {
      hasFollowedArtists: false,
      performances: [],
    });
    await mockPerformanceApi(page);

    await page.goto("/following-feed");
    await expect(
      page.getByText(/아직 팔로잉한 아티스트가 없어요/),
    ).toBeVisible();
    // 팔로우하러 가기 링크 존재 확인
    await expect(
      page.getByRole("link", { name: /아티스트 팔로우하러 가기/ }),
    ).toBeVisible();
  });

  test("시나리오4: 로그인 + 팔로잉 있으나 다가오는 공연 없음 → 공연 없음 메시지가 표시된다", async ({
    page,
  }) => {
    await setAuthCookie(page, TEST_USER);
    await mockAuthenticated(page);
    await mockFollowsEmpty(page);
    await mockFollowingFeed(page, {
      hasFollowedArtists: true,
      performances: [],
    });
    await mockPerformanceApi(page);

    await page.goto("/following-feed");
    await expect(
      page.getByText(/팔로잉 아티스트의 다가오는 공연이 없습니다/),
    ).toBeVisible();
  });
});

test.describe("F11 Following Feed — AppBar 드롭다운 링크", () => {
  test('시나리오5: 로그인 상태 AppBar 드롭다운 "팔로잉 공연" 클릭 시 /following-feed로 이동한다', async ({
    page,
  }) => {
    await setAuthCookie(page, TEST_USER);
    await mockAuthenticated(page);
    await mockFollowsEmpty(page);
    await mockFollowingFeed(page, {
      hasFollowedArtists: false,
      performances: [],
    });
    await mockPerformanceApi(page);

    await page.goto("/");
    // 프로필 버튼으로 드롭다운 열기
    await page
      .getByRole("button", { name: /테스트 유저|프로필/ })
      .click();
    // 드롭다운에서 "팔로잉 공연" 링크 클릭
    await page.getByRole("menuitem", { name: "팔로잉 공연" }).click();
    await expect(page).toHaveURL(/\/following-feed/);
    await expect(
      page.getByRole("heading", { name: "팔로잉 공연", exact: true }),
    ).toBeVisible();
  });
});
