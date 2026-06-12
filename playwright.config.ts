import { defineConfig, devices } from "@playwright/test";

/**
 * Riff E2E (P-1) — 핵심 플로우 회귀 안전망.
 *
 * 결정론 보장: 모든 테스트는 BFF(`/api/performances*`) 응답을 네트워크 레벨에서
 * 모킹한다(실 KOPIS 의존 없음). 따라서 서버는 빌드/배포 키 없이 dev 모드로 충분.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // 데스크톱 필터바(desktopFilters)가 보이는 폭. 모바일 패널과 중복 DOM 회피.
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    // 기본은 pnpm(CI/표준). pnpm 미설치 환경에선 PLAYWRIGHT_WEBSERVER_CMD로 대체.
    command:
      process.env.PLAYWRIGHT_WEBSERVER_CMD ?? `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // KOPIS 키가 없어도 부팅되도록(테스트는 BFF를 모킹하므로 무관).
    env: {
      KOPIS_BASE_URL: process.env.KOPIS_BASE_URL ?? "http://kopis.invalid",
      KOPIS_SERVICE_KEY: process.env.KOPIS_SERVICE_KEY ?? "e2e-dummy-key",
    },
  },
});
