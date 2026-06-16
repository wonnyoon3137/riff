"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { MatchedArtist } from "@/domain/types";
import { useFollows, useToggleFollow } from "@/hooks/useFollows";
import styles from "./ArtistChip.module.css";

interface ArtistChipProps {
  artist: Pick<MatchedArtist, "id" | "name" | "role">;
}

/**
 * M3 tonal chip for a matched artist (v3 F7).
 * - 칩 본문: 아티스트 필터 목록(`/?artist=<id>`)으로 링크.
 * - 로그인 상태일 때만 우측에 팔로우/팔로잉 토글 버튼 표시(F10.1).
 *   비로그인은 버튼 미표시(로그인 유도 없음, v6 MVP).
 */
export default function ArtistChip({ artist }: ArtistChipProps) {
  const { status } = useSession();
  const { followedIds } = useFollows();
  const toggle = useToggleFollow();
  const [hovered, setHovered] = useState(false);

  const artistId = Number(artist.id);
  const isFollowing = followedIds.has(artistId);
  const showFollowButton =
    status === "authenticated" && Number.isInteger(artistId);

  function handleToggle() {
    if (toggle.isPending) return;
    toggle.mutate({
      artistId,
      follow: !isFollowing,
      name: artist.name,
    });
  }

  // 팔로잉 중 + hover 시 "언팔로우" 힌트로 전환.
  const followLabel = isFollowing
    ? hovered
      ? "언팔로우"
      : "팔로잉"
    : "팔로우";

  return (
    <span className={styles.wrapper}>
      <Link
        href={`/?artist=${artist.id}`}
        className={styles.chip}
        title={
          artist.role ? `${artist.name} (${artist.role})` : artist.name
        }
      >
        {artist.name}
        {artist.role && <span className={styles.role}>({artist.role})</span>}
      </Link>
      {showFollowButton && (
        <button
          type="button"
          className={[
            styles.followButton,
            isFollowing ? styles.following : styles.follow,
          ].join(" ")}
          onClick={handleToggle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          disabled={toggle.isPending}
          aria-pressed={isFollowing}
          aria-label={
            isFollowing
              ? `${artist.name} 언팔로우`
              : `${artist.name} 팔로우`
          }
        >
          {followLabel}
        </button>
      )}
    </span>
  );
}
