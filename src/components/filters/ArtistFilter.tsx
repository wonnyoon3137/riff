"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { FilterState } from "@/domain/types";
import styles from "./ArtistFilter.module.css";

interface ArtistFilterProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
}

/** /api/artists/search 응답 아이템 shape (BFF 계약). */
interface ArtistSearchItem {
  id: string;
  name: string;
  aliases?: string[];
}

const MIN_QUERY_LEN = 2; // F8: 2자 이상부터 검색

function SearchIcon() {
  return (
    <svg
      className={styles.searchIcon}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className={styles.removeIcon}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ArtistFilter({ filter, onChange }: ArtistFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistSearchItem[]>([]);
  const [artistName, setArtistName] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSelection = !!filter.artistId;

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Debounced search (300ms, D6)
  useEffect(() => {
    if (!open || query.trim().length < MIN_QUERY_LEN) {
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/artists/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { items: ArtistSearchItem[] };
          setResults(data.items || []);
        }
      } catch {
        setResults([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, open]);

  const handleSelect = useCallback(
    (artist: ArtistSearchItem) => {
      setArtistName(artist.name);
      setOpen(false);
      setQuery("");
      onChange({
        ...filter,
        artistId: artist.id,
      });
    },
    [filter, onChange],
  );

  const handleClear = useCallback(() => {
    setArtistName("");
    onChange({
      ...filter,
      artistId: undefined,
    });
  }, [filter, onChange]);

  // Clear local name display when filter is reset externally
  useEffect(() => {
    if (!filter.artistId) {
      setArtistName("");
    }
  }, [filter.artistId]);

  const triggerClass = [
    styles.triggerChip,
    hasSelection ? styles.triggerChipActive : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showHint = open && query.trim().length > 0 && query.trim().length < MIN_QUERY_LEN;
  const showEmpty = open && query.trim().length >= MIN_QUERY_LEN && results.length === 0;

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={triggerClass}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <SearchIcon />
        아티스트
      </button>

      {hasSelection && artistName && (
        <span className={styles.inputChip}>
          {artistName}
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleClear}
            aria-label={`${artistName} 제거`}
          >
            <CloseIcon />
          </button>
        </span>
      )}

      {open && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className={styles.dropdown} role="listbox" aria-label="아티스트 검색">
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="아티스트 이름 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="아티스트 검색"
            />
            {showHint && (
              <p className={styles.hintMessage}>2자 이상 입력해 주세요</p>
            )}
            {showEmpty && (
              <p className={styles.emptyMessage}>검색 결과가 없습니다</p>
            )}
            {results.map((artist) => (
              <button
                key={artist.id}
                type="button"
                className={styles.menuItem}
                onClick={() => handleSelect(artist)}
                role="option"
                aria-selected={filter.artistId === artist.id}
              >
                <span>{artist.name}</span>
                {artist.aliases && artist.aliases.length > 0 && (
                  <span className={styles.menuItemAliases}>
                    {artist.aliases.join(", ")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
