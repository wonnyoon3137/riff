"use client";

import ArtistChip from "@/components/ArtistChip";
import { useFollows } from "@/hooks/useFollows";
import styles from "./page.module.css";

/**
 * 팔로잉 아티스트 칩 목록(S4.2). 빈/로딩/에러 상태 처리.
 */
export default function FollowingList() {
  const { artists, isLoading, isError } = useFollows();

  if (isLoading) {
    return (
      <p className={styles.message} role="status">
        불러오는 중…
      </p>
    );
  }

  if (isError) {
    return (
      <p className={styles.message} role="alert">
        팔로잉 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  if (artists.length === 0) {
    return (
      <p className={styles.message}>팔로잉한 아티스트가 없습니다</p>
    );
  }

  return (
    <ul className={styles.chipList}>
      {artists.map((artist) => (
        <li key={artist.id} className={styles.chipItem}>
          <ArtistChip
            artist={{ id: String(artist.id), name: artist.name }}
          />
        </li>
      ))}
    </ul>
  );
}
