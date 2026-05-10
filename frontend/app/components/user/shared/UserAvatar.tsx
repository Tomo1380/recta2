/**
 * User avatar that shows the LINE profile picture only when the user has
 * opted in (`use_line_avatar`). Otherwise renders a name-initial avatar in
 * the style of Google Workspace / Gmail.
 *
 * The fallback is a generated initial chip — a single character from the
 * display name (or a static "?" if unknown), with a deterministic
 * background color derived from the name so different users look different.
 */

interface UserAvatarProps {
  displayName?: string | null;
  pictureUrl?: string | null;
  useLineAvatar?: boolean | null;
  size?: number;
  className?: string;
}

const PALETTE = [
  "#D4AF37", // gold
  "#C8607E", // berry
  "#7C8AC8", // lavender
  "#5BAA8C", // teal
  "#C88A5B", // amber
  "#8E7BB5", // violet
  "#A55B5B", // rust
  "#5B8EA5", // steel
];

function pickColor(seed: string): string {
  if (!seed) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

function firstGrapheme(input: string): string {
  // Use Intl.Segmenter when available so e.g. "砂山" renders as "砂",
  // emojis as a single grapheme, and combining-mark sequences stay together.
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new (Intl as unknown as { Segmenter: new (locale: string, options: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter("ja", { granularity: "grapheme" });
      const iterator = segmenter.segment(input)[Symbol.iterator]();
      const first = iterator.next();
      if (!first.done && first.value) return first.value.segment;
    } catch {
      /* fall through */
    }
  }
  return Array.from(input)[0] ?? "?";
}

export default function UserAvatar({
  displayName,
  pictureUrl,
  useLineAvatar,
  size = 32,
  className,
}: UserAvatarProps) {
  const showImage = !!useLineAvatar && !!pictureUrl;

  if (showImage) {
    return (
      <img
        src={pictureUrl as string}
        alt={displayName ?? ""}
        className={`rounded-full object-cover ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const name = (displayName ?? "").trim();
  const initial = name ? firstGrapheme(name) : "?";
  const bg = pickColor(name || "anon");

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white select-none ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: Math.round(size * 0.42),
        lineHeight: 1,
      }}
      aria-label={displayName ?? "ユーザー"}
    >
      {initial}
    </div>
  );
}
