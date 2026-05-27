import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useShopImages } from "./useShopImages";

describe("useShopImages", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    localStorage.clear();
  });

  it("starts empty with no error and not uploading", () => {
    const { result } = renderHook(() => useShopImages(1));
    expect(result.current.images).toEqual([]);
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("upload sets an error when storeId is null (new shop)", async () => {
    const { result } = renderHook(() => useShopImages(null));
    const files = makeFileList([]);

    await act(async () => {
      await result.current.upload(files);
    });

    expect(result.current.error).toMatch(/まず店舗を保存/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("upload replaces images with server response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ url: "/storage/stores/x.jpg", images: ["/storage/stores/x.jpg"] }),
        { status: 201 },
      ),
    );

    const { result } = renderHook(() => useShopImages(42));
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    const files = makeFileList([file]);

    await act(async () => {
      await result.current.upload(files);
    });

    await waitFor(() => expect(result.current.images).toEqual(["/storage/stores/x.jpg"]));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/stores/42/images",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("upload surfaces ApiError.data.message", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "size too large" }), { status: 422 }),
    );

    const { result } = renderHook(() => useShopImages(42));
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.upload(makeFileList([file]));
    });

    expect(result.current.error).toBe("size too large");
  });

  it("remove does nothing when storeId is null", async () => {
    const { result } = renderHook(() => useShopImages(null));
    await act(async () => {
      await result.current.remove(0);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("remove replaces images with server response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ images: ["/storage/stores/b.jpg"] }), { status: 200 }),
    );

    const { result } = renderHook(() => useShopImages(42));
    act(() => result.current.setImages(["/storage/stores/a.jpg", "/storage/stores/b.jpg"]));

    await act(async () => {
      await result.current.remove(0);
    });

    expect(result.current.images).toEqual(["/storage/stores/b.jpg"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/stores/42/images/0",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("clearError resets the error to null", async () => {
    const { result } = renderHook(() => useShopImages(null));
    await act(async () => {
      await result.current.upload(makeFileList([]));
    });
    expect(result.current.error).not.toBeNull();

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});

/**
 * Minimal FileList polyfill for tests (jsdom does not provide a constructor).
 */
function makeFileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      for (const f of files) yield f;
    },
  } as unknown as FileList;
  // index access
  files.forEach((f, i) => {
    (list as unknown as Record<number, File>)[i] = f;
  });
  return list;
}
