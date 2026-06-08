import type { IntroImage } from "@/domain/types";
import styles from "./GalleryBlock.module.css";

interface GalleryBlockProps {
  images: IntroImage[];
  title: string;
}

export default function GalleryBlock({ images, title }: GalleryBlockProps) {
  if (images.length === 0) return null;

  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>공연 소개</h2>
      <div className={styles.imageList}>
        {images.map((img, index) => (
          <div key={`${img.url}-${index}`} className={styles.imageWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.image}
              src={img.url}
              alt={`${title} 소개 이미지 ${index + 1}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
