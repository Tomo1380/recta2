import { useCallback, useState } from "react";
import { api, ApiError } from "~/lib/api";

/**
 * 画像 1 枚を S3 にアップロードして public URL を返す hook。
 *
 * POST /admin/uploads/{kind}
 *   multipart: image=<File>
 *   return: { url: string }
 *
 * 呼び出し例:
 *   const { uploadFile, uploading, error } = useFileUpload("staff-photo");
 *   const url = await uploadFile(file);
 *   if (url) setForm({ ...form, image_url: url });
 *
 * - 親モデルに紐付けないので、URL を返してから呼び出し側で form に
 *   セットし、save 時に親と一緒に保存する設計。
 * - kind が変わらない hook を 1 つ作るパターン (Editor 内で 1 種類だけ
 *   upload する場合) と、kind 不問で呼ぶ場合の両対応。
 */
export interface UseFileUploadResult {
  uploadFile: (file: File) => Promise<string | null>;
  uploading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useFileUpload(kind: string): UseFileUploadResult {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("image", file);
        const res = await api.upload<{ url: string }>(
          `/admin/uploads/${kind}`,
          formData,
        );
        return res.url;
      } catch (err) {
        setError(extractMessage(err, "画像のアップロードに失敗しました"));
        return null;
      } finally {
        setUploading(false);
      }
    },
    [kind],
  );

  const clearError = useCallback(() => setError(null), []);

  return { uploadFile, uploading, error, clearError };
}

function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return (err.data?.message as string) ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
