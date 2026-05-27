import { useCallback, useState } from "react";
import { api, ApiError } from "~/lib/api";

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
  setImages: (images: string[]) => void;
  upload: (files: FileList) => Promise<void>;
  remove: (index: number) => Promise<void>;
  uploading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useShopImages(storeId: number | string | null): UseShopImagesResult {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (files: FileList) => {
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
          const res = await api.upload<{ url: string; images: string[] }>(
            `/admin/stores/${storeId}/images`,
            formData,
          );
          setImages(res.images);
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
        const res = await api.delete<{ images: string[] }>(
          `/admin/stores/${storeId}/images/${index}`,
        );
        setImages(res.images);
      } catch (err) {
        setError(extractMessage(err, "画像の削除に失敗しました"));
      }
    },
    [storeId],
  );

  const clearError = useCallback(() => setError(null), []);

  return { images, setImages, upload, remove, uploading, error, clearError };
}

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return (err.data?.message as string) ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
