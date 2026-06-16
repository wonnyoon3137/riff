/**
 * Auth.js v5 (JWT 전략) 세션 쿠키 헬퍼.
 *
 * middleware의 `authorized` 콜백은 실제 JWT 쿠키를 검증하므로,
 * /api/auth/session 모킹만으로는 보호 경로 진입이 불가능하다.
 * 이 헬퍼는 테스트 AUTH_SECRET으로 서명된 실제 JWE 쿠키를 생성해 설정한다.
 */
import type { Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "riff-e2e-dummy-secret";
const COOKIE_NAME = "authjs.session-token";

export interface TestUser {
  id: string;
  name: string;
  email: string;
}

/**
 * 테스트용 JWT 세션 쿠키를 브라우저 컨텍스트에 주입한다.
 * middleware의 authorized 콜백을 통과하기 위한 서버 사이드 인증.
 *
 * 클라이언트 사이드 useSession()을 동작시키려면
 * 함께 `mockAuthenticated(page)`도 호출해야 한다.
 */
export async function setAuthCookie(page: Page, user: TestUser): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const token = await encode({
    token: {
      sub: user.id,
      name: user.name,
      email: user.email,
      iat: now,
      exp: now + 86400,
    },
    secret: AUTH_SECRET,
    salt: COOKIE_NAME,
  });

  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
