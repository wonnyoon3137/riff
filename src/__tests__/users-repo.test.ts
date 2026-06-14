import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import {
  getUserDb,
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
  countUsers,
} from "@/server/users/repo";
import type Database from "better-sqlite3";

function makeUser(over: Partial<{ name: string; email: string; image: string }> = {}) {
  return {
    id: randomUUID(),
    name: over.name ?? "테스트유저",
    email: over.email ?? `test-${randomUUID()}@example.com`,
    email_verified: null,
    image: over.image ?? null,
  };
}

describe("users repo (in-memory)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getUserDb(":memory:");
  });

  describe("User CRUD", () => {
    it("createUser: 사용자 생성 후 조회된다", () => {
      const u = makeUser({ name: "홍길동", email: "hong@example.com" });
      const created = createUser(u, db);
      expect(created.id).toBe(u.id);
      expect(created.name).toBe("홍길동");
      expect(created.email).toBe("hong@example.com");
      expect(created.created_at).toBeTruthy();
    });

    it("getUserById: id로 조회된다", () => {
      const u = makeUser();
      createUser(u, db);
      const found = getUserById(u.id, db);
      expect(found?.id).toBe(u.id);
    });

    it("getUserById: 없는 id는 null 반환", () => {
      expect(getUserById("nonexistent", db)).toBeNull();
    });

    it("getUserByEmail: email로 조회된다", () => {
      const u = makeUser({ email: "find@example.com" });
      createUser(u, db);
      const found = getUserByEmail("find@example.com", db);
      expect(found?.email).toBe("find@example.com");
    });

    it("getUserByEmail: 없는 email은 null 반환", () => {
      expect(getUserByEmail("nobody@example.com", db)).toBeNull();
    });

    it("updateUser: name/image 갱신", () => {
      const u = makeUser({ name: "처음이름" });
      createUser(u, db);
      const updated = updateUser({ id: u.id, name: "바뀐이름", image: "https://img.example.com/a.png" }, db);
      expect(updated.name).toBe("바뀐이름");
      expect(updated.image).toBe("https://img.example.com/a.png");
    });

    it("deleteUser: 삭제 후 조회 불가", () => {
      const u = makeUser();
      createUser(u, db);
      deleteUser(u.id, db);
      expect(getUserById(u.id, db)).toBeNull();
    });

    it("countUsers: 생성 수 반영", () => {
      expect(countUsers(db)).toBe(0);
      createUser(makeUser(), db);
      createUser(makeUser(), db);
      expect(countUsers(db)).toBe(2);
    });
  });

  describe("Account (OAuth 연결)", () => {
    it("linkAccount 후 getUserByAccount로 조회된다", () => {
      const u = makeUser();
      createUser(u, db);

      linkAccount(
        {
          id: randomUUID(),
          user_id: u.id,
          type: "oauth",
          provider: "kakao",
          provider_account_id: "kakao-123",
          refresh_token: null,
          access_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
          id_token: null,
          session_state: null,
        },
        db,
      );

      const found = getUserByAccount("kakao", "kakao-123", db);
      expect(found?.id).toBe(u.id);
    });

    it("unlinkAccount 후 getUserByAccount는 null 반환", () => {
      const u = makeUser();
      createUser(u, db);

      linkAccount(
        {
          id: randomUUID(),
          user_id: u.id,
          type: "oauth",
          provider: "google",
          provider_account_id: "google-456",
          refresh_token: null,
          access_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
          id_token: null,
          session_state: null,
        },
        db,
      );

      unlinkAccount("google", "google-456", db);
      expect(getUserByAccount("google", "google-456", db)).toBeNull();
    });

    it("deleteUser 시 연결 account도 cascade 삭제된다", () => {
      const u = makeUser();
      createUser(u, db);
      linkAccount(
        {
          id: randomUUID(),
          user_id: u.id,
          type: "oauth",
          provider: "kakao",
          provider_account_id: "kakao-cascade",
          refresh_token: null,
          access_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
          id_token: null,
          session_state: null,
        },
        db,
      );
      deleteUser(u.id, db);
      expect(getUserByAccount("kakao", "kakao-cascade", db)).toBeNull();
    });
  });

  describe("Session CRUD", () => {
    it("createSession 후 getSessionAndUser로 세션+유저 조회", () => {
      const u = makeUser({ name: "세션유저" });
      createUser(u, db);

      const token = `session-token-${randomUUID()}`;
      const expires = new Date(Date.now() + 3600 * 1000).toISOString();
      createSession({ id: randomUUID(), session_token: token, user_id: u.id, expires }, db);

      const result = getSessionAndUser(token, db);
      expect(result).not.toBeNull();
      expect(result!.session.session_token).toBe(token);
      expect(result!.user.name).toBe("세션유저");
    });

    it("getSessionAndUser: 없는 token은 null 반환", () => {
      expect(getSessionAndUser("invalid-token", db)).toBeNull();
    });

    it("updateSession: 만료 시간 갱신", () => {
      const u = makeUser();
      createUser(u, db);

      const token = `session-${randomUUID()}`;
      const expires1 = new Date(Date.now() + 1000).toISOString();
      createSession({ id: randomUUID(), session_token: token, user_id: u.id, expires: expires1 }, db);

      const expires2 = new Date(Date.now() + 7200 * 1000).toISOString();
      const updated = updateSession(token, expires2, db);
      expect(updated?.expires).toBe(expires2);
    });

    it("deleteSession 후 getSessionAndUser는 null 반환", () => {
      const u = makeUser();
      createUser(u, db);

      const token = `session-del-${randomUUID()}`;
      createSession(
        { id: randomUUID(), session_token: token, user_id: u.id, expires: new Date(Date.now() + 3600000).toISOString() },
        db,
      );
      deleteSession(token, db);
      expect(getSessionAndUser(token, db)).toBeNull();
    });

    it("deleteUser 시 세션도 cascade 삭제된다", () => {
      const u = makeUser();
      createUser(u, db);

      const token = `session-cascade-${randomUUID()}`;
      createSession(
        { id: randomUUID(), session_token: token, user_id: u.id, expires: new Date(Date.now() + 3600000).toISOString() },
        db,
      );
      deleteUser(u.id, db);
      expect(getSessionAndUser(token, db)).toBeNull();
    });
  });
});
