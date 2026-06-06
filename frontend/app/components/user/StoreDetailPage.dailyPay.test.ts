import { describe, it, expect } from "vitest";
import { dailyPayLabel } from "./StoreDetailPage";

describe("dailyPayLabel", () => {
  it("payroll.type が『全額日払い』なら『全額』", () => {
    expect(dailyPayLabel({ payroll_system_type: "全額日払い" })).toBe("全額");
  });

  it("『日払い可』なら『OK』", () => {
    expect(dailyPayLabel({ payroll_system_type: "日払い可" })).toBe("OK");
  });

  it("feature_tags の『日払いあり』を拾う", () => {
    expect(dailyPayLabel({ feature_tags: ["未経験歓迎", "日払いあり"] })).toBe("OK");
  });

  it("feature_tags の『体入全額日払い』は『全額』に寄せる", () => {
    expect(dailyPayLabel({ feature_tags: ["体入全額日払い"] })).toBe("全額");
  });

  it("pay_system_types / 備考の自由入力も横断する", () => {
    expect(dailyPayLabel({ pay_system_note: "希望者は全額日払いOK" })).toBe("全額");
    expect(dailyPayLabel({ salary_notes: "日払い・週払い選択可" })).toBe("OK");
  });

  it("日払いへの言及がなければ null (セルは — 表示)", () => {
    expect(dailyPayLabel({ payroll_system_type: "月末締め翌月払い" })).toBeNull();
    expect(dailyPayLabel({})).toBeNull();
  });
});
