import { defineConfig } from "orval";

/**
 * Orval — generate TS types + axios fetcher from the Laravel-side OpenAPI
 * spec (produced by dedoc/scramble's `php artisan scramble:export`).
 *
 * Spec lives at backend/api.json; this config sits in frontend/orval/.
 *
 * Run: `npm run gen:api` (from frontend/) — see package.json.
 */
export default defineConfig({
  recta2: {
    // Spec lives alongside this config so orval can resolve it without
    // climbing out of frontend/. The copy step lives in package.json's
    // gen:api script: it runs `scramble:export` (Laravel) and then copies
    // backend/api.json → frontend/orval/api.json before invoking orval.
    input: {
      target: "./api.json",
    },
    output: {
      mode: "tags",
      target: "./generated/api.ts",
      client: "axios-functions",
      optionsParamRequired: false,
      mock: false,
      clean: true,
      override: {
        mutator: {
          path: "./mutators/auth.ts",
          name: "rectaMutator",
        },
      },
    },
  },
});
