"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import PerformanceCard from "@/components/PerformanceCard";
import { SkeletonCard } from "@/components/Skeleton";
import styles from "./page.module.css";
import type { FollowingFeedResponse } from "@/app/api/follows/feed/route";

async function fetchFollowingFeed(): Promise<FollowingFeedResponse> {
  const res = await fetch("/api/follows/feed");
  if (!res.ok) {
    throw new Error(`Failed to fetch following feed: ${res.status}`);
  }
  return res.json() as Promise<FollowingFeedResponse>;
}

/**
 * S5 — 팔로잉 아티스트 공연 피드 (F11).
 * 빈 상태 2종: 팔로잉 아티스트 없음 / 다가오는 공연 없음 구분 안내.
 */
export default function FollowingFeed() {
  const { data, isLoading, isError } = useQuery<FollowingFeedResponse>({
    queryKey: ["following-feed"],
    queryFn: fetchFollowingFeed,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className={styles.message} role="alert">
        공연 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  if (!data?.hasFollowedArtists) {
    return (
      <div className={styles.emptyWrap}>
        <p className={styles.message}>
          아직 팔로잉한 아티스트가 없어요.
          <br />
          아티스트를 팔로우하면 공연을 모아볼 수 있어요.
        </p>
        <Link href="/following" className={styles.emptyLink}>
          아티스트 팔로우하러 가기
        </Link>
      </div>
    );
  }

  if (data.performances.length === 0) {
    return (
      <p className={styles.message}>
        팔로잉 아티스트의 다가오는 공연이 없습니다.
      </p>
    );
  }

  return (
    <ul className={styles.grid}>
      {data.performances.map((performance) => (
        <li key={performance.id} className={styles.gridItem}>
          <PerformanceCard performance={performance} />
        </li>
      ))}
    </ul>
  );
}
