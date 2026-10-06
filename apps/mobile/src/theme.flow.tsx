import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), system: vi.fn() }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: mocks.read, setItem: mocks.write } }));
vi.mock("react-native", () => ({ useColorScheme: mocks.system }));

function Probe() {
  const { preference, isDark, setPreference } = useTheme();
  return <><output>{preference}:{String(isDark)}</output>
    <button onClick={() => setPreference("dark")}>Dark</button>
    <button onClick={() => setPreference("light")}>Light</button>
    <button onClick={() => setPreference("system")}>System</button>
  </>;
}
function mount() { return render(<ThemeProvider><Probe /></ThemeProvider>); }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue(null);
  mocks.write.mockResolvedValue(undefined);
  mocks.system.mockReturnValue("light");
});
afterEach(cleanup);

it("restores a saved override without writing it again", async () => {
  mocks.read.mockResolvedValue("dark");
  mount();
  await waitFor(() => expect(screen.getByText("dark:true")).toBeTruthy());
  expect(mocks.write).not.toHaveBeenCalled();
});
it("does not replace a choice with a delayed startup restore", async () => {
  let resolve!: (value: string) => void;
  mocks.read.mockReturnValue(new Promise<string>(yes => { resolve = yes; }));
  mount();
  fireEvent.click(screen.getByText("Dark"));
  await act(async () => { resolve("light"); });
  expect(screen.getByText("dark:true")).toBeTruthy();
});
it("keeps writes in choice order while storage is waiting", async () => {
  let resolve!: () => void;
  mocks.write.mockReturnValueOnce(new Promise<void>(yes => { resolve = yes; }));
  mount();
  fireEvent.click(screen.getByText("Dark"));
  fireEvent.click(screen.getByText("Light"));
  await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
  expect(screen.getByText("light:false")).toBeTruthy();
  await act(async () => { resolve(); });
  await waitFor(() => expect(mocks.write.mock.calls).toEqual([["knogo.themePreference", "dark"], ["knogo.themePreference", "light"]]));
});
it("keeps System mode after an unreadable or unsupported preference", async () => {
  mocks.system.mockReturnValue("dark");
  mocks.read.mockRejectedValueOnce(new Error("Storage unavailable"));
  const view = mount();
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByText("system:true")).toBeTruthy();
  view.unmount();
  mocks.read.mockResolvedValue("sepia");
  mount();
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByText("system:true")).toBeTruthy();
});
it("allows another save after storage rejects a write", async () => {
  mocks.write.mockRejectedValueOnce(new Error("Storage full"));
  mount();
  fireEvent.click(screen.getByText("Dark"));
  await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText("System"));
  await waitFor(() => expect(mocks.write).toHaveBeenLastCalledWith("knogo.themePreference", "system"));
  expect(screen.getByText("system:false")).toBeTruthy();
});
