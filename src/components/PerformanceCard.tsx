import Link from "next/link";
import Image from "next/image";
import type { PerformanceSummary } from "@/domain/types";
import StateBadge from "./StateBadge";
import styles from "./PerformanceCard.module.css";

interface PerformanceCardProps {
  performance: PerformanceSummary;
  onClick?: () => void;
}

function formatPeriod(from: string, to: string): string {
  // "2026-06-10" -> "2026.06.10"
  const f = from.replace(/-/g, ".");
  const t = to.replace(/-/g, ".");
  // If same year, shorten the "to" part
  if (from.slice(0, 4) === to.slice(0, 4)) {
    return `${f} \u2013 ${t.slice(5)}`;
  }
  return `${f} \u2013 ${t}`;
}

export default function PerformanceCard({
  performance,
  onClick,
}: PerformanceCardProps) {
  const {
    id,
    title,
    posterUrl,
    period,
    venueName,
    area,
    genreLabel,
    state,
  } = performance;

  const venueArea = [venueName, area].filter(Boolean).join(" \u00B7 ");

  return (
    <Link href={`/performances/${id}`} className={styles.card} onClick={onClick}>
      <div className={styles.posterWrap}>
        {posterUrl ? (
          <Image
            className={styles.poster}
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 599px) 50vw, 220px"
            loading="lazy"
          />
        ) : (
          <div className={styles.posterPlaceholder}>
            <Image
              className={styles.placeholderImg}
              src="/illustrations/poster-placeholder.svg"
              alt=""
              width={48}
              height={48}
            />
          </div>
        )}
        <div className={styles.badgeOverlay}>
          <StateBadge state={state} />
        </div>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.period}>
          {formatPeriod(period.from, period.to)}
        </span>
        {venueArea && <span className={styles.venue}>{venueArea}</span>}
        {genreLabel && <span className={styles.genre}>{genreLabel}</span>}
      </div>
    </Link>
  );
}
