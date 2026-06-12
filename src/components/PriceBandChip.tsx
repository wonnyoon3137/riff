import type { PriceBand } from "@/domain/price-band";
import styles from "./PriceBandChip.module.css";

const BAND_STYLE: Record<PriceBand, string> = {
  FREE: styles.free,
  UNDER_30K: styles.under30k,
  UNDER_70K: styles.under70k,
  OVER_70K: styles.over70k,
  VARIABLE: styles.variable,
};

interface PriceBandChipProps {
  band: PriceBand;
  label: string;
}

export default function PriceBandChip({ band, label }: PriceBandChipProps) {
  return (
    <span className={`${styles.chip} ${BAND_STYLE[band]}`}>{label}</span>
  );
}
