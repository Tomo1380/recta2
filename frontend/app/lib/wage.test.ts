import { describe, it, expect } from "vitest";
import { trialDailyEstimate, TRIAL_HOURS_PER_DAY } from "./wage";

describe("trialDailyEstimate", () => {
  it("min と max から「最低〜最高」のレンジ文字列を作る (×4時間)", () => {
    expect(trialDailyEstimate(4500, 6000)).toBe("18,000〜24,000円");
  });

  it("min と max が同額なら 1 値で返す", () => {
    expect(trialDailyEstimate(5000, 5000)).toBe("20,000円");
  });

  it("min のみなら「〜」付きの下限表記", () => {
    expect(trialDailyEstimate(4500, null)).toBe("18,000円〜");
  });

  it("max のみなら「〜」始まりの上限表記", () => {
    expect(trialDailyEstimate(null, 6000)).toBe("〜24,000円");
  });

  it("両方空なら null (表示しない)", () => {
    expect(trialDailyEstimate(null, null)).toBeNull();
    expect(trialDailyEstimate("", "")).toBeNull();
    expect(trialDailyEstimate(0, 0)).toBeNull();
  });

  it("「5,000円」のような単位・カンマ付き文字列も数値として扱う", () => {
    expect(trialDailyEstimate("5,000円", "6,500円")).toBe("20,000〜26,000円");
  });

  it("1日の労働時間は定数で 4 時間", () => {
    expect(TRIAL_HOURS_PER_DAY).toBe(4);
  });
});
