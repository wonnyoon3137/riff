import { NextRequest, NextResponse } from "next/server";
import { kopisGet, KopisApiError } from "@/server/kopis/client";
import { toPerformance } from "@/server/kopis/normalize";
import type { KopisPblprfrDetail } from "@/server/kopis/raw-types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mt20id: string }> },
) {
  const { mt20id } = await params;

  try {
    const items = await kopisGet<KopisPblprfrDetail>(`/pblprfr/${mt20id}`, {});
    if (items.length === 0) {
      return NextResponse.json(
        { error: "공연을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    const performance = toPerformance(items[0]);
    return NextResponse.json(performance);
  } catch (err) {
    if (err instanceof KopisApiError && err.resultCode === "04") {
      return NextResponse.json(
        { error: "공연을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error(`[/api/performances/${mt20id}]`, err);
    return NextResponse.json(
      { error: "공연 상세 정보를 불러올 수 없습니다." },
      { status: 502 },
    );
  }
}
