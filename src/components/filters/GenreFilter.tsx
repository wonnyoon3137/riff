"use client";

import { useCallback, useMemo } from "react";
import type { FilterState, Genre } from "@/domain/types";
import { GENRE_DISPLAY_LABELS } from "@/domain/kopis-codes";
import styles from "./GenreFilter.module.css";

interface GenreFilterProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
}

const GENRE_ENTRIES = Object.entries(GENRE_DISPLAY_LABELS) as [Genre, string][];

function CheckIcon() {
  return (
    <svg
      className={styles.checkIcon}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function GenreFilter({ filter, onChange }: GenreFilterProps) {
  const selectedSet = useMemo(() => new Set(filter.genres), [filter.genres]);

  const handleToggle = useCallback(
    (genre: Genre) => {
      const isSelected = selectedSet.has(genre);
      const newGenres = isSelected
        ? filter.genres.filter((g) => g !== genre)
        : [...filter.genres, genre];

      onChange({
        ...filter,
        genres: newGenres,
      });
    },
    [filter, onChange, selectedSet],
  );

  return (
    <div className={styles.container}>
      {GENRE_ENTRIES.map(([genre, label]) => {
        const isSelected = selectedSet.has(genre);
        const chipClass = [
          styles.chip,
          isSelected ? styles.chipSelected : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={genre}
            type="button"
            className={chipClass}
            onClick={() => handleToggle(genre)}
            aria-pressed={isSelected}
          >
            {isSelected && <CheckIcon />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
