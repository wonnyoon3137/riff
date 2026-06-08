import type { PerformanceState } from "@/domain/types";
import styles from "./StateBadge.module.css";

const STATE_LABELS: Record<PerformanceState, string> = {
  ONGOING: "공연중",
  UPCOMING: "공연예정",
  ENDED: "공연완료",
};

const STATE_STYLE: Record<PerformanceState, string> = {
  ONGOING: styles.ongoing,
  UPCOMING: styles.upcoming,
  ENDED: styles.ended,
};

interface StateBadgeProps {
  state: PerformanceState;
}

export default function StateBadge({ state }: StateBadgeProps) {
  return (
    <span className={`${styles.badge} ${STATE_STYLE[state]}`}>
      {STATE_LABELS[state]}
    </span>
  );
}
