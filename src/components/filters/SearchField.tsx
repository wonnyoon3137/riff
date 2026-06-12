"use client";

import { useCallback, useEffect, useState } from "react";
import type { FilterState } from "@/domain/types";
import { SEARCH_MIN_LENGTH } from "@/domain/filter-url";
import styles from "./SearchField.module.css";

interface SearchFieldProps {
  filter: FilterState;
  /** debounce(300ms) URL 동기화 + 재조회를 트리거(useFilterState.setFilter). */
  onChange: (next: FilterState) => void;
  /** 보류 중인 debounce를 즉시 실행(Enter 즉시 반영, F5.3). */
  onFlush?: () => void;
}

function SearchIcon() {
  return (
    <svg
      className={styles.leadingIcon}
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

function ClearIcon() {
  return (
    <svg
      className={styles.clearIcon}
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

/**
 * 공연명 검색 입력 (S1 §2.3a, F5).
 *
 * - 로컬 입력 state(`text`)는 즉시 반영(타이핑 지연 없음). 실제 필터 동기화는
 *   `onChange`(useFilterState.setFilter)의 debounce 300ms(D6)로 처리한다.
 * - 2자 미만은 도메인 가드(normalizeSearchTerm)가 `?q=` 미전송으로 처리하므로
 *   전체 목록이 유지된다. UI는 입력값을 그대로 보여주되 검색은 비활성(F5.4).
 * - URL→필터 복원(뒤로가기, D8): `filter.searchTerm`이 외부에서 바뀌면 입력값을 동기화.
 */
export default function SearchField({
  filter,
  onChange,
  onFlush,
}: SearchFieldProps) {
  const [text, setText] = useState(filter.searchTerm ?? "");

  // URL→필터 복원/외부 변경(초기화 등) 시 입력값 동기화(D8).
  // 사용자 타이핑은 로컬 state가 즉시 반영하므로, 정규화된 값이 같으면 갱신하지 않음.
  useEffect(() => {
    const incoming = filter.searchTerm ?? "";
    setText((prev) => (prev.trim() === incoming.trim() ? prev : incoming));
  }, [filter.searchTerm]);

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      onChange({ ...filter, searchTerm: value });
    },
    [filter, onChange],
  );

  const handleClear = useCallback(() => {
    setText("");
    onChange({ ...filter, searchTerm: undefined });
  }, [filter, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        // 즉시 반영(debounce 스킵, F5.3).
        onFlush?.();
      } else if (e.key === "Escape" && text.length > 0) {
        e.preventDefault();
        handleClear();
      }
    },
    [text, onFlush, handleClear],
  );

  const hasText = text.length > 0;
  // 입력은 있으나 2자 미만이면 검색 비활성 힌트(F5.4).
  const isTooShort = hasText && text.trim().length < SEARCH_MIN_LENGTH;

  return (
    <div className={styles.field}>
      <SearchIcon />
      <input
        type="search"
        className={styles.input}
        placeholder="공연명 검색"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="공연명 검색"
        autoComplete="off"
        enterKeyHint="search"
      />
      {isTooShort && (
        <span className={styles.hint} role="note">
          {SEARCH_MIN_LENGTH}자 이상
        </span>
      )}
      {hasText && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="검색어 지우기"
        >
          <ClearIcon />
        </button>
      )}
    </div>
  );
}
