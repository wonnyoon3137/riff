import NextAuth from "next-auth";
import { SQLiteAdapter } from "@/server/users/adapter";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: SQLiteAdapter(),
  session: { strategy: "jwt" },
});
