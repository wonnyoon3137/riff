"use client";

import { useCallback, useState } from "react";
import type { FilterState, PeriodPreset } from "@/domain/types";
import { presetToRange, isRangeExceeded, clampRange } from "@/domain/filter-url";
import { useToast } from "@/components/common/Toast";
import styles from "./PeriodFilter.module.css";

/** D3 / screens.md §B-1: 31일 초과 보정 안내 토스트 메시지 */
const PERIOD_LIMIT_MESSAGE = "최대 31일까지 선택 가능합니다";

interface PeriodFilterProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
}

const PRESET_LABELS: { preset: PeriodPreset; label: string }[] = [
  { preset: "THIS_MONTH", label: "이번 달" },
  { preset: "NEXT_MONTH", label: "다음 달" },
  { preset: "MONTH_AFTER", label: "그 다음 달" },
  { preset: "CUSTOM", label: "직접 선택" },
];

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

export default function PeriodFilter({ filter, onChange }: PeriodFilterProps) {
  const { showToast } = useToast();
  const [showDateInputs, setShowDateInputs] = useState(
    filter.period.preset === "CUSTOM",
  );

  const currentPreset = filter.period.preset === "DEFAULT_30D"
    ? null
    : filter.period.preset;

  const handlePresetClick = useCallback(
    (preset: PeriodPreset) => {
      if (preset === "CUSTOM") {
        setShowDateInputs(true);
        // Keep current range for custom, user will adjust
        onChange({
          ...filter,
          period: { preset: "CUSTOM", range: filter.period.range },
        });
        return;
      }

      setShowDateInputs(false);
      const range = presetToRange(preset);
      onChange({
        ...filter,
        period: { preset, range },
      });
    },
    [filter, onChange],
  );

  const handleDateChange = useCallback(
    (field: "from" | "to", value: string) => {
      if (!value) return;

      const newRange = { ...filter.period.range, [field]: value };

      if (isRangeExceeded(newRange)) {
        const clamped = clampRange(newRange);
        showToast(PERIOD_LIMIT_MESSAGE);
        onChange({
          ...filter,
          period: { preset: "CUSTOM", range: clamped },
        });
        return;
      }

      onChange({
        ...filter,
        period: { preset: "CUSTOM", range: newRange },
      });
    },
    [filter, onChange, showToast],
  );

  return (
    <div className={styles.container}>
      {PRESET_LABELS.map(({ preset, label }) => {
        const isSelected = currentPreset === preset;
        const chipClass = [
          styles.chip,
          isSelected ? styles.chipSelected : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={preset}
            type="button"
            className={chipClass}
            onClick={() => handlePresetClick(preset)}
            aria-pressed={isSelected}
          >
            {isSelected && <CheckIcon />}
            {preset === "CUSTOM" && isSelected && filter.period.range.from
              ? `${filter.period.range.from.slice(5).replace("-", ".")}–${filter.period.range.to.slice(5).replace("-", ".")}`
              : label}
          </button>
        );
      })}
      {showDateInputs && currentPreset === "CUSTOM" && (
        <div className={styles.dateInputs}>
          <input
            type="date"
            className={styles.dateInput}
            value={filter.period.range.from}
            onChange={(e) => handleDateChange("from", e.target.value)}
            aria-label="시작일"
          />
          <span className={styles.dateSeparator}>~</span>
          <input
            type="date"
            className={styles.dateInput}
            value={filter.period.range.to}
            onChange={(e) => handleDateChange("to", e.target.value)}
            aria-label="종료일"
          />
        </div>
      )}
    </div>
  );
}
