import type { Metadata } from "next";
import AppBar from "@/components/AppBar";
import FollowingList from "./FollowingList";
import styles from "./page.module.css";

// 인증 사용자별 데이터 → 정적 캐시 금지.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "팔로잉 목록 · Riff",
};

/**
 * S4 — Following 목록 페이지 (F10.2).
 * 비로그인 접근은 middleware가 /login으로 redirect한다.
 * 팔로우 데이터는 클라이언트 전용(useFollows)이므로 목록은 FollowingList에 위임한다.
 */
export default function FollowingPage() {
  return (
    <>
      <AppBar />
      <main className={styles.main}>
        <h1 className={styles.title}>팔로잉 목록</h1>
        <FollowingList />
      </main>
    </>
  );
}
