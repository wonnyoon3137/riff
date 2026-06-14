import { randomUUID } from "node:crypto";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from "next-auth/adapters";
import type Database from "better-sqlite3";
import {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByAccount,
  updateUser,
  deleteUser,
  linkAccount,
  unlinkAccount,
  createSession,
  getSessionAndUser,
  updateSession,
  deleteSession,
  getUserDb,
  type UserRow,
  type AccountRow,
  type SessionRow,
} from "./repo";

/**
 * Auth.js(NextAuth v5) SQLite Adapter — better-sqlite3 기반. (DEC-P4, DEC-P4b)
 *
 * Venue/Artist repo 패턴 재사용. repo.ts의 동기 SQLite 함수를
 * Auth.js Adapter 인터페이스(AdapterUser/AdapterAccount/AdapterSession)로 래핑한다.
 * 테스트 시 dbPath=":memory:" 주입으로 격리된 DB 사용.
 */

function rowToAdapterUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email!,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    image: row.image,
  };
}

function rowToAdapterSession(row: SessionRow): AdapterSession {
  return {
    sessionToken: row.session_token,
    userId: row.user_id,
    expires: new Date(row.expires),
  };
}

export function SQLiteAdapter(dbPath?: string): Adapter {
  const db: Database.Database = getUserDb(dbPath);

  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const row = createUser(
        {
          id: randomUUID(),
          name: user.name ?? null,
          email: user.email,
          email_verified: user.emailVerified?.toISOString() ?? null,
          image: user.image ?? null,
        },
        db,
      );
      return rowToAdapterUser(row);
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const row = getUserById(id, db);
      return row ? rowToAdapterUser(row) : null;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const row = getUserByEmail(email, db);
      return row ? rowToAdapterUser(row) : null;
    },

    async getUserByAccount({
      provider,
      providerAccountId,
    }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<AdapterUser | null> {
      const row = getUserByAccount(provider, providerAccountId, db);
      return row ? rowToAdapterUser(row) : null;
    },

    async updateUser(
      user: Partial<AdapterUser> & Pick<AdapterUser, "id">,
    ): Promise<AdapterUser> {
      const row = updateUser(
        {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          email_verified: user.emailVerified?.toISOString() ?? undefined,
          image: user.image ?? undefined,
        },
        db,
      );
      return rowToAdapterUser(row);
    },

    async deleteUser(userId: string): Promise<void> {
      deleteUser(userId, db);
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      const row: AccountRow = {
        id: randomUUID(),
        user_id: account.userId,
        type: account.type,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        refresh_token: account.refresh_token ?? null,
        access_token: account.access_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: (account.session_state as string) ?? null,
      };
      linkAccount(row, db);
      return account;
    },

    async unlinkAccount({
      provider,
      providerAccountId,
    }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<void> {
      unlinkAccount(provider, providerAccountId, db);
    },

    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }): Promise<AdapterSession> {
      const row: SessionRow = {
        id: randomUUID(),
        session_token: session.sessionToken,
        user_id: session.userId,
        expires: session.expires.toISOString(),
      };
      createSession(row, db);
      return rowToAdapterSession(row);
    },

    async getSessionAndUser(
      sessionToken: string,
    ): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const result = getSessionAndUser(sessionToken, db);
      if (!result) return null;
      return {
        session: rowToAdapterSession(result.session),
        user: rowToAdapterUser(result.user),
      };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">,
    ): Promise<AdapterSession | null> {
      if (!session.expires) return null;
      const row = updateSession(
        session.sessionToken,
        session.expires.toISOString(),
        db,
      );
      return row ? rowToAdapterSession(row) : null;
    },

    async deleteSession(sessionToken: string): Promise<void> {
      deleteSession(sessionToken, db);
    },
  };
}
