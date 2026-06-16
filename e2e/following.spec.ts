import { test, expect } from "@playwright/test";
import type { Page, Route } from "@playwright/test";
import { mockPerformanceApi } from "./fixtures/performances";
import { setAuthCookie } from "./fixtures/auth";

/**
 * Following(F10) E2E (P5-3).
 *
 * 결정론 보장: 모든 외부 의존(BFF /api/performances*, 인증 /api/auth/session,
 * 팔로우 /api/follows)을 네트워크 레벨에서 모킹한다. 실 KOPIS/OAuth/DB 의존 없음.
 *
 * 인증 전략:
 * - middleware authorized 콜백은 실제 JWT 쿠키를 검증한다.
 *   → setAuthCookie()로 테스트 AUTH_SECRET 서명 JWE 쿠키를 주입.
 * - 클라이언트 측 useSession()은 /api/auth/session을 호출한다.
 *   → mockAuthenticated()로 세션 응답을 모킹.
 * - 두 레이어를 모두 처리해야 로그인 시나리오가 E2E에서 동작한다.
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

/** next-auth useSession이 호출하는 /api/auth/session을 로그인 상태로 모킹. */
async function mockAuthenticated(page: Page): Promise<void> {
  await page.route("**/api/auth/session", async (route: Route) => {
    await route.fulfill({ json: SESSION_FIXTURE });
  });
}

/**
 * 팔로우 버튼이 표시되도록, 숫자 id를 가진 matchedArtist를 포함한 상세 응답을
 * PERF-FOLLOW에 한해 주입한다.
 * 주의: mockPerformanceApi보다 나중에 등록해야 우선 매칭된다(Playwright는 나중
 * 등록 라우트가 먼저 처리됨).
 */
const FOLLOW_ARTIST = { id: 1, name: "테스트 아티스트" };
const FOLLOW_PERF_ID = "PERF-FOLLOW";

async function mockFollowablePerformanceDetail(page: Page): Promise<void> {
  await page.route(
    `**/api/performances/${FOLLOW_PERF_ID}`,
    async (route: Route) => {
      await route.fulfill({
        json: {
          id: FOLLOW_PERF_ID,
          title: "팔로우 테스트 공연",
          period: { from: "2026-06-01", to: "2026-06-30" },
          venueName: "테스트 공연장",
          area: "서울",
          genreLabel: "뮤지컬",
          genre: "MUSICAL",
          state: "ONGOING",
          venueId: "FC001",
          venueAddress: "서울특별시 종로구 테스트로 1",
          ageGuidance: "만 7세 이상",
          runtime: "120분",
          cast: "테스트 아티스트",
          story: "원문 보존 확인용.",
          priceGuidance: "R석 100,000원",
          introImages: [],
          bookings: [],
          matchedArtists: [
            {
              id: String(FOLLOW_ARTIST.id),
              name: FOLLOW_ARTIST.name,
              role: "주연",
              rawExtract: FOLLOW_ARTIST.name,
            },
          ],
        },
      });
    },
  );
}

test.describe("F10 Following — ArtistChip 팔로우 버튼", () => {
  test("시나리오1: 비로그인 상태에서는 ArtistChip 팔로우 버튼이 표시되지 않는다", async ({
    page,
  }) => {
    // 일반 mock 먼저, 특수 mock 나중(우선순위 높음).
    await mockPerformanceApi(page);
    await mockFollowablePerformanceDetail(page);

    await page.goto(`/performances/${FOLLOW_PERF_ID}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "팔로우 테스트 공연" }),
    ).toBeVisible();

    // 출연 섹션의 아티스트 칩은 보이되, 팔로우/팔로잉 버튼은 없어야 한다.
    await expect(
      page.getByRole("link", { name: /테스트 아티스트/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /팔로우|팔로잉|언팔로우/ }),
    ).toHaveCount(0);
  });

  test("시나리오2: 로그인 상태에서 ArtistChip 팔로우 버튼이 표시된다", async ({
    page,
  }) => {
    await mockAuthenticated(page);
    await setAuthCookie(page, TEST_USER);
    await page.route("**/api/follows", async (route: Route) => {
      await route.fulfill({ json: { artists: [] } });
    });
    // 일반 mock 먼저, 특수 mock 나중(우선순위 높음).
    await mockPerformanceApi(page);
    await mockFollowablePerformanceDetail(page);

    await page.goto(`/performances/${FOLLOW_PERF_ID}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "팔로우 테스트 공연" }),
    ).toBeVisible();

    // 팔로우 버튼(미팔로우 상태) 표시.
    await expect(
      page.getByRole("button", { name: "테스트 아티스트 팔로우" }),
    ).toBeVisible();
  });

  test("시나리오3: 팔로우 버튼 클릭 시 '팔로잉' 상태로 전환된다", async ({
    page,
  }) => {
    await mockAuthenticated(page);
    await setAuthCookie(page, TEST_USER);

    // 상태 있는 mock: POST 후 GET이 팔로우 상태를 반환해 onSettled 재조회 때도 유지.
    let followed = false;
    await page.route("**/api/follows", async (route: Route) => {
      if (route.request().method() === "POST") {
        followed = true;
        await route.fulfill({ status: 201, body: "" });
        return;
      }
      await route.fulfill({
        json: {
          artists: followed
            ? [{ id: FOLLOW_ARTIST.id, name: FOLLOW_ARTIST.name }]
            : [],
        },
      });
    });
    // 일반 mock 먼저, 특수 mock 나중(우선순위 높음).
    await mockPerformanceApi(page);
    await mockFollowablePerformanceDetail(page);

    await page.goto(`/performances/${FOLLOW_PERF_ID}`);

    const followBtn = page.getByRole("button", {
      name: "테스트 아티스트 팔로우",
    });
    await expect(followBtn).toBeVisible();
    await followBtn.click();

    // optimistic update → 버튼 aria-label이 '언팔로우'로 전환.
    await expect(
      page.getByRole("button", { name: "테스트 아티스트 언팔로우" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "테스트 아티스트 팔로우" }),
    ).toHaveCount(0);
  });
});

test.describe("F10 Following — /following 페이지 접근 제어", () => {
  test("시나리오4: 비로그인 상태에서 /following 접근 시 /login으로 redirect된다", async ({
    page,
  }) => {
    await page.goto("/following");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "로그인" }),
    ).toBeVisible();
  });

  test("시나리오5: 로그인 상태에서 /following 목록에 팔로우 아티스트가 렌더된다", async ({
    page,
  }) => {
    // middleware(JWT 쿠키) + 클라이언트(useSession) 양쪽 인증.
    await setAuthCookie(page, TEST_USER);
    await mockAuthenticated(page);
    await page.route("**/api/follows", async (route: Route) => {
      await route.fulfill({
        json: { artists: [{ id: 1, name: "테스트 아티스트" }] },
      });
    });
    await mockPerformanceApi(page);

    await page.goto("/following");

    await expect(
      page.getByRole("heading", { name: "팔로잉 목록" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /테스트 아티스트/ }),
    ).toBeVisible();
  });
});
