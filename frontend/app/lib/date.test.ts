import { describe, it, expect } from "vitest";
import { formatDateJa } from "./date";

describe("formatDateJa", () => {
  it("空・無効値は空文字を返す", () => {
    expect(formatDateJa(null)).toBe("");
    expect(formatDateJa(undefined)).toBe("");
    expect(formatDateJa("")).toBe("");
    expect(formatDateJa("not-a-date")).toBe("");
  });

  it("UTC 深夜の値を JST 固定でフォーマットする (TZ に依存せず 1 日ズレない)", () => {
    // 2026-05-27T15:30:00Z は JST では 2026-05-28 00:30 → 5/28 になるべき。
    // timeZone を Asia/Tokyo に固定しているので、実行環境の TZ に関わらず一定。
    expect(formatDateJa("2026-05-27T15:30:00Z")).toBe("2026/5/28");
  });

  it("Date オブジェクトも受け付ける", () => {
    expect(formatDateJa(new Date("2026-01-01T00:00:00+09:00"))).toBe("2026/1/1");
  });
});
