import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Read the unified env from the repo root (../.env) rather than frontend/.env
// so the project keeps a single source of truth. envDir resolves relative to
// the vite project root (this dir), so '../' = the repo root.
export default defineConfig({
  envDir: "../",
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  // Force a single copy of React across the app + every external package
  // (TipTap, Radix, etc.). Without dedupe, dev with linked node_modules
  // can produce two React instances and any hook call crashes with
  // "Invalid hook call ... You might have more than one copy of React".
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  optimizeDeps: {
    // Scan all source files up front so Vite knows every dependency that
    // will ever be requested before the dev server starts handing out
    // module URLs. Without this, navigating to a route that uses a
    // not-yet-discovered library triggers a re-optimization at runtime —
    // the resulting cache version mismatch produces "Invalid hook call /
    // useContext is null" because react ends up loaded twice.
    entries: ["app/**/*.{ts,tsx}", "app/root.tsx", "app/routes.ts"],
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router",
      "lucide-react",
      "recharts",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-image",
      "@tiptap/extension-link",
      "@tiptap/extension-youtube",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-label",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
    ],
  },
  ssr: {
    noExternal: ["@tiptap/react"],
  },
  server: {
    host: "0.0.0.0",
    port: 4055,
    allowedHosts: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: "http://nginx",
        changeOrigin: true,
      },
    },
  },
});
