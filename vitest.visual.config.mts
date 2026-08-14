import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["scripts/visual-regression/**/*.test.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    hookTimeout: 60_000,
    testTimeout: 300_000,
  },
  resolve: {
    alias: {
      "@visual": path.resolve(__dirname, "scripts/visual-regression"),
    },
  },
});
