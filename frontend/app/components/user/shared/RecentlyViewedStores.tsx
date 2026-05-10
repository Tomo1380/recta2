import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Clock } from "lucide-react";

import { getViewedStores, type ViewedStore } from "~/lib/viewed-stores";

interface RecentlyViewedStoresProps {
  /** Hide this store id from the list (e.g. while on its own detail page) */
  excludeId?: number;
  /** Max items to render (default 5) */
  limit?: number;
  /** Optional title override */
  title?: string;
  /** Visual variant — `card` for white card with shadow (detail page),
   *  `flush` for horizontal scroller (top page). */
  variant?: "card" | "flush";
}

const GOLD = "#D4AF37";
const DARK = "#1b2528";

function formatHourly(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  if (min && max) return `時給 ¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
  if (min) return `時給 ¥${min.toLocaleString()}〜`;
  return `時給 〜¥${max!.toLocaleString()}`;
}

export default function RecentlyViewedStores({
  excludeId,
  limit = 5,
  title = "あなたが見た記事",
  variant = "card",
}: RecentlyViewedStoresProps) {
  // Hydration-safe: render nothing on the server, populate on the client.
  const [items, setItems] = useState<ViewedStore[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setItems(getViewedStores());
  }, []);

  if (!hydrated) return null;

  const filtered = items
    .filter((s) => (excludeId ? s.id !== excludeId : true))
    .slice(0, limit);

  if (filtered.length === 0) return null;

  if (variant === "flush") {
    return (
      <section className="mt-6 px-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-1 h-5 rounded-full"
              style={{ background: `linear-gradient(180deg,${GOLD},#c8960c)` }}
            />
            <h2
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "17px",
                letterSpacing: "-0.02em",
                color: DARK,
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>
        </div>
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {filtered.map((store) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="shrink-0 rounded-2xl overflow-hidden"
              style={{
                width: "180px",
                background: "white",
                boxShadow:
                  "0 4px 20px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)",
                border: "1px solid rgba(27,37,40,.06)",
                textDecoration: "none",
              }}
            >
              <div
                className="relative w-full overflow-hidden"
                style={{ height: "100px" }}
              >
                {store.image_url ? (
                  <img
                    src={store.image_url}
                    alt={store.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #1b2528, #2a3a3f)",
                    }}
                  >
                    <span
                      style={{ fontSize: "22px", fontWeight: 700, color: GOLD }}
                    >
                      {store.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'Noto Sans JP',sans-serif",
                    fontWeight: 600,
                    fontSize: "12.5px",
                    color: DARK,
                    margin: 0,
                  }}
                >
                  {store.name}
                </p>
                {store.area && (
                  <p
                    className="truncate"
                    style={{
                      fontFamily: "'Noto Sans JP',sans-serif",
                      fontWeight: 400,
                      fontSize: "10px",
                      color: "rgba(27,37,40,.5)",
                      margin: "2px 0 0",
                    }}
                  >
                    {store.area}
                    {store.category ? ` / ${store.category}` : ""}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // `card` variant — used on the StoreDetailPage to keep visual consistency
  // with the surrounding `SectionCard`s.
  return (
    <div
      className="overflow-hidden rounded-[16px] bg-white"
      style={{
        boxShadow:
          "0px 4px 20px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      <div className="px-5 pt-5 pb-3">
        <h2
          className="font-heading flex items-center gap-2 pl-3 text-lg font-bold"
          style={{
            fontFamily: "'Domine', 'Noto Sans JP', sans-serif",
            color: DARK,
            borderLeft: `4px solid ${GOLD}`,
          }}
        >
          <Clock size={20} style={{ color: GOLD }} />
          {title}
        </h2>
      </div>
      <div className="px-5 pb-5">
        <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {filtered.map((store) => {
            const wage = formatHourly(store.hourly_min, store.hourly_max);
            return (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="shrink-0 rounded-xl overflow-hidden"
                style={{
                  width: "160px",
                  background: "#fcfeff",
                  border: "1px solid rgba(27,37,40,.06)",
                  textDecoration: "none",
                }}
              >
                <div className="relative w-full" style={{ height: "90px" }}>
                  {store.image_url ? (
                    <img
                      src={store.image_url}
                      alt={store.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #1b2528, #2a3a3f)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: GOLD,
                        }}
                      >
                        {store.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-2.5 py-2">
                  <p
                    className="truncate text-xs font-bold"
                    style={{ color: DARK }}
                  >
                    {store.name}
                  </p>
                  {store.area && (
                    <p
                      className="truncate text-[10px]"
                      style={{ color: "rgba(27,37,40,.5)" }}
                    >
                      {store.area}
                    </p>
                  )}
                  {wage && (
                    <p
                      className="truncate text-[10px] mt-0.5"
                      style={{ color: GOLD, fontWeight: 600 }}
                    >
                      {wage}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
