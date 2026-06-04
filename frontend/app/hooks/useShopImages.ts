import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { api, ApiError } from "~/lib/api";

/**
 * サーバの images は {url, order} オブジェクトと生 URL 文字列が混在しうるため、
 * 管理画面が扱う URL 文字列配列に正規化する。
 */
function toUrlList(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) =>
      typeof img === "string" ? img : ((img as { url?: string })?.url ?? ""),
    )
    .filter((u): u is string => typeof u === "string" && u !== "");
}

/**
 * ShopEditPage の店舗写真 (images JSONB) アップロード/削除を集約。
 *
 * Phase 3-1 で ShopEditPage から切り出し。
 * - 内部 state: storeImages, uploading, error
 * - 新規店舗 (storeId === null) では upload を拒否し、error メッセージで案内
 * - サーバが返す images 配列で local state を上書きする (差分計算しない)
 *
 * 使い方:
 *   const { images, setImages, upload, remove, uploading, error } =
 *     useShopImages(storeId);
 *
 *   await upload(files);
 *   await remove(0);
 */
export interface UseShopImagesResult {
  images: string[];
  setImages: Dispatch<SetStateAction<string[]>>;
  /** FileList (input) でも File[] (トリミング後) でも受け取れる。 */
  upload: (files: FileList | File[]) => Promise<void>;
  remove: (index: number) => Promise<void>;
  /** order = 現在の index を新しい並び順で列挙した配列。サーバへ永続化する。 */
  reorder: (order: number[]) => Promise<void>;
  uploading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useShopImages(storeId: number | string | null): UseShopImagesResult {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      if (!storeId) {
        setError("画像をアップロードするには、まず店舗を保存してください。");
        return;
      }
      setUploading(true);
      setError(null);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("image", file);
          const res = await api.upload<{ url: string; images: unknown[] }>(
            `/admin/stores/${storeId}/images`,
            formData,
          );
          setImages(toUrlList(res.images));
        }
      } catch (err) {
        setError(extractMessage(err, "画像のアップロードに失敗しました"));
      } finally {
        setUploading(false);
      }
    },
    [storeId],
  );

  const remove = useCallback(
    async (index: number) => {
      if (!storeId) return;
      try {
        const res = await api.delete<{ images: unknown[] }>(
          `/admin/stores/${storeId}/images/${index}`,
        );
        setImages(toUrlList(res.images));
      } catch (err) {
        setError(extractMessage(err, "画像の削除に失敗しました"));
      }
    },
    [storeId],
  );

  const reorder = useCallback(
    async (order: number[]) => {
      if (!storeId) return;
      // 楽観的更新: 先にローカルを並べ替えてから永続化し、サーバの正規化結果で確定。
      setImages((prev) => order.map((i) => prev[i]).filter((u): u is string => !!u));
      try {
        const res = await api.put<{ images: unknown[] }>(
          `/admin/stores/${storeId}/images/reorder`,
          { order },
        );
        setImages(toUrlList(res.images));
      } catch (err) {
        setError(extractMessage(err, "画像の並び替えに失敗しました"));
      }
    },
    [storeId],
  );

  const clearError = useCallback(() => setError(null), []);

  return { images, setImages, upload, remove, reorder, uploading, error, clearError };
}

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return (err.data?.message as string) ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
