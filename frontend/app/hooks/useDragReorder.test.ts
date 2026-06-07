import { describe, it, expect } from "vitest";
import { arrayMove } from "./useDragReorder";

describe("arrayMove", () => {
  it("先頭を末尾へ移動", () => {
    expect(arrayMove(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("末尾を先頭へ移動", () => {
    expect(arrayMove(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("隣へ 1 つ移動（下方向）", () => {
    expect(arrayMove(["a", "b", "c", "d"], 1, 2)).toEqual(["a", "c", "b", "d"]);
  });

  it("同じ位置なら不変", () => {
    expect(arrayMove(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });

  it("元配列を破壊しない", () => {
    const src = ["a", "b", "c"];
    arrayMove(src, 0, 2);
    expect(src).toEqual(["a", "b", "c"]);
  });
});
