import { describe, it, expect } from "vitest";
import { isScrolledEnough, WARM_SCROLL_VIEWPORTS } from "./useFabWarmUp";

describe("isScrolledEnough", () => {
  it("画面2枚分スクロールしたら true (デフォルト閾値)", () => {
    expect(WARM_SCROLL_VIEWPORTS).toBe(2);
    expect(isScrolledEnough(1600, 800)).toBe(true); // 2 * 800
  });

  it("2枚に満たなければ false", () => {
    expect(isScrolledEnough(1599, 800)).toBe(false);
  });

  it("ちょうど閾値で true (>=)", () => {
    expect(isScrolledEnough(800, 800, 1)).toBe(true);
  });

  it("viewportH が 0 / 不正なら false (まだ計測できない)", () => {
    expect(isScrolledEnough(9999, 0)).toBe(false);
  });

  it("viewports を上書きできる", () => {
    expect(isScrolledEnough(800, 800, 3)).toBe(false);
    expect(isScrolledEnough(2400, 800, 3)).toBe(true);
  });
});
