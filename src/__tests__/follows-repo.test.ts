import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import {
  getUserDb,
  createUser,
  deleteUser,
  isFollowing,
  getFollowedArtistIds,
  followArtist,
  unfollowArtist,
} from "@/server/users/repo";
import type Database from "better-sqlite3";

function makeUser() {
  return {
    id: randomUUID(),
    name: "팔로우유저",
    email: `follow-${randomUUID()}@example.com`,
    email_verified: null,
    image: null,
  };
}

describe("follows repo (in-memory)", () => {
  let db: Database.Database;
  let userId: string;

  beforeEach(() => {
    db = getUserDb(":memory:");
    const u = makeUser();
    createUser(u, db);
    userId = u.id;
  });

  it("followArtist 후 isFollowing은 true", () => {
    followArtist(userId, 1, db);
    expect(isFollowing(userId, 1, db)).toBe(true);
  });

  it("followArtist 중복 호출 — 에러 없이 멱등", () => {
    followArtist(userId, 1, db);
    expect(() => followArtist(userId, 1, db)).not.toThrow();
    expect(getFollowedArtistIds(userId, db)).toEqual([1]);
  });

  it("unfollowArtist 후 isFollowing은 false", () => {
    followArtist(userId, 1, db);
    unfollowArtist(userId, 1, db);
    expect(isFollowing(userId, 1, db)).toBe(false);
  });

  it("unfollowArtist — 존재하지 않는 팔로우는 no-op(에러 없음)", () => {
    expect(() => unfollowArtist(userId, 999, db)).not.toThrow();
    expect(isFollowing(userId, 999, db)).toBe(false);
  });

  it("getFollowedArtistIds — created_at DESC로 팔로우 목록 반환", () => {
    followArtist(userId, 1, db);
    followArtist(userId, 2, db);
    followArtist(userId, 3, db);
    const ids = getFollowedArtistIds(userId, db);
    expect(ids.sort()).toEqual([1, 2, 3]);
    expect(ids).toHaveLength(3);
  });

  it("getFollowedArtistIds — 팔로우 없으면 빈 배열", () => {
    expect(getFollowedArtistIds(userId, db)).toEqual([]);
  });

  it("user FK: deleteUser 시 follows도 cascade 삭제", () => {
    followArtist(userId, 1, db);
    followArtist(userId, 2, db);
    deleteUser(userId, db);
    expect(getFollowedArtistIds(userId, db)).toEqual([]);
  });

  it("user FK: 존재하지 않는 user_id로 followArtist는 FK 에러", () => {
    // follows.user_id → users.id FK 가 강제됨(better-sqlite3 기본 foreign_keys=ON).
    expect(() => followArtist("no-such-user", 1, db)).toThrow();
  });
});
