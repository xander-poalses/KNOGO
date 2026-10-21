// @vitest-environment node
// Imports
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

// State and Helpers
const requireMobile = createRequire(new URL("../../package.json", import.meta.url));
const source = readFileSync(requireMobile.resolve("expo-router/build/react-navigation/native/useLinking.native.js"), "utf8");

// Functions
function linkingHook(getInitialURL: () => string | Promise<string>) {
  const effects: (() => void | (() => void))[] = [];
  const cleanups: (() => void)[] = [];
  const onUnhandledLinking = vi.fn();
  const exports: { useLinking?: Function } = {};
  const modules: Record<string, unknown> = {
    react: {
      useRef: (current: unknown) => ({ current }),
      useCallback: (callback: Function) => callback,
      useEffect: (effect: () => void | (() => void)) => effects.push(effect)
    },
    "react-native": { Platform: { OS: "android" } },
    "../core": { useNavigationIndependentTree: () => false },
    "./extractPathFromURL": { extractPathFromURL: (_prefixes: string[], url: string) => url.replace("knogo://", "/") }
  };
  runInNewContext(source, { exports, require: (name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected router import: ${name}`);
    return modules[name];
  }, process: { env: { NODE_ENV: "test" } } });
  const hook = exports.useLinking!({ current: null }, {
    prefixes: ["knogo://"], getInitialURL,
    getStateFromPath: (path: string) => ({ path }),
    subscribe: () => () => {}
  }, onUnhandledLinking);
  return {
    initialState: () => hook.getInitialState(), onUnhandledLinking,
    mount: () => effects.forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }),
    unmount: () => cleanups.forEach(cleanup => cleanup())
  };
}

// Tests
describe("Expo Router initial native links", () => {
  it("waits for mount when the initial URL resolves first", async () => {
    const router = linkingHook(() => Promise.resolve("knogo://auth/callback?code=test"));
    expect(await router.initialState()).toEqual({ path: "/auth/callback?code=test" });
    expect(router.onUnhandledLinking).not.toHaveBeenCalled();
    router.mount();
    expect(router.onUnhandledLinking).toHaveBeenCalledTimes(1);
    expect(router.onUnhandledLinking).toHaveBeenCalledWith("/auth/callback?code=test");
  });

  it("handles a URL that resolves after mount", async () => {
    const router = linkingHook(() => Promise.resolve("knogo://restaurants"));
    const state = router.initialState();
    router.mount();
    await state;
    expect(router.onUnhandledLinking).toHaveBeenCalledTimes(1);
    expect(router.onUnhandledLinking).toHaveBeenCalledWith("/restaurants");
  });

  it("does not update linking state after unmount", async () => {
    const router = linkingHook(() => Promise.resolve("knogo://auth/callback"));
    const state = router.initialState();
    router.mount();
    router.unmount();
    await state;
    expect(router.onUnhandledLinking).not.toHaveBeenCalled();
  });

  it("defers a synchronous URL until mount too", async () => {
    const router = linkingHook(() => "knogo://restaurants");
    expect(await router.initialState()).toEqual({ path: "/restaurants" });
    expect(router.onUnhandledLinking).not.toHaveBeenCalled();
    router.mount();
    expect(router.onUnhandledLinking).toHaveBeenCalledTimes(1);
    expect(router.onUnhandledLinking).toHaveBeenCalledWith("/restaurants");
  });
});
