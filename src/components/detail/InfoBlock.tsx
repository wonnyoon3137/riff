import type { Performance } from "@/domain/types";
import StateBadge from "../StateBadge";
import styles from "./InfoBlock.module.css";

interface InfoBlockProps {
  performance: Performance;
}

function formatPeriod(from: string, to: string): string {
  const f = from.replace(/-/g, ".");
  const t = to.replace(/-/g, ".");
  if (from.slice(0, 4) === to.slice(0, 4)) {
    return `${f} \u2013 ${t.slice(5)}`;
  }
  return `${f} \u2013 ${t}`;
}

export default function InfoBlock({ performance }: InfoBlockProps) {
  const metaParts = [performance.genreLabel, performance.ageGuidance].filter(
    Boolean,
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{performance.title}</h1>

      {metaParts.length > 0 && (
        <p className={styles.meta}>{metaParts.join(" \u00B7 ")}</p>
      )}

      <p className={styles.period}>
        {formatPeriod(performance.period.from, performance.period.to)}
      </p>

      <div className={styles.badgeRow}>
        <StateBadge state={performance.state} />
        {performance.openrun && (
          <span className={styles.meta}>오픈런</span>
        )}
      </div>

      {performance.runtime && (
        <p className={styles.runtime}>러닝타임 {performance.runtime}</p>
      )}

      {performance.timeGuidance && (
        <p className={styles.timeGuidance}>{performance.timeGuidance}</p>
      )}
    </div>
  );
}
