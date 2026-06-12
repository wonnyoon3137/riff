import Link from "next/link";
import type { MatchedArtist } from "@/domain/types";
import styles from "./ArtistChip.module.css";

interface ArtistChipProps {
  artist: MatchedArtist;
}

/**
 * M3 tonal chip for a matched artist (v3 F7).
 * Links to the list page filtered by artist (P3 아티스트 필터는 추후 구현).
 */
export default function ArtistChip({ artist }: ArtistChipProps) {
  return (
    <Link
      href={`/?artist=${artist.id}`}
      className={styles.chip}
      title={
        artist.role
          ? `${artist.name} (${artist.role})`
          : artist.name
      }
    >
      {artist.name}
      {artist.role && <span className={styles.role}>({artist.role})</span>}
    </Link>
  );
}
