"use client";

import { useCallback, useMemo, useState } from "react";
import type { FilterState } from "@/domain/types";
import { defaultFilterState, normalizeSearchTerm } from "@/domain/filter-url";
import { GENRE_DISPLAY_LABELS } from "@/domain/kopis-codes";
import PeriodFilter from "./filters/PeriodFilter";
import RegionFilter from "./filters/RegionFilter";
import GenreFilter from "./filters/GenreFilter";
import VenueFilter from "./filters/VenueFilter";
import SearchField from "./filters/SearchField";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  /** 검색 Enter 즉시 반영용 debounce flush (F5.3). */
  onFlush?: () => void;
}

function TuneIcon() {
  return (
    <svg
      className={styles.tuneIcon}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className={styles.closeIcon}
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

export default function FilterBar({
  filter,
  onChange,
  onReset,
  onFlush,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const def = useMemo(() => defaultFilterState(), []);

  const isDefault = useMemo(() => {
    return (
      filter.period.preset === def.period.preset &&
      filter.isNationwide === def.isNationwide &&
      filter.regions.length === 0 &&
      filter.genres.length === 0 &&
      !filter.venueId &&
      !normalizeSearchTerm(filter.searchTerm)
    );
  }, [filter, def]);

  // Count active filters for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.period.preset !== def.period.preset) count++;
    if (!filter.isNationwide && filter.regions.length > 0) count++;
    if (filter.genres.length > 0) count++;
    if (filter.venueId) count++;
    if (normalizeSearchTerm(filter.searchTerm)) count++;
    return count;
  }, [filter, def]);

  // Build chip summaries for mobile
  const summaryChips = useMemo(() => {
    const chips: string[] = [];
    if (filter.period.preset !== def.period.preset) {
      const labels: Record<string, string> = {
        THIS_MONTH: "이번 달",
        NEXT_MONTH: "다음 달",
        MONTH_AFTER: "그 다음 달",
        CUSTOM: `${filter.period.range.from.slice(5)}~${filter.period.range.to.slice(5)}`,
      };
      chips.push(labels[filter.period.preset] || "기간");
    }
    if (!filter.isNationwide && filter.regions.length > 0) {
      const label =
        filter.regions.length === 1
          ? filter.regions[0].label
          : `${filter.regions[0].label} 외 ${filter.regions.length - 1}`;
      chips.push(label);
    }
    if (filter.genres.length > 0) {
      const label =
        filter.genres.length === 1
          ? GENRE_DISPLAY_LABELS[filter.genres[0]]
          : `${GENRE_DISPLAY_LABELS[filter.genres[0]]} 외 ${filter.genres.length - 1}`;
      chips.push(label);
    }
    return chips;
  }, [filter, def]);

  const handleMobileReset = useCallback(() => {
    onReset();
    setMobileOpen(false);
  }, [onReset]);

  const handleMobileApply = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <nav className={styles.filterBar} aria-label="필터">
      {/* 영역 B' — 공연명 검색 (§2.3a, F5). 필터바 위 별도 줄. */}
      <div className={styles.searchRow}>
        <SearchField filter={filter} onChange={onChange} onFlush={onFlush} />
      </div>
      <div className={styles.inner}>
        {/* Desktop filter bar */}
        <div className={styles.desktopFilters}>
          <PeriodFilter filter={filter} onChange={onChange} />
          <div className={styles.separator} />
          <RegionFilter filter={filter} onChange={onChange} />
          <div className={styles.separator} />
          <GenreFilter filter={filter} onChange={onChange} />
          <div className={styles.separator} />
          <VenueFilter filter={filter} onChange={onChange} />
        </div>
        <button
          type="button"
          className={styles.resetButton}
          onClick={onReset}
          disabled={isDefault}
          aria-label="필터 초기화"
        >
          필터 초기화
        </button>

        {/* Mobile filter row */}
        <div className={styles.mobileRow}>
          <button
            type="button"
            className={styles.filterTrigger}
            onClick={() => setMobileOpen(true)}
            aria-label={`필터${activeFilterCount > 0 ? ` (${activeFilterCount}개 적용됨)` : ""}`}
          >
            <TuneIcon />
            필터
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>
          <div className={styles.chipSummary}>
            {summaryChips.map((chip) => (
              <span key={chip} className={styles.summaryChip}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile filter panel */}
      {mobileOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div className={styles.mobilePanel} role="dialog" aria-label="필터">
            <div className={styles.mobilePanelHeader}>
              <span className={styles.mobilePanelTitle}>필터</span>
              <button
                type="button"
                className={styles.mobilePanelClose}
                onClick={() => setMobileOpen(false)}
                aria-label="닫기"
              >
                <CloseIcon />
              </button>
            </div>

            <div className={styles.mobileSection}>
              <div className={styles.mobileSectionLabel}>기간</div>
              <PeriodFilter filter={filter} onChange={onChange} />
            </div>

            <div className={styles.mobileSection}>
              <div className={styles.mobileSectionLabel}>지역</div>
              <RegionFilter filter={filter} onChange={onChange} />
            </div>

            <div className={styles.mobileSection}>
              <div className={styles.mobileSectionLabel}>장르</div>
              <GenreFilter filter={filter} onChange={onChange} />
            </div>

            <div className={styles.mobileSection}>
              <div className={styles.mobileSectionLabel}>공연장</div>
              <VenueFilter filter={filter} onChange={onChange} />
            </div>

            <div className={styles.mobileActions}>
              <button
                type="button"
                className={styles.mobileResetButton}
                onClick={handleMobileReset}
              >
                초기화
              </button>
              <button
                type="button"
                className={styles.mobileApplyButton}
                onClick={handleMobileApply}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
