import { describe, it, expect } from "vitest";
import { dailyPayLabel } from "./StoreDetailPage";

describe("dailyPayLabel", () => {
  it("日払い上限が金額なら『OK』", () => {
    expect(dailyPayLabel({ daily_pay_limit: "30000円" })).toBe("OK");
    expect(dailyPayLabel({ daily_pay_limit: "5万円まで" })).toBe("OK");
  });

  it("日払い上限が『全額/上限なし/無制限』なら『全額』", () => {
    expect(dailyPayLabel({ daily_pay_limit: "全額" })).toBe("全額");
    expect(dailyPayLabel({ daily_pay_limit: "上限なし" })).toBe("全額");
    expect(dailyPayLabel({ daily_pay_limit: "無制限" })).toBe("全額");
  });

  it("daily_pay_limit 未設定でも feature_tags の『日払い』を拾う", () => {
    expect(dailyPayLabel({ feature_tags: ["未経験歓迎", "日払いOK"] })).toBe("OK");
    expect(dailyPayLabel({ feature_tags: ["体入全額日払い"] })).toBe("全額");
  });

  it("給与備考の『全額日払い：不可能』を『全額』と誤検出しない（バグ修正）", () => {
    // 自由文 (salary_notes 等) はもう参照しないので、否定文があっても拾わない。
    expect(
      dailyPayLabel({
        // @ts-expect-error 旧フィールドは無視される (構造化フィールド未設定なので null)
        salary_notes: "全額日払い：不可能 30000円まで要相談",
      }),
    ).toBeNull();
  });

  it("日払いの根拠がなければ null", () => {
    expect(dailyPayLabel({ daily_pay_limit: "" })).toBeNull();
    expect(dailyPayLabel({ feature_tags: ["月末締め翌月払い"] })).toBeNull();
    expect(dailyPayLabel({})).toBeNull();
  });
});
