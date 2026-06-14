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
} satisfies NextAuthConfig;
