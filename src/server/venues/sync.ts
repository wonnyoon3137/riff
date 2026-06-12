import { kopisGet, KopisApiError } from "@/server/kopis/client";
import { toVenue } from "@/server/kopis/normalize";
import { mapWithConcurrency } from "@/server/kopis/concurrency";
import {
  resetUnmatchedSidoLabels,
  getUnmatchedSidoLabels,
} from "@/domain/kopis-codes";
import type { KopisPrfplcListItem } from "@/server/kopis/raw-types";
import type { Venue } from "@/domain/types";
import { upsertVenues, getVenueDb, countVenues } from "./repo";
import type DatabaseType from "better-sqlite3";

// prfplc 페이지 크기(KOPIS 최대 100).
const ROWS = 100;
// 동시성 상한(DEC-C / kopis-integration §7.2 실측 5). prfplc 전량 fetch도 ≤5 batch.
const CONCURRENCY = Number(process.env.KOPIS_SYNC_CONCURRENCY) || 5;
// 무한 루프 방지 상한(전국 시설 ~수천 개 → 100건 기준 충분히 큰 값).
const MAX_PAGES = 500;

export interface SyncResult {
  /** KOPIS에서 fetch한 시설 목록 항목 수(정규화 전, dedup 전). */
  fetched: number;
  /** DB에 upsert된 건수. */
  upserted: number;
  /** 읽은 페이지 수. */
  pages: number;
  /** 부분 실패한 페이지 번호(있으면 성공분만 커밋). */
  failedPages: number[];
  /** 라벨→코드 매핑 실패한 시도 라벨(데이터 품질 관측). */
  unmatchedSidoLabels: Record<string, number>;
  /** 동기화 후 DB 총 행 수. */
  total: number;
  durationMs: number;
}

/** prfplc 목록 한 페이지 fetch + 정규화. NODATA(04)는 빈 배열. */
async function fetchPrfplcPage(cpage: number, now: Date): Promise<Venue[]> {
  try {
    const raw = await kopisGet<KopisPrfplcListItem>("/prfplc", {
      cpage,
      rows: ROWS,
    });
    return raw.map((item) => toVenue(item, now));
  } catch (err) {
    if (err instanceof KopisApiError && err.resultCode === "04") {
      return []; // NODATA → 페이지 소진
    }
    throw err;
  }
}

/**
 * 공연장 마스터 전량 동기화(D5). (DEC-D: prfplc **목록** 응답만 사용, 상세 호출 없음)
 *
 * - cpage=1..N 을 CONCURRENCY(≤5) batch로 fetch. 한 batch 안에서 rows 미만 페이지가
 *   나오면 끝에 도달한 것으로 보고 종료.
 * - 정규화(toVenue) 후 mt10id 기준 dedup → upsert(전량, 단일 트랜잭션).
 * - 한 페이지 fetch 실패는 해당 페이지만 건너뛰고(failedPages 기록) 성공분을 커밋한다.
 */
export async function syncVenues(options?: {
  /** 명시 DB 핸들(테스트용). 지정 시 dbPath 무시. */
  db?: DatabaseType.Database;
  dbPath?: string;
  log?: (msg: string) => void;
}): Promise<SyncResult> {
  const log = options?.log ?? ((m) => console.log(`[sync-venues] ${m}`));
  const startedAt = Date.now();
  const now = new Date();

  resetUnmatchedSidoLabels();

  const db = options?.db ?? getVenueDb(options?.dbPath);
  const byId = new Map<string, Venue>();
  const failedPages: number[] = [];
  let pages = 0;
  let reachedEnd = false;

  for (
    let batchStart = 1;
    batchStart <= MAX_PAGES && !reachedEnd;
    batchStart += CONCURRENCY
  ) {
    const batch: number[] = [];
    for (
      let p = batchStart;
      p < batchStart + CONCURRENCY && p <= MAX_PAGES;
      p++
    ) {
      batch.push(p);
    }

    const results = await mapWithConcurrency(batch, CONCURRENCY, async (cpage) => {
      try {
        const venues = await fetchPrfplcPage(cpage, now);
        return { cpage, venues, ok: true as const };
      } catch (err) {
        log(`page ${cpage} 실패: ${(err as Error).message}`);
        return { cpage, venues: [] as Venue[], ok: false as const };
      }
    });

    for (const r of results) {
      pages++;
      if (!r.ok) {
        failedPages.push(r.cpage);
        continue;
      }
      for (const v of r.venues) {
        if (v.id) byId.set(v.id, v);
      }
      // rows 미만(또는 0) → 마지막 페이지. 실패 페이지는 종료 판단에서 제외.
      if (r.venues.length < ROWS) reachedEnd = true;
    }

    log(`batch ${batchStart}..${batch[batch.length - 1]} 처리, 누적 ${byId.size}건`);
  }

  const venues = Array.from(byId.values());
  const upserted = upsertVenues(venues, db);
  const total = countVenues(db);
  const unmatched = getUnmatchedSidoLabels();

  const result: SyncResult = {
    fetched: venues.length,
    upserted,
    pages,
    failedPages,
    unmatchedSidoLabels: unmatched,
    total,
    durationMs: Date.now() - startedAt,
  };

  log(
    `완료: upsert ${upserted}건, 총 ${total}건, ${pages}페이지, ` +
      `실패 ${failedPages.length}페이지, ${result.durationMs}ms`,
  );
  if (Object.keys(unmatched).length > 0) {
    log(`미매핑 시도 라벨: ${JSON.stringify(unmatched)}`);
  }

  return result;
}
