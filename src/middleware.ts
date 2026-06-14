export { auth as middleware } from "@/auth";

export const config = {
  // 정적 파일, 이미지, Next.js 내부 경로는 미들웨어 적용 제외
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
