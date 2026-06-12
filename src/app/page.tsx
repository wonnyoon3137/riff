"use client";

import { Suspense, useCallback, useMemo } from "react";
import AppBar from "@/components/AppBar";
import FilterBar from "@/components/FilterBar";
import ResultSummary from "@/components/ResultSummary";
import PerformanceGrid, {
  PerformanceGridSkeleton,
} from "@/components/PerformanceGrid";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { useFilterState } from "@/hooks/useFilterState";
import { usePerformances } from "@/hooks/usePerformances";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import type { PerformanceSummary, SortOrder } from "@/domain/types";

function HomeContent() {
  const { filter, setFilter, resetFilter, flushFilter } = useFilterState();
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = usePerformances(filter);

  // Flatten all pages into a single item list
  const items = useMemo<PerformanceSummary[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  // Approximate total count from first page
  const totalCount = data?.pages?.[0]?.totalApprox;

  // 현재 캐시에 로드된 페이지 수 (복원 게이트용).
  const loadedPages = data?.pages?.length ?? 0;

  // Data is ready when we have at least one page loaded
  const isReady = !isLoading && !isError && data !== undefined;

  // Save/restore scroll position + loaded pages (#23)
  const { saveScroll } = useScrollRestore({
    filter,
    ready: isReady,
    loadedPages,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
    totalCount,
  });

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSortChange = useCallback(
    (sort: SortOrder) => {
      setFilter((prev) => ({ ...prev, sort }));
    },
    [setFilter],
  );

  const handleCardClick = useCallback(() => {
    // #22: 카드 네비게이션 직전, 보류 중이던 debounce URL 동기화를 즉시 flush해
    // 이후 router.replace가 상세 진입을 덮어쓰는 레이스를 제거한다.
    flushFilter();
    saveScroll();
  }, [flushFilter, saveScroll]);

  // State branching: S1-L, S1-DEFAULT, S1-E, S1-X
  let content: React.ReactNode;

  if (isLoading) {
    // S1-L: skeleton loading
    content = <PerformanceGridSkeleton />;
  } else if (isError) {
    // S1-X: error state
    content = <ErrorState onRetry={() => refetch()} />;
  } else if (items.length === 0) {
    // S1-E: empty state
    content = <EmptyState onReset={resetFilter} />;
  } else {
    // S1-DEFAULT + S1-MORE
    content = (
      <PerformanceGrid
        items={items}
        hasNext={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={handleLoadMore}
        onCardClick={handleCardClick}
      />
    );
  }

  return (
    <>
      <AppBar />
      <FilterBar
        filter={filter}
        onChange={setFilter}
        onReset={resetFilter}
        onFlush={flushFilter}
      />
      <ResultSummary
        totalCount={totalCount}
        isLoading={isLoading}
        sort={filter.sort}
        onSortChange={handleSortChange}
      />
      <main>{content}</main>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
