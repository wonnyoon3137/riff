import type { MatchedArtist } from "@/domain/types";
import ArtistChip from "@/components/ArtistChip";
import styles from "./CastSection.module.css";
import textStyles from "./TextInfoBlock.module.css";

interface CastSectionProps {
  /** prfcast raw text (always shown) */
  cast: string;
  /** Matched artists from DB (may be empty) */
  matchedArtists?: MatchedArtist[];
}

/**
 * Cast section for S2 detail page (v3 F7).
 * - When matched artists exist: shows artist chips, then raw cast text below.
 * - When no matched artists: shows raw cast text only (same as before).
 */
export default function CastSection({ cast, matchedArtists }: CastSectionProps) {
  const hasArtists = matchedArtists && matchedArtists.length > 0;

  return (
    <section className={textStyles.container}>
      <h2 className={textStyles.heading}>출연</h2>
      {hasArtists && (
        <div className={styles.chipGroup} role="list" aria-label="출연 아티스트">
          {matchedArtists.map((artist) => (
            <div key={artist.id} role="listitem">
              <ArtistChip artist={artist} />
            </div>
          ))}
        </div>
      )}
      <p className={textStyles.body}>{cast}</p>
    </section>
  );
}
