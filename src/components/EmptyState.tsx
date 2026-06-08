import Image from "next/image";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  onReset?: () => void;
}

export default function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className={styles.container} role="status">
      <Image
        className={styles.illustration}
        src="/illustrations/empty-state.svg"
        alt=""
        width={150}
        height={120}
      />
      <p className={styles.title}>조건에 맞는 공연이 없습니다</p>
      <p className={styles.description}>
        필터를 바꾸거나 초기화해 보세요
      </p>
      {onReset && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={onReset}
        >
          필터 초기화
        </button>
      )}
    </div>
  );
}
