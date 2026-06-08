import styles from "./Skeleton.module.css";

/** Skeleton card mimicking PerformanceCard layout (poster 3:4 + 2 text lines) */
export function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={`${styles.cardPoster} ${styles.shimmer}`} />
      <div className={styles.cardBody}>
        <div
          className={`${styles.textLine} ${styles.textLineFull} ${styles.shimmer}`}
        />
        <div
          className={`${styles.textLine} ${styles.textLineShort} ${styles.shimmer}`}
        />
      </div>
    </div>
  );
}

/** Skeleton text block with configurable number of lines */
export function SkeletonText({ lines = 2 }: { lines?: number }) {
  return (
    <div className={styles.textBlock} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`${styles.textLine} ${styles.shimmer} ${
            i === lines - 1 ? styles.textLineShort : styles.textLineFull
          }`}
        />
      ))}
    </div>
  );
}
