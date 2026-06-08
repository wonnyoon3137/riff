"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import type { FilterState, RegionSelection } from "@/domain/types";
import { SIDO_LIST } from "@/domain/kopis-codes";
import styles from "./RegionFilter.module.css";

interface RegionFilterProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
}

function CaretIcon() {
  return (
    <svg
      className={styles.caretIcon}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
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

export default function RegionFilter({ filter, onChange }: RegionFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCodes = useMemo(
    () => new Set(filter.regions.map((r) => r.sidoCode)),
    [filter.regions],
  );
  const hasSelection = !filter.isNationwide && filter.regions.length > 0;

  // Close dropdown on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleNationwide = useCallback(() => {
    onChange({
      ...filter,
      isNationwide: true,
      regions: [],
    });
  }, [filter, onChange]);

  const handleToggleRegion = useCallback(
    (code: string, name: string) => {
      const isSelected = selectedCodes.has(code);
      let newRegions: RegionSelection[];

      if (isSelected) {
        newRegions = filter.regions.filter((r) => r.sidoCode !== code);
      } else {
        newRegions = [
          ...filter.regions,
          { sidoCode: code, label: name },
        ];
      }

      onChange({
        ...filter,
        isNationwide: newRegions.length === 0,
        regions: newRegions,
      });
    },
    [filter, onChange, selectedCodes],
  );

  const handleRemoveRegion = useCallback(
    (code: string) => {
      const newRegions = filter.regions.filter((r) => r.sidoCode !== code);
      onChange({
        ...filter,
        isNationwide: newRegions.length === 0,
        regions: newRegions,
      });
    },
    [filter, onChange],
  );

  // Determine display chips (max 2 shown, rest abbreviated)
  const displayChips = filter.regions.slice(0, 2);
  const extraCount = filter.regions.length - 2;

  const triggerClass = [
    styles.triggerChip,
    hasSelection ? styles.triggerChipActive : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={triggerClass}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        지역
        <CaretIcon />
      </button>

      {hasSelection &&
        displayChips.map((r) => (
          <span key={r.sidoCode} className={styles.inputChip}>
            {r.label}
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => handleRemoveRegion(r.sidoCode)}
              aria-label={`${r.label} 제거`}
            >
              <CloseIcon />
            </button>
          </span>
        ))}
      {extraCount > 0 && (
        <span className={styles.inputChip}>
          외 {extraCount}
        </span>
      )}

      {open && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className={styles.dropdown} role="listbox" aria-label="지역 선택">
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemHighlight}`}
              onClick={handleNationwide}
              role="option"
              aria-selected={filter.isNationwide}
            >
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={filter.isNationwide}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
              전국
            </button>
            {SIDO_LIST.map((sido) => (
              <button
                key={sido.code}
                type="button"
                className={styles.menuItem}
                onClick={() => handleToggleRegion(sido.code, sido.name)}
                role="option"
                aria-selected={selectedCodes.has(sido.code)}
              >
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={selectedCodes.has(sido.code)}
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {sido.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
