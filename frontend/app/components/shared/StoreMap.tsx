import { useMemo } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, CircleF } from "@react-google-maps/api";
import { LUXE } from "~/lib/luxe-tokens";

/**
 * Shared Google Maps wrapper used in two places:
 *
 *  1. Store address mini-map (店舗の場所) — single marker, no circles
 *  2. Transfer / 足代 zone map (送り範囲) — same marker plus one or more
 *     concentric colored Circles representing distance-based pickup fees
 *
 * Loads the Maps JS API once per page via useJsApiLoader. If lat/lng is
 * missing (admin hasn't pressed 「住所から緯度経度を取得」 yet) we render a soft
 * placeholder instead of an empty grey box.
 */

export interface StoreMapZone {
  /** Radius in kilometers (numeric or numeric-string). */
  radius_km?: number | string | null;
  /** Hex color, e.g. "#D4AF37". Falls back to LUXE.gold when missing. */
  color?: string | null;
}

interface StoreMapProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  /** Concentric fee zones. Omit or pass [] for plain address-only maps. */
  zones?: StoreMapZone[];
  /** Map height in px. Defaults to 200. */
  height?: number;
  /** Address fallback shown when lat/lng is missing. */
  fallbackAddress?: string | null;
}

// 元はダーク系のサイトトーンに合わせて DARK_MAP_STYLE を当てていたが、
// 「lat/lng 取得前の標準 Google Maps embed の方が見やすい」という運用 FB
// を受けてプレーンな Google 標準スタイルに戻した。lat/lng 取得前後で
// 見た目が揃うようになり、店舗の場所感もパッと掴みやすくなる。

const MAPS_LIBRARIES: ("places")[] = [];

export default function StoreMap({
  lat,
  lng,
  zones = [],
  height = 200,
  fallbackAddress,
}: StoreMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? "",
    libraries: MAPS_LIBRARIES,
    language: "ja",
    region: "JP",
  });

  // radius_km は number か文字列 ("2", "2.5", "2.5km", "2km〜" 等) で来うる。
  // 末尾の単位や前置記号を全部削ぎ落としてから Number 化する。
  const parseRadius = (raw: unknown): number => {
    if (raw == null) return NaN;
    if (typeof raw === "number") return raw;
    const m = String(raw).match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  };

  // Auto-fit zoom so the outermost circle fills the frame nicely.
  const zoom = useMemo(() => {
    const radii = (zones ?? [])
      .map((z) => parseRadius(z?.radius_km))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (radii.length === 0) return 15;
    const max = Math.max(...radii);
    if (max <= 1) return 14;
    if (max <= 3) return 13;
    if (max <= 7) return 12;
    if (max <= 15) return 11;
    if (max <= 30) return 10;
    return 9;
  }, [zones]);

  if (!apiKey) {
    return (
      <Placeholder
        height={height}
        message={
          fallbackAddress
            ? `${fallbackAddress}（マップは準備中）`
            : "マップは準備中"
        }
      />
    );
  }

  if (loadError) {
    return <Placeholder height={height} message="マップを読み込めませんでした" />;
  }

  if (!isLoaded) {
    return <Placeholder height={height} message="マップを読み込み中…" loading />;
  }

  if (typeof lat !== "number" || typeof lng !== "number") {
    return (
      <Placeholder
        height={height}
        message={
          fallbackAddress
            ? `${fallbackAddress}（緯度経度未設定）`
            : "緯度経度が未設定です"
        }
      />
    );
  }

  const center = { lat, lng };

  return (
    <div className="overflow-hidden rounded-[12px]" style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={zoom}
        options={{
          // styles を指定しないと Google Maps 標準の明るいトーンになる。
          // ダーク UI に揃えるよりも「Google 地図ぽい慣れた見た目」の方が
          // ユーザーにとって場所感を取りやすい。
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
        }}
      >
        {/* Render outer zones first so smaller ones sit on top. */}
        {[...(zones ?? [])]
          .map((z) => ({ ...z, _km: parseRadius(z?.radius_km) }))
          .filter((z) => Number.isFinite(z._km) && z._km > 0)
          .sort((a, b) => b._km - a._km)
          .map((zone, i) => {
            const km = zone._km;
            const color = zone.color || LUXE.gold;
            return (
              <CircleF
                key={`${km}-${i}`}
                center={center}
                radius={km * 1000}
                options={{
                  strokeColor: color,
                  strokeOpacity: 0.9,
                  strokeWeight: 2,
                  fillColor: color,
                  fillOpacity: 0.28,
                  clickable: false,
                }}
              />
            );
          })}
        <MarkerF position={center} />
      </GoogleMap>
    </div>
  );
}

function Placeholder({
  height,
  message,
  loading,
}: {
  height: number;
  message: string;
  loading?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-[12px] text-[12px]"
      style={{
        height,
        background: `linear-gradient(135deg, ${LUXE.dark}, ${LUXE.darkSoft})`,
        color: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(212,175,55,0.18)",
      }}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="size-3 animate-spin rounded-full border-2 border-transparent"
            style={{ borderTopColor: LUXE.gold }}
          />
          {message}
        </span>
      ) : (
        <span>{message}</span>
      )}
    </div>
  );
}
