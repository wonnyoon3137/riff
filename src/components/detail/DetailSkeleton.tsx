import DetailLayout from "./DetailLayout";
import styles from "./DetailSkeleton.module.css";

export default function DetailSkeleton() {
  return (
    <DetailLayout
      left={
        <div
          className={`${styles.poster} ${styles.shimmer}`}
          aria-hidden="true"
        />
      }
      right={
        <div className={styles.infoBlock} aria-hidden="true" role="status">
          <div className={`${styles.titleLine} ${styles.shimmer}`} />
          <div className={`${styles.metaLine} ${styles.shimmer}`} />
          <div className={`${styles.periodLine} ${styles.shimmer}`} />
          <div className={`${styles.badgeLine} ${styles.shimmer}`} />
          <div className={`${styles.textLine} ${styles.shimmer}`} />
          <div
            className={`${styles.textLine} ${styles.textLineShort} ${styles.shimmer}`}
          />
          <div className={`${styles.buttonLine} ${styles.shimmer}`} />
        </div>
      }
    />
  );
}
