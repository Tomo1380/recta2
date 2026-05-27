import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShopForm, formToPayload, storeToForm } from "./useShopForm";
import type { Store } from "~/lib/types";

describe("useShopForm", () => {
  it("starts with all initial values empty/default", () => {
    const { result } = renderHook(() => useShopForm());
    expect(result.current.form.shopName).toBe("");
    expect(result.current.form.area).toBe("");
    expect(result.current.form.lat).toBeNull();
    expect(result.current.form.tags).toEqual([]);
    expect(result.current.form.sameDayTrial).toBe("可");
    expect(result.current.form.champagnePrices.tequila).toEqual({ amount: "", note: "" });
  });

  it("setField updates a single field", () => {
    const { result } = renderHook(() => useShopForm());
    act(() => result.current.setField("shopName", "テスト店"));
    expect(result.current.form.shopName).toBe("テスト店");
  });

  it("update merges multiple fields", () => {
    const { result } = renderHook(() => useShopForm());
    act(() => result.current.update({ shopName: "X", area: "新宿" }));
    expect(result.current.form.shopName).toBe("X");
    expect(result.current.form.area).toBe("新宿");
  });

  it("reset returns to INITIAL_FORM with fresh champagnePrices", () => {
    const { result } = renderHook(() => useShopForm());
    act(() => result.current.update({ shopName: "X", tags: ["a"] }));
    act(() => result.current.reset());
    expect(result.current.form.shopName).toBe("");
    expect(result.current.form.tags).toEqual([]);
  });
});

describe("storeToForm", () => {
  it("maps top-level scalar fields", () => {
    const store = {
      id: 1,
      name: "Lounge X",
      area: "六本木",
      address: "...",
      nearest_station: "六本木駅",
      category: "ラウンジ",
      opening_time: "20:00",
      closing_time: "LAST",
      holidays: "日曜",
      phone: "03-...",
      website_url: "https://x.example.com",
      hourly_min: 4000,
      hourly_max: 8000,
      daily_estimate: "50000",
      same_day_trial: true,
      feature_tags: ["未経験歓迎"],
      description: "desc",
      features_text: "特徴",
      publish_status: "published",
    } as unknown as Store;

    const form = storeToForm(store);
    expect(form.shopName).toBe("Lounge X");
    expect(form.area).toBe("六本木");
    expect(form.minWage).toBe("4000");
    expect(form.maxWage).toBe("8000");
    expect(form.sameDayTrial).toBe("可");
    expect(form.tags).toEqual(["未経験歓迎"]);
  });

  it("falls back to legacy single video_url when videos[] empty", () => {
    const store = {
      videos: [],
      video_url: "https://legacy.example.com/v.mp4",
    } as unknown as Store;
    const form = storeToForm(store);
    expect(form.videos).toHaveLength(1);
    expect(form.videos?.[0].video_url).toBe("https://legacy.example.com/v.mp4");
    expect(form.videos?.[0].label).toBe("店舗紹介動画");
  });

  it("uses videos[] when present", () => {
    const store = {
      videos: [
        { video_url: "https://a.example.com/v.mp4", label: "A", description: "d" },
      ],
      video_url: "https://legacy.example.com/v.mp4",
    } as unknown as Store;
    const form = storeToForm(store);
    expect(form.videos).toHaveLength(1);
    expect(form.videos?.[0].video_url).toBe("https://a.example.com/v.mp4");
  });

  it("strips non-digits from trial_avg_hourly (BUG-013)", () => {
    const store = {
      trial_avg_hourly: "5,000円",
      trial_hourly: "3,500円",
    } as unknown as Store;
    const form = storeToForm(store);
    expect(form.avgWage).toBe("5000");
    expect(form.trialWage).toBe("3500");
  });

  it("preserves dress_code_detail object structure", () => {
    const store = {
      dress_code_detail: {
        description: "黒系",
        ok_examples: [{ note: "OK1", image_url: "u1" }],
        ng_examples: [{ note: "NG1", image_url: "u2" }],
      },
    } as unknown as Store;
    const form = storeToForm(store);
    expect(form.dressCodeDescription).toBe("黒系");
    expect(form.dressCodeOk).toHaveLength(1);
    expect(form.dressCodeNg).toHaveLength(1);
  });

  it("handles staff_comment as legacy string", () => {
    const store = { staff_comment: "シンプルコメント" } as unknown as Store;
    const form = storeToForm(store);
    expect(form.staffComment).toBe("シンプルコメント");
  });

  it("handles staff_comment as object with all fields", () => {
    const store = {
      staff_comment: {
        name: "店長", role: "Manager", comment: "Hi",
        supports: ["事前面談"],
      },
    } as unknown as Store;
    const form = storeToForm(store);
    expect(form.staffName).toBe("店長");
    expect(form.staffComment).toBe("Hi");
    expect(form.supportItems).toEqual(["事前面談"]);
  });
});

describe("formToPayload", () => {
  it("builds business_hours from opening + closing time", () => {
    const { result } = renderHook(() => useShopForm());
    act(() => result.current.update({ openingTime: "20:00", closingTime: "LAST" }));
    const payload = result.current.buildPayload({ storeImages: [], publishStatus: "draft" });
    expect(payload.business_hours).toBe("20:00〜LAST");
    expect(payload.opening_time).toBe("20:00");
  });

  it("returns null business_hours when either side is empty", () => {
    const { result } = renderHook(() => useShopForm());
    act(() => result.current.setField("openingTime", "20:00"));
    const payload = result.current.buildPayload({ storeImages: [], publishStatus: "draft" });
    expect(payload.business_hours).toBeNull();
  });

  it("converts back_items label/value to label/amount", () => {
    const { result } = renderHook(() => useShopForm());
    act(() =>
      result.current.setField("backItems", [
        { label: "ボトル", value: "10%" },
        { label: "", value: "skip" },
      ]),
    );
    const payload = result.current.buildPayload({ storeImages: [], publishStatus: "draft" });
    expect(payload.back_items).toEqual([{ label: "ボトル", amount: "10%" }]);
  });

  it("filters empty videos and converts blank fields to null", () => {
    const { result } = renderHook(() => useShopForm());
    act(() =>
      result.current.setField("videos", [
        { video_url: "https://a.example.com/v.mp4", label: "", description: "" },
        { video_url: "", label: "skipped", description: "" },
      ]),
    );
    const payload = result.current.buildPayload({ storeImages: [], publishStatus: "draft" });
    expect(payload.videos).toEqual([
      { video_url: "https://a.example.com/v.mp4", label: null, description: null },
    ]);
  });

  it("converts same_day_trial '可' to true, '不可' to false", () => {
    const { result } = renderHook(() => useShopForm());
    act(() => result.current.setField("sameDayTrial", "不可"));
    const payload = result.current.buildPayload({ storeImages: [], publishStatus: "draft" });
    expect(payload.same_day_trial).toBe(false);
  });

  it("emits null for empty champagne_prices block", () => {
    const { result } = renderHook(() => useShopForm());
    const payload = result.current.buildPayload({ storeImages: [], publishStatus: "draft" });
    expect(payload.champagne_prices).toBeNull();
  });

  it("emits champagne_prices object when any entry is filled", () => {
    const { result } = renderHook(() => useShopForm());
    act(() =>
      result.current.update({
        champagnePrices: {
          tequila: { amount: "3000", note: "" },
          belle_epoque: { amount: "", note: "" },
          armand: { amount: "", note: "" },
          lavay: { amount: "", note: "" },
        },
      }),
    );
    const payload = formToPayload(result.current.form, { storeImages: [], publishStatus: "draft" });
    expect(payload.champagne_prices).toEqual({ tequila: { amount: 3000 } });
  });

  it("passes publish_status through to payload", () => {
    const { result } = renderHook(() => useShopForm());
    const payload = result.current.buildPayload({
      storeImages: [],
      publishStatus: "published",
    });
    expect(payload.publish_status).toBe("published");
  });
});
