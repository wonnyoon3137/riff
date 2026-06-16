import type { DefaultSession } from "next-auth";

/**
 * Auth.js(next-auth v5) 타입 보강 — session.user.id 노출.
 * auth.config.ts의 session 콜백에서 token.sub(=user id)를 채운다.
 * BFF(예: /api/follows)에서 인증 사용자 식별에 사용.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
