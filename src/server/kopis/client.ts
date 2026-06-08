import { parseKopisXml } from "./parse-xml";

export class KopisHttpError extends Error {
  constructor(
    public status: number,
    message?: string,
  ) {
    super(message ?? `KOPIS HTTP ${status}`);
    this.name = "KopisHttpError";
  }
}

export class KopisApiError extends Error {
  constructor(
    public resultCode: string,
    message?: string,
  ) {
    super(message ?? `KOPIS API error: resultCode=${resultCode}`);
    this.name = "KopisApiError";
  }
}

function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

async function fetchWithTimeout(
  url: URL,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url.toString(), { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * KOPIS API GET 호출. XML을 파싱하여 <db> 배열로 반환.
 * 1회 재시도(타임아웃/5xx). resultCode != 00이면 KopisApiError.
 */
export async function kopisGet<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T[]> {
  const baseUrl = getEnv("KOPIS_BASE_URL");
  const serviceKey = getEnv("KOPIS_SERVICE_KEY");
  const timeoutMs = Number(process.env.KOPIS_TIMEOUT_MS) || 5000;

  const url = new URL(baseUrl + path);
  url.searchParams.set("service", serviceKey);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url, timeoutMs);
      if (!res.ok) {
        lastError = new KopisHttpError(res.status);
        if (res.status >= 500) continue; // retry on 5xx
        throw lastError;
      }
      const text = await res.text();

      // KOPIS 에러 응답 감지 (resultCode가 00이 아닌 경우 XML에 포함)
      if (text.includes("<resultCode>") && !text.includes("<resultCode>00</resultCode>")) {
        const codeMatch = text.match(/<resultCode>(\d+)<\/resultCode>/);
        const msgMatch = text.match(/<resultMsg>([^<]*)<\/resultMsg>/);
        throw new KopisApiError(
          codeMatch?.[1] ?? "unknown",
          msgMatch?.[1] ?? undefined,
        );
      }

      return parseKopisXml<T>(text);
    } catch (err) {
      lastError = err as Error;
      if (err instanceof KopisApiError) throw err;
      if (err instanceof KopisHttpError && err.status < 500) throw err;
      if (attempt === 1) throw lastError;
    }
  }
  throw lastError!;
}
