import Image from "next/image";
import styles from "./ErrorState.module.css";

interface ErrorStateProps {
  onRetry?: () => void;
}

export default function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className={styles.container} role="alert">
      <Image
        className={styles.illustration}
        src="/illustrations/error-state.svg"
        alt=""
        width={150}
        height={120}
      />
      <p className={styles.title}>공연 정보를 불러오지 못했습니다</p>
      <p className={styles.description}>잠시 후 다시 시도해 주세요</p>
      {onRetry && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={onRetry}
        >
          재시도
        </button>
      )}
    </div>
  );
}
