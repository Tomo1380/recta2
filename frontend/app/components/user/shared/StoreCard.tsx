import { Link } from "react-router";
import { Star } from "lucide-react";

interface StoreCardProps {
  id: number;
  name: string;
  area?: string;
  category?: string;
  hourly_min?: number;
  hourly_max?: number;
  feature_tags?: string[];
  images?: (string | { url: string })[];
  average_rating?: number;
  reviews_count?: number;
  is_pr?: boolean;
  className?: string;
}

function formatHourly(value: number | null | undefined): string {
  if (!value) return "—";
  return `¥${value.toLocaleString()}`;
}

function getImageUrl(
  image: string | { url: string } | undefined
): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  return image.url;
}

export default function StoreCard({
  id,
  name,
  area,
  category,
  hourly_min,
  hourly_max,
  feature_tags,
  images,
  average_rating,
  reviews_count,
  is_pr,
  className,
}: StoreCardProps) {
  const imageUrl = images && images.length > 0 ? getImageUrl(images[0]) : undefined;
  const rating = average_rating ?? 0;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <Link
      to={`/stores/${id}`}
      className={`group block overflow-hidden rounded-[16px] bg-white transition-shadow hover:shadow-lg ${className ?? "w-[270px]"}`}
      style={{
        boxShadow:
          "0px 4px 20px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      {/* Image section */}
      <div className="relative h-[160px] w-full overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1b2528 0%, #2a3a3f 100%)" }}
          >
            <span
              className="text-3xl font-bold"
              style={{ color: "#d4af37", fontFamily: "Outfit, sans-serif" }}
            >
              {name.charAt(0)}
            </span>
          </div>
        )}

        {/* Dark gradient overlay at bottom of image */}
        <div
          className="absolute inset-x-0 bottom-0 h-[60%]"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
          }}
        />

        {/* Category badge */}
        {category && (
          <span
            className="absolute left-2.5 top-2.5 rounded-[6px] px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: "rgba(200,96,128,0.9)" }}
          >
            {category}
          </span>
        )}

        {/* PR badge */}
        {is_pr && (
          <span
            className="absolute right-2.5 top-2.5 rounded-[6px] px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: "#d4af37" }}
          >
            PR
          </span>
        )}

        {/* Price overlay on bottom of image */}
        {(hourly_min || hourly_max) && (
          <div className="absolute bottom-2 left-2.5 text-[13px] font-semibold text-white">
            時給 {formatHourly(hourly_min)}〜{formatHourly(hourly_max)}
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-3.5">
        {/* Store name */}
        <h3
          className="mb-1 truncate text-sm font-bold"
          style={{ color: "#1b2528" }}
        >
          {name}
        </h3>

        {/* Area */}
        {area && (
          <p className="mb-2 text-xs" style={{ color: "rgba(27,37,40,0.5)" }}>
            {area}
          </p>
        )}

        {/* Rating */}
        {rating > 0 && (
          <div className="mb-2 flex items-center gap-1">
            <div className="flex items-center">
              {Array.from({ length: fullStars }).map((_, i) => (
                <Star
                  key={`full-${i}`}
                  className="size-3.5"
                  style={{ color: "#d4af37", fill: "#d4af37" }}
                />
              ))}
              {hasHalfStar && (
                <Star
                  key="half"
                  className="size-3.5"
                  style={{ color: "#d4af37", fill: "#d4af37", opacity: 0.5 }}
                />
              )}
              {Array.from({ length: emptyStars }).map((_, i) => (
                <Star
                  key={`empty-${i}`}
                  className="size-3.5"
                  style={{ color: "#d4af37", fill: "none" }}
                />
              ))}
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: "#1b2528" }}
            >
              {rating.toFixed(1)}
            </span>
            {reviews_count !== undefined && (
              <span
                className="text-[10px]"
                style={{ color: "rgba(27,37,40,0.4)" }}
              >
                ({reviews_count}件)
              </span>
            )}
          </div>
        )}

        {/* Feature tags */}
        {feature_tags && feature_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {feature_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  border: "1px solid rgba(212,175,55,0.3)",
                  color: "#d4af37",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
