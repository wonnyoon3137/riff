"use client";

import type { SortOrder } from "@/domain/types";
import styles from "./ResultSummary.module.css";

interface ResultSummaryProps {
  totalCount?: number;
  isLoading?: boolean;
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
}

export default function ResultSummary({
  totalCount,
  isLoading,
  sort,
  onSortChange,
}: ResultSummaryProps) {
  return (
    <div className={styles.container}>
      <div className={styles.count}>
        {isLoading ? (
          <div className={styles.skeleton} aria-label="불러오는 중" />
        ) : totalCount !== undefined ? (
          <>
            총 <span className={styles.countBold}>{totalCount.toLocaleString()}</span>건
          </>
        ) : null}
      </div>

      <div className={styles.sortGroup} role="group" aria-label="정렬">
        <button
          type="button"
          className={`${styles.sortButton} ${sort === "START_ASC" ? styles.sortButtonActive : ""}`}
          onClick={() => onSortChange("START_ASC")}
          aria-pressed={sort === "START_ASC"}
        >
          시작일 가까운 순
        </button>
        <button
          type="button"
          className={`${styles.sortButton} ${sort === "START_DESC" ? styles.sortButtonActive : ""}`}
          onClick={() => onSortChange("START_DESC")}
          aria-pressed={sort === "START_DESC"}
        >
          시작일 먼 순
        </button>
      </div>
    </div>
  );
}
