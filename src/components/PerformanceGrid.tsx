"use client";

import { useEffect, useRef } from "react";
import type { PerformanceSummary } from "@/domain/types";
import PerformanceCard from "./PerformanceCard";
import { SkeletonCard } from "./Skeleton";
import styles from "./PerformanceGrid.module.css";

interface PerformanceGridProps {
  items: PerformanceSummary[];
  hasNext: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onCardClick?: () => void;
}

const SKELETON_COUNT = 12;

export function PerformanceGridSkeleton() {
  return (
    <div className={styles.skeletonGrid} aria-label="불러오는 중" role="status">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function PerformanceGrid({
  items,
  hasNext,
  isFetchingNextPage,
  onLoadMore,
  onCardClick,
}: PerformanceGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNext, isFetchingNextPage, onLoadMore]);

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div key={item.id} onClick={onCardClick}>
          <PerformanceCard performance={item} />
        </div>
      ))}

      {hasNext && (
        <div ref={sentinelRef} className={styles.sentinel}>
          {isFetchingNextPage && (
            <div
              className={styles.spinner}
              role="status"
              aria-label="추가 공연 불러오는 중"
            />
          )}
        </div>
      )}

      {!hasNext && items.length > 0 && (
        <p className={styles.endCaption}>마지막 공연입니다</p>
      )}
    </div>
  );
}
