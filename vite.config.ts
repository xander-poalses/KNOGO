import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { entries: ["index.html"] },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: [...configDefaults.exclude, "supabase/functions/**/*.test.ts"]
  }
});
