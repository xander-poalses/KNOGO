var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    optimizeDeps: { entries: ["index.html"] },
    test: {
        environment: "jsdom",
        globals: true,
        exclude: __spreadArray(__spreadArray([], configDefaults.exclude, true), ["supabase/functions/**/*.test.ts"], false)
    }
});
