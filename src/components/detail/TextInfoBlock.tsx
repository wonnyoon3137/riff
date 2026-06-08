import type { ProducerInfo } from "@/domain/types";
import styles from "./TextInfoBlock.module.css";

interface TextSectionProps {
  title: string;
  content: string;
}

interface ProducerSectionProps {
  producers: ProducerInfo;
}

/** Generic text section (cast, story, price) with whitespace preservation */
export function TextSection({ title, content }: TextSectionProps) {
  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>{title}</h2>
      <p className={styles.body}>{content}</p>
    </section>
  );
}

/** Producer info as label-value pairs */
export function ProducerSection({ producers }: ProducerSectionProps) {
  const entries: { label: string; value: string }[] = [];

  if (producers.host) entries.push({ label: "주최", value: producers.host });
  if (producers.supervisor)
    entries.push({ label: "주관", value: producers.supervisor });
  if (producers.producer)
    entries.push({ label: "제작", value: producers.producer });
  if (producers.planner)
    entries.push({ label: "기획", value: producers.planner });
  if (producers.main) entries.push({ label: "제작사", value: producers.main });

  if (entries.length === 0) return null;

  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>제작</h2>
      <div className={styles.pairs}>
        {entries.map(({ label, value }) => (
          <div key={label} className={styles.pair}>
            <span className={styles.pairLabel}>{label}</span>
            <span className={styles.pairValue}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
