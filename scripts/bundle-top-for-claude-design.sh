#!/usr/bin/env bash
# Bundle top page sources into a single file for Claude Design handoff.
# Output: docs/claude-design-top-bundle.tsx
set -euo pipefail

cd "$(dirname "$0")/.."

OUT=docs/claude-design-top-bundle.tsx

FILES=(
  frontend/app/lib/types.ts
  frontend/app/lib/user-auth.tsx
  frontend/app/components/user/shared/Footer.tsx
  frontend/app/components/user/shared/BottomTabBar.tsx
  frontend/app/components/user/shared/RecentlyViewedStores.tsx
  frontend/app/components/user/AiChatPanel.tsx
  frontend/app/components/user/TopPage.tsx
)

{
  echo "// =============================================================="
  echo "// Recta2 - Top Page Source Bundle for Claude Design"
  echo "// =============================================================="
  echo "// This is a concatenation of the live source files that build the"
  echo "// top page at https://recta.isayama-dev.com/."
  echo "// Stack: React Router v7 (SSR), React 19, TypeScript, Tailwind 4,"
  echo "// shadcn/ui. Mobile-first, target viewport iPhone 14 Pro (390px)."
  echo "//"
  echo "// Brand tokens used in styles:"
  echo "//   GOLD     #D4AF37"
  echo "//   DARK     #1b2528"
  echo "//   LINE     #06C755"
  echo "//   BG       #fafeff"
  echo "// Fonts: 'Noto Sans JP' (ja text), 'Outfit' (latin/numeric headings)"
  echo "//"
  echo "// Each file below is delimited by // ===== <path> ====="
  echo "// =============================================================="
  echo
  for f in "${FILES[@]}"; do
    echo "// ===== $f ====="
    cat "$f"
    echo
    echo
  done
} > "$OUT"

wc -l "$OUT"
echo "Wrote: $OUT"
