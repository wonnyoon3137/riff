"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import type { FilterState, RegionSelection, SidoCode } from "@/domain/types";
import { SIDO_LIST, GUGUN_MAP } from "@/domain/kopis-codes";
import type { GugunEntry } from "@/domain/kopis-codes";
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

function BackIcon() {
  return (
    <svg
      className={styles.backIcon}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Build a display label for a region selection. */
function buildLabel(sidoName: string, gugunName?: string): string {
  if (!gugunName) return sidoName;
  // Shorten the sido prefix for compactness in chips.
  const short = sidoName
    .replace(/특별자치도$/, "")
    .replace(/특별자치시$/, "")
    .replace(/특별시$/, "")
    .replace(/광역시$/, "")
    .replace(/도$/, "");
  return `${short} ${gugunName}`;
}

export default function RegionFilter({ filter, onChange }: RegionFilterProps) {
  const [open, setOpen] = useState(false);
  // null = sido list view, string = drilldown into that sido's guguns
  const [drillSido, setDrillSido] = useState<{
    code: SidoCode;
    name: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set of sido codes that have ANY selection (sido-level or gugun-level)
  const selectedSidoCodes = useMemo(
    () => new Set(filter.regions.map((r) => r.sidoCode)),
    [filter.regions],
  );

  // Check if a sido is selected at the sido-level (no gugunCode)
  const isSidoWhole = useCallback(
    (sidoCode: SidoCode) =>
      filter.regions.some(
        (r) => r.sidoCode === sidoCode && !r.gugunCode,
      ),
    [filter.regions],
  );

  const hasSelection = !filter.isNationwide && filter.regions.length > 0;

  // Close dropdown on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setDrillSido(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Reset drilldown when dropdown closes
  useEffect(() => {
    if (!open) setDrillSido(null);
  }, [open]);

  const handleNationwide = useCallback(() => {
    onChange({
      ...filter,
      isNationwide: true,
      regions: [],
    });
  }, [filter, onChange]);

  // Toggle a sido at the sido level ("entire sido" = no gugunCode).
  // This removes any gugun-level selections for that sido.
  const handleToggleSido = useCallback(
    (code: SidoCode, name: string) => {
      const wasWhole = isSidoWhole(code);

      let newRegions: RegionSelection[];
      if (wasWhole) {
        // Deselect: remove all entries for this sido
        newRegions = filter.regions.filter((r) => r.sidoCode !== code);
      } else {
        // Select whole sido: remove any gugun-level entries for this sido, add sido-level
        newRegions = [
          ...filter.regions.filter((r) => r.sidoCode !== code),
          { sidoCode: code, label: name },
        ];
      }

      onChange({
        ...filter,
        isNationwide: newRegions.length === 0,
        regions: newRegions,
      });
    },
    [filter, onChange, isSidoWhole],
  );

  // Open the gugun drilldown panel for a sido
  const handleDrillDown = useCallback(
    (code: SidoCode, name: string) => {
      setDrillSido({ code, name });
    },
    [],
  );

  // Toggle a gugun within the currently drilled-down sido
  const handleToggleGugun = useCallback(
    (gugun: GugunEntry) => {
      if (!drillSido) return;

      const isSelected = filter.regions.some(
        (r) => r.sidoCode === drillSido.code && r.gugunCode === gugun.code,
      );

      let newRegions: RegionSelection[];
      if (isSelected) {
        // Remove this gugun
        newRegions = filter.regions.filter(
          (r) =>
            !(r.sidoCode === drillSido.code && r.gugunCode === gugun.code),
        );
      } else {
        // If sido-level was selected, remove it first (switch to gugun-level)
        const withoutSidoLevel = filter.regions.filter(
          (r) => !(r.sidoCode === drillSido.code && !r.gugunCode),
        );
        newRegions = [
          ...withoutSidoLevel,
          {
            sidoCode: drillSido.code,
            gugunCode: gugun.code,
            label: buildLabel(drillSido.name, gugun.name),
          },
        ];
      }

      onChange({
        ...filter,
        isNationwide: newRegions.length === 0,
        regions: newRegions,
      });
    },
    [filter, onChange, drillSido],
  );

  // "Select all guguns" = select sido-level (whole sido)
  const handleSelectSidoWhole = useCallback(() => {
    if (!drillSido) return;
    handleToggleSido(drillSido.code, drillSido.name);
  }, [drillSido, handleToggleSido]);

  const handleRemoveRegion = useCallback(
    (region: RegionSelection) => {
      const newRegions = filter.regions.filter((r) => {
        if (region.gugunCode) {
          return !(
            r.sidoCode === region.sidoCode &&
            r.gugunCode === region.gugunCode
          );
        }
        return r.sidoCode !== region.sidoCode;
      });
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

  // Gugun entries for the drilled-down sido
  const drillGuguns: GugunEntry[] = drillSido
    ? GUGUN_MAP[drillSido.code] ?? []
    : [];

  // Selected gugun codes for the drilled-down sido
  const drillSelectedGuguns = useMemo(() => {
    if (!drillSido) return new Set<string>();
    return new Set(
      filter.regions
        .filter((r) => r.sidoCode === drillSido.code && r.gugunCode)
        .map((r) => r.gugunCode!),
    );
  }, [filter.regions, drillSido]);

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
          <span
            key={r.gugunCode ?? r.sidoCode}
            className={styles.inputChip}
          >
            {r.label}
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => handleRemoveRegion(r)}
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
          <div
            className={styles.dropdown}
            role="listbox"
            aria-label={drillSido ? `${drillSido.name} 구군 선택` : "지역 선택"}
          >
            {drillSido === null ? (
              /* ── Sido list view ── */
              <>
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
                {SIDO_LIST.map((sido) => {
                  const hasGugunSelection = filter.regions.some(
                    (r) => r.sidoCode === sido.code && r.gugunCode,
                  );
                  const isWhole = isSidoWhole(sido.code);
                  const isPartial = hasGugunSelection && !isWhole;

                  return (
                    <div key={sido.code} className={styles.sidoRow}>
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() =>
                          handleToggleSido(sido.code, sido.name)
                        }
                        role="option"
                        aria-selected={
                          isWhole || selectedSidoCodes.has(sido.code)
                        }
                      >
                        <input
                          type="checkbox"
                          className={`${styles.checkbox} ${isPartial ? styles.checkboxIndeterminate : ""}`}
                          checked={isWhole}
                          readOnly
                          tabIndex={-1}
                          aria-hidden="true"
                          ref={(el) => {
                            if (el) el.indeterminate = isPartial;
                          }}
                        />
                        {sido.name}
                      </button>
                      <button
                        type="button"
                        className={styles.drillButton}
                        onClick={() =>
                          handleDrillDown(sido.code, sido.name)
                        }
                        aria-label={`${sido.name} 구군 선택`}
                      >
                        <svg
                          className={styles.chevronIcon}
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </>
            ) : (
              /* ── Gugun drilldown view ── */
              <>
                <button
                  type="button"
                  className={`${styles.menuItem} ${styles.menuItemHighlight}`}
                  onClick={() => setDrillSido(null)}
                >
                  <BackIcon />
                  {drillSido.name}
                </button>
                <button
                  type="button"
                  className={`${styles.menuItem} ${styles.menuItemHighlight}`}
                  onClick={handleSelectSidoWhole}
                  role="option"
                  aria-selected={isSidoWhole(drillSido.code)}
                >
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isSidoWhole(drillSido.code)}
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  {drillSido.name} 전체
                </button>
                {drillGuguns.map((gugun) => (
                  <button
                    key={gugun.code}
                    type="button"
                    className={styles.menuItem}
                    onClick={() => handleToggleGugun(gugun)}
                    role="option"
                    aria-selected={drillSelectedGuguns.has(gugun.code)}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={drillSelectedGuguns.has(gugun.code)}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    {gugun.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
