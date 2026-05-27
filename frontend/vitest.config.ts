import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest config is kept separate from vite.config.ts because the
// reactRouter() dev plugin owns route entry points and conflicts with
// vitest's transform / module graph. We only need tsconfigPaths to
// resolve the ~ alias.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
