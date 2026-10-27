// @vitest-environment node
// Imports
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

// Helpers
const requireMobile = createRequire(import.meta.url);
const source = readFileSync(requireMobile.resolve("expo-router/build/fork/useLinking.native.js"), "utf8");
function linkingHook(getInitialURL: () => string | Promise<string>) {
  const effects: (() => void | (() => void))[] = [];
  const cleanups: (() => void)[] = [];
  const enqueue = vi.fn();
  const unsubscribe = vi.fn();
  let listener: (url: string) => void = () => {};
  const exports: { useLinking?: Function } = {};
  const modules: Record<string, unknown> = {
    react: { use: () => null, useCallback: (fn: Function) => fn, useEffectEvent: (fn: Function) => fn, useEffect: (fn: () => void) => effects.push(fn) },
    "react-native": {},
    "../global-state/createSeededNavigationState": { completeParsedState: (state: unknown) => state },
    "../global-state/getRouteInfoFromState": { getRouteSegmentsFromState: () => [] },
    "../global-state/routerConfigContext": {},
    "../global-state/routingQueueContext": { useEnqueueRoutingIntent: () => enqueue },
    "../layoutAnchor": {}, "../react-navigation/native": {}, "../react-navigation/routers/stateKeys": {},
    "./extractPathFromURL": { extractExpoPathFromURL: (_prefixes: string[], url: string) => url.replace("knogo://", "/") },
    "./getInitialURLWithTimeout": {}
  };
  runInNewContext(source, { exports, require: (name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected router import: ${name}`);
    return modules[name];
  }, process: { env: { NODE_ENV: "test" } } });
  const hook = exports.useLinking!({ current: { getRootState: () => ({ routeNames: ["auth"] }) } }, {
    prefixes: ["knogo://"], getInitialURL,
    getStateFromPath: (path: string) => ({ path, routes: [{ name: "auth" }] }),
    subscribe: (fn: (url: string) => void) => { listener = fn; return unsubscribe; }
  });
  return {
    initialState: () => hook.getInitialState(), enqueue, unsubscribe, link: (url: string) => listener(url),
    mount: () => effects.forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }),
    unmount: () => cleanups.forEach(cleanup => cleanup())
  };
}

// Tests
describe("Expo Router native links", () => {
  it("parses a link before mount without dispatching navigation", async () => {
    const router = linkingHook(() => Promise.resolve("knogo://auth/callback?code=test"));
    expect((await router.initialState()).path).toBe("/auth/callback?code=test");
    expect(router.enqueue).not.toHaveBeenCalled();
  });
  it("parses synchronous links without dispatching navigation", () => {
    const router = linkingHook(() => "knogo://auth/callback");
    expect(router.initialState().path).toBe("/auth/callback");
    expect(router.enqueue).not.toHaveBeenCalled();
  });
  it("queues links received after mount and unsubscribes on close", () => {
    const router = linkingHook(() => "knogo://auth/callback");
    router.mount();
    router.link("knogo://auth/callback?code=test");
    expect(router.enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: "NAVIGATE_TO_HREF", payload: expect.objectContaining({ href: "/auth/callback?code=test" }) }));
    router.unmount();
    expect(router.unsubscribe).toHaveBeenCalledOnce();
  });
});
