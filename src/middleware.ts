import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge Runtime 호환: adapter(better-sqlite3/node:crypto) 없이 authConfig만 사용.
// 전체 auth(Node.js 전용)는 서버 컴포넌트/Route Handler에서 @/auth로 직접 import.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // 정적 파일, 이미지, Next.js 내부 경로는 미들웨어 적용 제외
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
