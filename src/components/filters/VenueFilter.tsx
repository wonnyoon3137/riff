"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { FilterState, Venue } from "@/domain/types";
import styles from "./VenueFilter.module.css";

interface VenueFilterProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
}

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

export default function VenueFilter({ filter, onChange }: VenueFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Venue[]>([]);
  const [venueName, setVenueName] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSelection = !!filter.venueId;

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

  // Debounced search
  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/venues?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { items: Venue[] };
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
    (venue: Venue) => {
      setVenueName(venue.name);
      setOpen(false);
      setQuery("");
      onChange({
        ...filter,
        venueId: venue.id,
      });
    },
    [filter, onChange],
  );

  const handleClear = useCallback(() => {
    setVenueName("");
    onChange({
      ...filter,
      venueId: undefined,
    });
  }, [filter, onChange]);

  const triggerClass = [
    styles.triggerChip,
    hasSelection ? styles.triggerChipActive : "",
  ]
    .filter(Boolean)
    .join(" ");

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
        공연장
      </button>

      {hasSelection && venueName && (
        <span className={styles.inputChip}>
          {venueName}
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleClear}
            aria-label={`${venueName} 제거`}
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
          <div className={styles.dropdown} role="listbox" aria-label="공연장 검색">
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="공연장 이름 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="공연장 검색"
            />
            {query.trim() && results.length === 0 && (
              <p className={styles.emptyMessage}>검색 결과가 없습니다</p>
            )}
            {results.map((venue) => (
              <button
                key={venue.id}
                type="button"
                className={styles.menuItem}
                onClick={() => handleSelect(venue)}
                role="option"
                aria-selected={filter.venueId === venue.id}
              >
                {venue.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
