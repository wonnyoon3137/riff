import Image from "next/image";
import styles from "./PosterBlock.module.css";

interface PosterBlockProps {
  posterUrl?: string;
  title: string;
}

export default function PosterBlock({ posterUrl, title }: PosterBlockProps) {
  return (
    <div className={styles.posterWrap}>
      {posterUrl ? (
        <Image
          className={styles.poster}
          src={posterUrl}
          alt={title}
          fill
          sizes="(max-width: 767px) 100vw, 340px"
          priority
        />
      ) : (
        <div className={styles.placeholder}>
          <Image
            className={styles.placeholderIcon}
            src="/illustrations/poster-placeholder.svg"
            alt=""
            width={64}
            height={64}
          />
        </div>
      )}
    </div>
  );
}
