import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), exchange: vi.fn(), browser: vi.fn(), write: vi.fn(),
  create: vi.fn(), environment: "standalone", platform: "web"
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.create }));
vi.mock("expo-constants", () => ({ default: { get executionEnvironment() { return mocks.environment; } } }));
vi.mock("expo-crypto", () => ({}));
vi.mock("expo-linking", () => ({ createURL: (_path: string, options: any) => "https://knogo.example/auth/callback?" + new URLSearchParams(options.queryParams) }));
vi.mock("expo-web-browser", () => ({ openAuthSessionAsync: mocks.browser, maybeCompleteAuthSession: () => ({ type: "failed" }) }));
vi.mock("react-native", () => ({ Platform: { get OS() { return mocks.platform; } } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } }));
vi.mock("../storage", () => ({ mobileStorage: { writeSession: mocks.write } }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
  vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_ENABLED", "true");
  mocks.environment = "standalone"; mocks.platform = "web";
  mocks.create.mockReturnValue({ auth: { signInWithOAuth: mocks.authorize, exchangeCodeForSession: mocks.exchange } });
  mocks.authorize.mockResolvedValue({ data: { url: "https://test.supabase.co/auth/v1/authorize?code_challenge_method=s256", flowId: "flow1234" }, error: null });
  mocks.exchange.mockResolvedValue({ data: { session: { access_token: "access", refresh_token: "refresh", expires_at: 2000000000, user: { id: "person", email: "person@example.com" } } }, error: null });
  mocks.write.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); });
describe("Google account return", () => {
  it("returns venue sign-in to the venue without a report intent", async () => {
    const api = await import("./googleSignIn");
    const request = await api.prepareGoogleSignIn(undefined, "venue-1");
    expect(new URL(request.redirectTo).searchParams.get("venue")).toBe("venue-1");
    expect(new URL(request.redirectTo).searchParams.has("intent")).toBe(false);
    expect(mocks.authorize.mock.calls[0][0].options.redirectTo).toBe(request.redirectTo);
  });
  it("prepares PKCE with a review callback and stores no second SDK session", async () => {
    const api = await import("./googleSignIn");
    const request = await api.prepareGoogleSignIn("place-1");
    expect(request.redirectTo).toContain("intent=review&placeId=place-1");
    expect(mocks.authorize.mock.calls[0][0].provider).toBe("google");
    const options = mocks.create.mock.calls[0][2];
    expect(options.auth.flowType).toBe("pkce");
    expect(options.auth.autoRefreshToken).toBe(false);
    await expect(options.auth.storage.getItem("knogo.oauth")).resolves.toBeNull();
  });
  it("exchanges a successful browser return and writes KNOGO's session", async () => {
    const api = await import("./googleSignIn"); const request = await api.prepareGoogleSignIn();
    mocks.browser.mockResolvedValue({ type: "success", url: request.redirectTo + "&code=valid" });
    const session = await api.openGoogleSignIn(request);
    expect(mocks.exchange).toHaveBeenCalledWith("valid", { flowId: "flow1234" });
    expect(mocks.write).toHaveBeenCalledWith(session);
  });
  it("shares the exchange between browser and linking callbacks", async () => {
    const api = await import("./googleSignIn");
    const callback = "https://knogo.example/auth/callback?code=once";
    const first = api.completeGoogleCallback(callback), second = api.completeGoogleCallback(callback);
    expect(await first).toEqual(await second);
    expect(mocks.exchange).toHaveBeenCalledOnce();
    expect(mocks.write).toHaveBeenCalledOnce();
  });
  it("keeps a cancelled browser session unsigned", async () => {
    const api = await import("./googleSignIn"); const request = await api.prepareGoogleSignIn();
    mocks.browser.mockResolvedValue({ type: "cancel" });
    expect(await api.openGoogleSignIn(request)).toBeNull();
    expect(mocks.exchange).not.toHaveBeenCalled(); expect(mocks.write).not.toHaveBeenCalled();
  });
  it("rejects returns to another origin and failed code exchanges", async () => {
    const api = await import("./googleSignIn"); const request = await api.prepareGoogleSignIn();
    mocks.browser.mockResolvedValue({ type: "success", url: "https://other.example/auth/callback?code=wrong" });
    await expect(api.openGoogleSignIn(request)).rejects.toThrow("different address");
    mocks.exchange.mockResolvedValue({ data: { session: null }, error: new Error("expired") });
    await expect(api.completeGoogleCallback(request.redirectTo + "&code=expired")).rejects.toThrow("could not be verified");
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("blocks Expo Go and a missing provider gate before opening the browser", async () => {
    mocks.platform = "android"; mocks.environment = "storeClient";
    const api = await import("./googleSignIn");
    await expect(api.prepareGoogleSignIn()).rejects.toThrow("development build");
    expect(mocks.create).not.toHaveBeenCalled();
    vi.resetModules(); vi.stubEnv("EXPO_PUBLIC_GOOGLE_AUTH_ENABLED", "false");
    const disabled = await import("./googleSignIn");
    await expect(disabled.prepareGoogleSignIn()).rejects.toThrow("not configured");
    expect(mocks.browser).not.toHaveBeenCalled();
  });
});
