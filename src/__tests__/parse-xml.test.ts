import { describe, it, expect } from "vitest";
import { parseKopisXml } from "@/server/kopis/parse-xml";

describe("parseKopisXml", () => {
  it("parses multiple <db> items", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dbs>
  <db><mt20id>PF001</mt20id><prfnm>공연1</prfnm></db>
  <db><mt20id>PF002</mt20id><prfnm>공연2</prfnm></db>
</dbs>`;
    const result = parseKopisXml(xml);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("mt20id", "PF001");
    expect(result[1]).toHaveProperty("mt20id", "PF002");
  });

  it("normalizes single <db> into array", () => {
    const xml = `<dbs><db><mt20id>PF001</mt20id></db></dbs>`;
    const result = parseKopisXml(xml);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for no results", () => {
    const xml = `<dbs></dbs>`;
    const result = parseKopisXml(xml);
    expect(result).toEqual([]);
  });

  it("normalizes styurl and relate as arrays", () => {
    const xml = `<dbs><db>
      <mt20id>PF001</mt20id>
      <styurls><styurl>http://img1.jpg</styurl></styurls>
      <relates>
        <relate><relatenm>티켓</relatenm><relateurl>http://t.com</relateurl></relate>
      </relates>
    </db></dbs>`;
    const result = parseKopisXml<Record<string, unknown>>(xml);
    const db = result[0];
    // isArray config should make these arrays
    const styurls = db.styurls as { styurl: string[] };
    expect(Array.isArray(styurls.styurl)).toBe(true);
    const relates = db.relates as { relate: unknown[] };
    expect(Array.isArray(relates.relate)).toBe(true);
  });
});
