import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import { getCroppedImageFile } from "~/lib/crop-image";

/**
 * 画像アップロード前のトリミングダイアログ。
 *
 * 選択されたファイルを受け取り、ドラッグ + ズームで切り抜き範囲を決めて
 * 切り抜き済みの File を返す。アスペクト比は呼び出し側で指定 (店舗写真は 4:3、
 * サムネは 16:9、アイコン系は 1 など)。`aspect` を undefined にすると自由比率。
 *
 * useFileUpload / useShopImages と組み合わせて使う:
 *   <input onChange={e => setPending(e.target.files?.[0] ?? null)} />
 *   {pending && (
 *     <ImageCropDialog file={pending} aspect={4/3}
 *       onCancel={() => setPending(null)}
 *       onCropped={async (f) => { await upload(f); setPending(null); }} />
 *   )}
 */
export interface ImageCropDialogProps {
  file: File;
  /** width / height。未指定なら自由比率。 */
  aspect?: number;
  /** 出力の長辺上限 px。 */
  maxSize?: number;
  title?: string;
  onCancel: () => void;
  onCropped: (file: File) => void | Promise<void>;
}

export function ImageCropDialog({
  file,
  aspect,
  maxSize,
  title = "画像をトリミング",
  onCancel,
  onCropped,
}: ImageCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 選択ファイルを object URL 化。アンマウント/差し替え時に revoke。
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Esc で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setAreaPixels(areaPx);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !areaPixels) return;
    setProcessing(true);
    setError(null);
    try {
      const cropped = await getCroppedImageFile(
        imageSrc,
        areaPixels,
        { fileName: file.name, maxSize },
      );
      await onCropped(cropped);
    } catch {
      setError("画像の切り抜きに失敗しました。もう一度お試しください。");
      setProcessing(false);
    }
  }, [imageSrc, areaPixels, file.name, maxSize, onCropped]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold text-[#1b2528]">{title}</h2>

        <div className="relative h-[320px] w-full overflow-hidden rounded-lg bg-neutral-900">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">ズーム</span>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            className="flex-1"
            aria-label="ズーム"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={processing || !areaPixels}>
            {processing ? "処理中…" : "この範囲で使用"}
          </Button>
        </div>
      </div>
    </div>
  );
}
