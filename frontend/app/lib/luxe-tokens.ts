/**
 * Recta brand tokens — dark × gold luxe palette.
 * Single source of truth for colors, shadows, gradients, and frame width.
 * Use these instead of hard-coded hex values across the user-facing UI.
 */
export const LUXE = {
  // Core palette
  gold: "#D4AF37",
  goldDark: "#c8960c",
  goldGlow: "rgba(212,175,55,0.4)",
  dark: "#1b2528",
  darkSoft: "#2c3e46",
  pink: "rgba(200,96,128,1)",
  cream: "#f5f5f5",

  // Typography
  fontFamily: "'Outfit','Noto Sans JP',sans-serif",
  fontOutfit: "'Outfit',sans-serif",
  fontJa: "'Noto Sans JP',sans-serif",

  // Card surface (matches TopPage pickup cards)
  cardShadow: "0 4px 20px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)",
  cardBorder: "1px solid rgba(27,37,40,.06)",

  // Section divider (gold→pink shimmer)
  divider:
    "linear-gradient(90deg, transparent, rgba(212,175,55,.25) 20%, rgba(200,96,128,.18) 80%, transparent)",

  // TopPage hero→content base gradient (dark fades into cream)
  baseGradient:
    "linear-gradient(180deg, #1b2528 0px, #1b2528 40px, rgba(27,37,40,.85) 80px, rgba(27,37,40,.55) 120px, rgba(27,37,40,.25) 162px, rgba(27,37,40,.07) 198px, #f5f5f5 230px, #f5f5f5 100%)",

  // Ambient background (visible on desktop around the centered mobile frame)
  ambientBase:
    "radial-gradient(ellipse at top, #0f1618 0%, #0a1012 60%, #050708 100%)",
} as const;

/** Mobile-first frame width — the entire UI is locked to this column. */
export const MOBILE_FRAME_WIDTH = 430;

/** Height reserved for the fixed BottomTabBar (used as content padding-bottom). */
export const BOTTOM_TAB_HEIGHT = 68;
