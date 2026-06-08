import type { ReactNode } from "react";
import styles from "./DetailLayout.module.css";

interface DetailLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export default function DetailLayout({ left, right }: DetailLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>{left}</div>
      <div className={styles.rightColumn}>{right}</div>
    </div>
  );
}
