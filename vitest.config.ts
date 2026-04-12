import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/sync/**",
        "src/lib/crypto.ts",
        "src/lib/validation/**",
        "src/lib/platform-adapters/**",
      ],
      exclude: [
        "src/lib/platform-adapters/types.ts",
        "**/*.test.ts",
      ],
      thresholds: {
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
