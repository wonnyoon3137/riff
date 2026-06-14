import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import Google from "next-auth/providers/google";
import { SQLiteAdapter } from "@/server/users/adapter";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SQLiteAdapter(),
  session: { strategy: "jwt" },
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
});
