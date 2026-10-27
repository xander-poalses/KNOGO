import { vi } from "vitest";
vi.mock("./components/Sonner", () => import("./components/Sonner.web"));
if (typeof window !== "undefined") window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList);
const motionTest = vi.hoisted(() => ({ reduced: false, gestures: [] as any[], timings: [] as any[], springs: [] as any[], preference: undefined as undefined | ((value: boolean) => void) }));
export { motionTest };

vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }), SafeAreaProvider: ({ children }: any) => children }));

vi.mock("expo-image", async () => {
  const { createElement } = await import("react");
  return { Image: ({ source, style }: any) => createElement("img", { src: source, alt: "", style }) };
});

vi.mock("react-native-reanimated", async () => {
  const React = await import("react");
  const native = await import("react-native");
  const easingModule = "../node_modules/react-native-reanimated/lib/module/css/easing/cubicBezier.js";
  const { CubicBezierEasing } = await import(easingModule);
  const transition = { duration() { return this; }, easing() { return this; } };
  return {
    default: { View: native.View ?? native.Animated.View },
    Easing: { bezier: () => (value: number) => value },
    cubicBezier: (x1: number, y1: number, x2: number, y2: number) => new CubicBezierEasing(x1, y1, x2, y2),
    FadeIn: transition, FadeOut: transition, LinearTransition: transition,
    useReducedMotion: () => motionTest.reduced,
    useSharedValue: (initial: unknown) => React.useRef({ current: initial, get() { return this.current; }, set(value: any) { this.current = typeof value === "function" ? value(this.current) : value; } }).current,
    useAnimatedStyle: (style: () => unknown) => style(),
    cancelAnimation: () => undefined,
    withTiming: (value: unknown, options: unknown) => { motionTest.timings.push({ value, options }); return value; },
    withSequence: (...values: unknown[]) => values.at(-1),
    withSpring: (value: unknown, options: unknown, complete: unknown) => { motionTest.springs.push({ value, options, complete }); return value; }
  };
});

vi.mock("react-native-gesture-handler", async () => {
  const { createElement } = await import("react");
  const chain = () => {
    const gesture: Record<string, (...args: any[]) => unknown> = {};
    const handlers: Record<string, any> = {};
    for (const name of ["activeOffsetY", "failOffsetX", "onStart", "onUpdate", "onEnd", "onFinalize"]) gesture[name] = (value: unknown) => { handlers[name] = value; return gesture; };
    motionTest.gestures.push(handlers);
    return gesture;
  };
  return {
    Gesture: { Pan: chain },
    GestureDetector: ({ children }: any) => createElement("div", null, children),
    GestureHandlerRootView: ({ children }: any) => createElement("div", null, children)
  };
});

vi.mock("react-native-worklets", () => ({ scheduleOnRN: (fn: (...args: any[]) => void, ...args: any[]) => fn(...args) }));
