import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * 사용자 계정(users/accounts/sessions) 저장소 — SQLite(better-sqlite3) 기반.
 * (data-model §2, §5 확장, DEC-P4b)
 *
 * - Venue/Artist repo 패턴 재사용: WAL 모드, 모듈 싱글톤, 테스트용 :memory: 주입.
 * - DB 파일 경로: USER_DB_PATH(미설정 시 ./data/users.db)
 * - Auth.js Adapter가 이 repo를 호출한다(src/server/users/adapter.ts).
 */

let db: Database.Database | null = null;

function defaultDbPath(): string {
  return process.env.USER_DB_PATH || "./data/users.db";
}

function initSchema(database: Database.Database): void {
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      name           TEXT,
      email          TEXT UNIQUE,
      email_verified TEXT,
      image          TEXT,
      created_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id                   TEXT PRIMARY KEY,
      user_id              TEXT NOT NULL,
      type                 TEXT NOT NULL,
      provider             TEXT NOT NULL,
      provider_account_id  TEXT NOT NULL,
      refresh_token        TEXT,
      access_token         TEXT,
      expires_at           INTEGER,
      token_type           TEXT,
      scope                TEXT,
      id_token             TEXT,
      session_state        TEXT,
      UNIQUE(provider, provider_account_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id             TEXT PRIMARY KEY,
      session_token  TEXT NOT NULL UNIQUE,
      user_id        TEXT NOT NULL,
      expires        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_user_id
      ON accounts (user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions (user_id);
  `);
}

export function getUserDb(dbPath?: string): Database.Database {
  if (db && !dbPath) return db;

  const path = dbPath ?? defaultDbPath();
  if (path !== ":memory:") {
    const abs = resolve(path);
    mkdirSync(dirname(abs), { recursive: true });
  }
  const database = new Database(path === ":memory:" ? path : resolve(path));
  initSchema(database);

  if (!dbPath) db = database;
  return database;
}

// ── Row 타입 ────────────────────────────────────────────────

export interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  email_verified: string | null;
  image: string | null;
  created_at: string;
}

export interface AccountRow {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

export interface SessionRow {
  id: string;
  session_token: string;
  user_id: string;
  expires: string;
}

// ── User CRUD ───────────────────────────────────────────────

export function createUser(
  user: Omit<UserRow, "created_at">,
  database: Database.Database = getUserDb(),
): UserRow {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO users (id, name, email, email_verified, image, created_at)
       VALUES (@id, @name, @email, @email_verified, @image, @created_at)`,
    )
    .run({ ...user, created_at: now });
  return getUserById(user.id, database)!;
}

export function getUserById(
  id: string,
  database: Database.Database = getUserDb(),
): UserRow | null {
  return (
    (database
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as UserRow | undefined) ?? null
  );
}

export function getUserByEmail(
  email: string,
  database: Database.Database = getUserDb(),
): UserRow | null {
  return (
    (database
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as UserRow | undefined) ?? null
  );
}

export function updateUser(
  user: Partial<UserRow> & { id: string },
  database: Database.Database = getUserDb(),
): UserRow {
  const existing = getUserById(user.id, database);
  if (!existing) throw new Error(`User not found: ${user.id}`);

  const merged = { ...existing, ...user };
  database
    .prepare(
      `UPDATE users
       SET name = @name, email = @email, email_verified = @email_verified, image = @image
       WHERE id = @id`,
    )
    .run(merged);
  return getUserById(user.id, database)!;
}

export function deleteUser(
  userId: string,
  database: Database.Database = getUserDb(),
): void {
  database.prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function countUsers(
  database: Database.Database = getUserDb(),
): number {
  return (
    database.prepare("SELECT count(*) AS c FROM users").get() as { c: number }
  ).c;
}

// ── Account CRUD ────────────────────────────────────────────

export function linkAccount(
  account: AccountRow,
  database: Database.Database = getUserDb(),
): AccountRow {
  database
    .prepare(
      `INSERT INTO accounts (
        id, user_id, type, provider, provider_account_id,
        refresh_token, access_token, expires_at, token_type,
        scope, id_token, session_state
      ) VALUES (
        @id, @user_id, @type, @provider, @provider_account_id,
        @refresh_token, @access_token, @expires_at, @token_type,
        @scope, @id_token, @session_state
      )`,
    )
    .run(account);
  return account;
}

export function unlinkAccount(
  provider: string,
  providerAccountId: string,
  database: Database.Database = getUserDb(),
): AccountRow | null {
  const row = database
    .prepare(
      "SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ?",
    )
    .get(provider, providerAccountId) as AccountRow | undefined;
  if (!row) return null;
  database
    .prepare(
      "DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?",
    )
    .run(provider, providerAccountId);
  return row;
}

export function getUserByAccount(
  provider: string,
  providerAccountId: string,
  database: Database.Database = getUserDb(),
): UserRow | null {
  const row = database
    .prepare(
      `SELECT u.* FROM users u
       JOIN accounts a ON u.id = a.user_id
       WHERE a.provider = ? AND a.provider_account_id = ?`,
    )
    .get(provider, providerAccountId) as UserRow | undefined;
  return row ?? null;
}

// ── Session CRUD ────────────────────────────────────────────

export function createSession(
  session: SessionRow,
  database: Database.Database = getUserDb(),
): SessionRow {
  database
    .prepare(
      `INSERT INTO sessions (id, session_token, user_id, expires)
       VALUES (@id, @session_token, @user_id, @expires)`,
    )
    .run(session);
  return session;
}

export function getSessionAndUser(
  sessionToken: string,
  database: Database.Database = getUserDb(),
): { session: SessionRow; user: UserRow } | null {
  const row = database
    .prepare(
      `SELECT s.*, u.id AS u_id, u.name AS u_name, u.email AS u_email,
              u.email_verified AS u_email_verified, u.image AS u_image,
              u.created_at AS u_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.session_token = ?`,
    )
    .get(sessionToken) as
    | (SessionRow & {
        u_id: string;
        u_name: string | null;
        u_email: string | null;
        u_email_verified: string | null;
        u_image: string | null;
        u_created_at: string;
      })
    | undefined;

  if (!row) return null;
  return {
    session: {
      id: row.id,
      session_token: row.session_token,
      user_id: row.user_id,
      expires: row.expires,
    },
    user: {
      id: row.u_id,
      name: row.u_name,
      email: row.u_email,
      email_verified: row.u_email_verified,
      image: row.u_image,
      created_at: row.u_created_at,
    },
  };
}

export function updateSession(
  sessionToken: string,
  expires: string,
  database: Database.Database = getUserDb(),
): SessionRow | null {
  database
    .prepare("UPDATE sessions SET expires = ? WHERE session_token = ?")
    .run(expires, sessionToken);
  return (
    (database
      .prepare("SELECT * FROM sessions WHERE session_token = ?")
      .get(sessionToken) as SessionRow | undefined) ?? null
  );
}

export function deleteSession(
  sessionToken: string,
  database: Database.Database = getUserDb(),
): void {
  database
    .prepare("DELETE FROM sessions WHERE session_token = ?")
    .run(sessionToken);
}

// ── 유틸 ────────────────────────────────────────────────────

export function closeUserDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
