import { describe, it, expect } from "vitest";
import { dailyPayLabel } from "./StoreDetailPage";

describe("dailyPayLabel", () => {
  it("full → 全額", () => {
    expect(dailyPayLabel({ daily_pay_type: "full" })).toBe("全額");
  });

  it("yes → OK", () => {
    expect(dailyPayLabel({ daily_pay_type: "yes" })).toBe("OK");
  });

  it("capped → 上限◯（万円圧縮表示）", () => {
    expect(dailyPayLabel({ daily_pay_type: "capped", daily_pay_limit: 30000 })).toBe("上限3万円");
    expect(dailyPayLabel({ daily_pay_type: "capped", daily_pay_limit: 15000 })).toBe("上限1.5万円");
    expect(dailyPayLabel({ daily_pay_type: "capped", daily_pay_limit: 5000 })).toBe("上限5,000円");
  });

  it("capped で上限金額が無い/0 → OK", () => {
    expect(dailyPayLabel({ daily_pay_type: "capped", daily_pay_limit: null })).toBe("OK");
    expect(dailyPayLabel({ daily_pay_type: "capped", daily_pay_limit: 0 })).toBe("OK");
  });

  it("none / 未設定 → null", () => {
    expect(dailyPayLabel({ daily_pay_type: "none" })).toBeNull();
    expect(dailyPayLabel({})).toBeNull();
  });
});
