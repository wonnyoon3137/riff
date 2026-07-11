import type { Metadata } from "next";
import AppBar from "@/components/AppBar";
import FollowingFeed from "./FollowingFeed";
import styles from "./page.module.css";

// 인증 사용자별 데이터 → 정적 캐시 금지.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "팔로잉 공연 · Riff",
};

/**
 * S5 — Following Feed 페이지 (F11).
 * 비로그인 접근은 middleware가 /login으로 redirect한다.
 * 공연 데이터는 클라이언트 전용(useFollowingFeed)이므로 FollowingFeed에 위임한다.
 */
export default function FollowingFeedPage() {
  return (
    <>
      <AppBar />
      <main className={styles.main}>
        <h1 className={styles.title}>팔로잉 공연</h1>
        <FollowingFeed />
      </main>
    </>
  );
}
