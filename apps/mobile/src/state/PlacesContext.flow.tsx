import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, type LocalSettings, type SupabaseSession } from "@knogo/core";
import { PlacesProvider, usePlaces } from "./PlacesContext";

const mocks = vi.hoisted(() => ({ settings: vi.fn(), cache: vi.fn(), saved: vi.fn(), writeSaved: vi.fn(), searches: vi.fn(), area: vi.fn(), readSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), fetch: vi.fn() }));
vi.mock("../storage", () => ({ mobileStorage: {
  readSavedPlaceIds: mocks.saved, readConfirmations: async () => [],
  writeSavedPlaceIds: mocks.writeSaved,
  readSettings: mocks.settings, readPlaceDataCache: mocks.cache,
  readRecentSearches: mocks.searches, readFallbackArea: mocks.area,
  writePlaceDataCache: async () => undefined
} }));
vi.mock("../supabase", () => ({ useMockData: false, supabaseApi: {
  hasConfig: true, readSession: mocks.readSession, signInWithEmail: mocks.signIn,
  signOut: mocks.signOut, fetchPlaceData: mocks.fetch
} }));
vi.mock("expo-location", () => ({}));
vi.mock("../telemetry", () => ({ captureEvent: vi.fn() }));
vi.mock("../auth/googleSignIn", () => ({ completeGoogleCallback: vi.fn() }));
vi.mock("./useStatusClock", () => ({ useStatusClock: () => 0 }));

const initial: SupabaseSession = { accessToken: "old", refreshToken: "old-refresh", userId: "user-1", email: "person@example.com", expiresAt: 9999999999 };
const replacement = { ...initial, accessToken: "new", refreshToken: "new-refresh" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function Probe({ track }: { track: (promise: Promise<unknown>) => void }) {
  const { session, authLoading, settings, settingsLoaded, storageReady, loading, refreshing, error, savedPlaceIds, recentSearches, fallbackArea, toggleSaved, refresh, signInWithEmail, signOut } = usePlaces();
  return <>
    <output data-testid="session">{session?.accessToken ?? "none"}</output>
    <output data-testid="auth-loading">{String(authLoading)}</output>
    <output data-testid="storage-ready">{String(storageReady)}</output>
    <output data-testid="place-loading">{String(loading)}</output>
    <output data-testid="refreshing">{String(refreshing)}</output>
    <output data-testid="error">{error}</output>
    <output data-testid="local-data">{JSON.stringify({ savedPlaceIds, recentSearches, fallbackArea })}</output>
    <output data-testid="settings">{JSON.stringify({ loaded: settingsLoaded, consent: settings.telemetryConsent })}</output>
    <button onClick={() => track(signOut().catch(() => undefined))}>Sign out</button>
    <button onClick={() => track(refresh())}>Refresh</button>
    <button onClick={() => track(toggleSaved("venue-a"))}>Save A</button>
    <button onClick={() => track(toggleSaved("venue-b"))}>Save B</button>
    <button onClick={() => track(signInWithEmail("person@example.com", "test-password"))}>Sign in</button>
  </>;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.settings.mockResolvedValue(defaultSettings);
  mocks.saved.mockResolvedValue([]); mocks.searches.mockResolvedValue([]); mocks.area.mockResolvedValue(null);
  mocks.writeSaved.mockResolvedValue(undefined);
  mocks.cache.mockResolvedValue(null);
  mocks.readSession.mockResolvedValue(initial);
  mocks.signIn.mockResolvedValue(replacement);
  mocks.signOut.mockResolvedValue(undefined);
  mocks.fetch.mockResolvedValue({ places: [], groups: [] });
});
afterEach(cleanup);

describe("place provider recovery", () => {
  it("waits for local restoration and settles storage failures without changing consent", async () => {
    const saved = deferred<string[]>();
    mocks.saved.mockReturnValue(saved.promise);
    mocks.settings.mockRejectedValue(new Error("Settings unavailable"));
    render(<PlacesProvider><Probe track={() => {}} /></PlacesProvider>);
    await waitFor(() => expect(screen.getByTestId("place-loading").textContent).toBe("false"));
    expect(screen.getByTestId("storage-ready").textContent).toBe("false");
    await act(async () => { saved.resolve([]); });
    await waitFor(() => expect(screen.getByTestId("storage-ready").textContent).toBe("true"));
    expect(JSON.parse(screen.getByTestId("settings").textContent!).loaded).toBe(false);
  });
  it("preserves saved places when a tap precedes startup restoration", async () => {
    const restore = deferred<string[]>(); mocks.saved.mockReturnValue(restore.promise);
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => tasks.push(task)}/></PlacesProvider>);
    fireEvent.click(screen.getByText("Save A"));
    await act(async () => { restore.resolve(["venue-b"]); await tasks[0]; });
    expect(mocks.writeSaved).toHaveBeenLastCalledWith(["venue-b", "venue-a"]);
    expect(JSON.parse(screen.getByTestId("local-data").textContent!).savedPlaceIds).toEqual(["venue-b", "venue-a"]);
  });
  it("orders overlapping save taps and removal", async () => {
    const write = deferred<void>(); mocks.writeSaved.mockReturnValueOnce(write.promise);
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => tasks.push(task)}/></PlacesProvider>);
    fireEvent.click(screen.getByText("Save A"));
    fireEvent.click(screen.getByText("Save B"));
    fireEvent.click(screen.getByText("Save A"));
    await waitFor(() => expect(mocks.writeSaved).toHaveBeenCalledOnce());
    await act(async () => { write.resolve(); await Promise.all(tasks); });
    expect(mocks.writeSaved.mock.calls.map(call => call[0])).toEqual([["venue-a"], ["venue-a", "venue-b"], ["venue-b"]]);
    expect(JSON.parse(screen.getByTestId("local-data").textContent!).savedPlaceIds).toEqual(["venue-b"]);
  });
  it("does not claim a failed save persisted and allows the next tap", async () => {
    mocks.writeSaved.mockRejectedValueOnce(new Error("Storage full"));
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => { tasks.push(task); void task.catch(() => undefined); }}/></PlacesProvider>);
    fireEvent.click(screen.getByText("Save A"));
    await act(async () => { await expect(tasks[0]).rejects.toThrow("Storage full"); });
    expect(JSON.parse(screen.getByTestId("local-data").textContent!).savedPlaceIds).toEqual([]);
    fireEvent.click(screen.getByText("Save B"));
    await act(async () => { await tasks[1]; });
    expect(JSON.parse(screen.getByTestId("local-data").textContent!).savedPlaceIds).toEqual(["venue-b"]);
  });
  it("shares a pending launch fetch with refresh calls", async () => {
    const fetch = deferred<{ places: []; groups: [] }>();
    mocks.fetch.mockReturnValue(fetch.promise);
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => tasks.push(task)}/></PlacesProvider>);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByText("Refresh"));
    fireEvent.click(screen.getByText("Refresh"));
    expect(tasks[0]).toBe(tasks[1]);
    expect(mocks.fetch).toHaveBeenCalledOnce();
    await act(async () => { fetch.resolve({ places: [], groups: [] }); await Promise.all(tasks); });
    expect(screen.getByTestId("place-loading").textContent).toBe("false");
    fireEvent.click(screen.getByText("Refresh"));
    await act(async () => { await tasks[2]; });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("settles a failed refresh when cache storage also fails, then allows retry", async () => {
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => tasks.push(task)}/></PlacesProvider>);
    await waitFor(() => expect(screen.getByTestId("place-loading").textContent).toBe("false"));
    mocks.fetch.mockRejectedValueOnce(new Error("Network unavailable"));
    mocks.cache.mockRejectedValueOnce(new Error("Cache unavailable"));
    fireEvent.click(screen.getByText("Refresh"));
    await act(async () => { await tasks[0]; });
    expect(screen.getByTestId("error").textContent).toBe("Network unavailable");
    expect(screen.getByTestId("refreshing").textContent).toBe("false");
    fireEvent.click(screen.getByText("Refresh"));
    await act(async () => { await tasks[1]; });
    expect(screen.getByTestId("error").textContent).toBe("");
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });
  it("loads places and other preferences when the area read fails", async () => {
    mocks.area.mockRejectedValue(new Error("Storage unavailable"));
    mocks.saved.mockResolvedValue(["venue-a"]); mocks.searches.mockResolvedValue(["pizza"]);
    render(<PlacesProvider><Probe track={() => {}}/></PlacesProvider>);
    await waitFor(() => expect(screen.getByTestId("place-loading").textContent).toBe("false"));
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(JSON.parse(screen.getByTestId("local-data").textContent!)).toEqual({ savedPlaceIds: ["venue-a"], recentSearches: ["pizza"], fallbackArea: null });
  });
  it("does not wait for search history before loading places", async () => {
    mocks.searches.mockReturnValue(new Promise(() => {}));
    mocks.area.mockResolvedValue("Menlyn");
    render(<PlacesProvider><Probe track={() => {}}/></PlacesProvider>);
    await waitFor(() => expect(screen.getByTestId("place-loading").textContent).toBe("false"));
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(JSON.parse(screen.getByTestId("local-data").textContent!).fallbackArea).toBe("Menlyn");
  });
  it("loads from the network when cache restoration fails", async () => {
    mocks.cache.mockRejectedValue(new Error("Cache unavailable"));
    render(<PlacesProvider><Probe track={() => {}}/></PlacesProvider>);
    await waitFor(() => expect(screen.getByTestId("place-loading").textContent).toBe("false"));
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });
  it("does not start a network fetch after unmounting during cache restore", async () => {
    const restore = deferred<null>(); mocks.cache.mockReturnValue(restore.promise);
    const view = render(<PlacesProvider><Probe track={() => {}}/></PlacesProvider>);
    view.unmount();
    await act(async () => { restore.resolve(null); await restore.promise; });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([initial, null])("does not replace a sign-in with a delayed launch restore (%j)", async (storedSession) => {
    const restore = deferred<SupabaseSession | null>();
    mocks.readSession.mockReturnValue(restore.promise);
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => tasks.push(task)}/></PlacesProvider>);
    fireEvent.click(screen.getByText("Sign in"));
    await act(async () => { await tasks[0]; });
    await act(async () => { restore.resolve(storedSession); await restore.promise; });
    expect(screen.getByTestId("session").textContent).toBe("new");
    expect(screen.getByTestId("auth-loading").textContent).toBe("false");
  });

  it("does not restore a launch session after the user signs out", async () => {
    const restore = deferred<SupabaseSession | null>();
    mocks.readSession.mockReturnValue(restore.promise);
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => tasks.push(task)}/></PlacesProvider>);
    fireEvent.click(screen.getByText("Sign out"));
    await act(async () => { await tasks[0]; });
    await act(async () => { restore.resolve(initial); await restore.promise; });
    expect(screen.getByTestId("session").textContent).toBe("none");
  });

  it("finishes auth loading when storage cannot restore a session", async () => {
    mocks.readSession.mockRejectedValue(new Error("Storage unavailable"));
    render(<PlacesProvider><Probe track={() => {}}/></PlacesProvider>);
    await waitFor(() => expect(screen.getByTestId("auth-loading").textContent).toBe("false"));
    expect(screen.getByTestId("session").textContent).toBe("none");
  });

  it.each([false, true])("keeps a replacement sign-in after logout settles (failure: %s)", async (fails) => {
    const logout = deferred<void>();
    mocks.signOut.mockReturnValue(logout.promise);
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => tasks.push(task)}/></PlacesProvider>);
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe("old"));
    fireEvent.click(screen.getByText("Sign out"));
    fireEvent.click(screen.getByText("Sign in"));
    await act(async () => { await tasks[1]; });
    expect(screen.getByTestId("session").textContent).toBe("new");
    await act(async () => {
      if (fails) logout.reject(new Error("Network unavailable"));
      else logout.resolve();
      await tasks[0];
    });
    expect(screen.getByTestId("session").textContent).toBe("new");
  });

  it("clears the displayed session after a logout failure without another sign-in", async () => {
    mocks.signOut.mockRejectedValue(new Error("Network unavailable"));
    const tasks: Promise<unknown>[] = [];
    render(<PlacesProvider><Probe track={task => tasks.push(task)}/></PlacesProvider>);
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe("old"));
    fireEvent.click(screen.getByText("Sign out"));
    await act(async () => { await tasks[0]; });
    expect(screen.getByTestId("session").textContent).toBe("none");
  });

  it("restores consent without waiting for the place cache", async () => {
    mocks.cache.mockReturnValue(new Promise(() => {}));
    mocks.settings.mockResolvedValue({ ...defaultSettings, telemetryConsent: "denied" });
    render(<PlacesProvider><Probe track={() => {}}/></PlacesProvider>);
    await waitFor(() => expect(JSON.parse(screen.getByTestId("settings").textContent!)).toEqual({ loaded: true, consent: "denied" }));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("does not mark settings restored after a storage failure", async () => {
    const stored = deferred<LocalSettings>();
    mocks.settings.mockReturnValue(stored.promise);
    render(<PlacesProvider><Probe track={() => {}}/></PlacesProvider>);
    await act(async () => { stored.reject(new Error("Storage unavailable")); });
    expect(JSON.parse(screen.getByTestId("settings").textContent!).loaded).toBe(false);
  });
});
