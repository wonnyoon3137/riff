import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  // 단일/배열 혼재 필드 대응: 항상 배열로 파싱
  isArray: (_name, jpath) => {
    return (
      jpath === "dbs.db" ||
      jpath === "dbs.db.styurls.styurl" ||
      jpath === "dbs.db.relates.relate"
    );
  },
});

/**
 * KOPIS XML 응답 텍스트를 파싱하여 <dbs><db> 배열을 반환한다.
 * 단일 결과도 배열로 정규화.
 */
export function parseKopisXml<T>(xml: string): T[] {
  const parsed = parser.parse(xml);
  const dbs = parsed?.dbs?.db;
  if (!dbs) return [];
  return Array.isArray(dbs) ? dbs : [dbs];
}
