/**
 * react-easy-crop が返す crop 領域 (ピクセル) を使って、元画像を canvas で
 * 切り抜き、アップロード可能な File を生成するユーティリティ。
 *
 * - 出力は JPEG (写真用途。透過が要るケースは今のところ無い)。
 * - 長辺を maxSize に収めて過大な画像を避ける (アップロード/表示の軽量化)。
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = src;
  });
}

export interface CropToFileOptions {
  /** 出力ファイル名 (拡張子は .jpg に正規化される)。 */
  fileName?: string;
  /** 出力の長辺上限 px。デフォルト 1600。 */
  maxSize?: number;
  /** JPEG 品質 0-1。デフォルト 0.9。 */
  quality?: number;
}

/**
 * 画像 src と crop 領域 (px) から切り抜いた JPEG File を作る。
 */
export async function getCroppedImageFile(
  src: string,
  crop: PixelCrop,
  options: CropToFileOptions = {},
): Promise<File> {
  const { fileName = "cropped.jpg", maxSize = 1600, quality = 0.9 } = options;

  const image = await loadImage(src);

  // 出力サイズ: crop 領域そのまま。ただし長辺が maxSize を超えたら縮小。
  let outW = Math.round(crop.width);
  let outH = Math.round(crop.height);
  const longEdge = Math.max(outW, outH);
  if (longEdge > maxSize) {
    const scale = maxSize / longEdge;
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context を取得できませんでした");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outW,
    outH,
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("画像の生成に失敗しました"))),
      "image/jpeg",
      quality,
    );
  });

  const safeName = fileName.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], safeName, { type: "image/jpeg" });
}
