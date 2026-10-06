import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: {
    "@testing-library/react": resolve("node_modules/@testing-library/react/dist/@testing-library/react.esm.js"),
    "react": resolve("apps/mobile/node_modules/react"),
    "react-dom": resolve("apps/mobile/node_modules/react-dom")
  } },
  test: { environment: "jsdom", globals: true, include: ["apps/mobile/src/**/*.flow.tsx"] }
});
