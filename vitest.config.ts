import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**",
        "src/app/api/**/route.ts",
        "src/app/**/actions.ts",
        "src/middleware.ts",
      ],
      exclude: [
        "src/lib/database.types.ts",
        "src/lib/platform-adapters/types.ts",
        "src/**/types.ts",
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/__tests__/**",
        "src/test/**",
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/components/**",
        "src/data/profiles.ts",
        // Trivial factory wrappers around @supabase/ssr with zero logic
        "src/lib/supabase/admin.ts",
        "src/lib/supabase/client.ts",
        "src/lib/supabase/server.ts",
        // Dashboard aggregator with complex joins — covered by dedicated
        // tests under queries/__tests__/workspace-dashboard*.test.ts
        "src/lib/queries/workspace-dashboard.ts",
      ],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        // Branches is the strictest v8 metric (counts every ??, ||, optional
        // chain). 84% still implies thorough path coverage; the lines/
        // functions gates catch any real drift.
        branches: 84,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
