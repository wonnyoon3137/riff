import type { NextAuthConfig } from "next-auth";
import Kakao from "next-auth/providers/kakao";
import Google from "next-auth/providers/google";

/**
 * Edge Runtime(미들웨어) 호환 Auth.js 설정.
 * Node.js 전용 모듈(better-sqlite3, node:crypto)을 포함하지 않는다.
 * - middleware.ts는 이 설정만 사용.
 * - auth.ts는 이 설정 + SQLiteAdapter(Node.js 전용)를 합쳐서 export.
 */
export const authConfig = {
  providers: [
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID!,
      clientSecret: process.env.AUTH_KAKAO_SECRET!,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 보호 경로 접근 제어(middleware에서 평가). 비로그인의 /following 접근은
    // false 반환 시 Auth.js가 signIn 페이지(/login)로 redirect한다(F10.2).
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/following")) {
        return Boolean(session?.user);
      }
      return true;
    },
    // JWT 전략: token.sub(=user id)를 session.user.id로 노출.
    // BFF(예: /api/follows)에서 인증 사용자 식별에 사용.
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
