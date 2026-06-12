/**
 * 동시성 상한을 둔 병렬 매핑 (KOPIS 다중 지역 누적 fetch 부하 제어).
 *
 * 다중 지역(D4) × 누적 페이지(1..page) 조합으로 호출 수가 N×page 까지 늘 수 있다.
 * §7.2 동시성 상한(기본 5)으로 batch 분할해 동시 호출이 상한을 넘지 않게 한다.
 *
 * 입력 순서와 무관하게 결과는 입력 인덱스 순서로 반환한다.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const cap = Math.max(1, Math.min(limit, items.length || 1));
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: cap }, () => worker()));
  return results;
}
