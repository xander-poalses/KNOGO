import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlaces } from "@knogo/core";
import { ConfirmScreen } from "./ConfirmScreen";

const mocks = vi.hoisted(() => ({ session: null as object | null, read: vi.fn(), write: vi.fn(), clear: vi.fn(), submit: vi.fn(), places: [] as any[], placeId: "", loading: false }));
vi.mock("../storage", () => ({ mobileStorage: { readPendingReport: mocks.read, writePendingReport: mocks.write, clearPendingReport: mocks.clear } }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ places: mocks.places, loading: mocks.loading, addConfirmations: mocks.submit, authLoading: false, hasSupabaseConfig: true, session: mocks.session }) }));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => ({ placeId: mocks.placeId }), useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../telemetry", () => ({ captureEvent: vi.fn(), captureError: vi.fn() }));
vi.mock("../components/FeedbackToast", () => ({ FeedbackToast: ({ message }: any) => message ? <p role="alert">{message}</p> : null }));
vi.mock("../theme", () => ({ fonts: {}, shadows: {}, sizes: {}, space: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({}) }));
vi.mock("lucide-react-native", () => ({ Check: () => null, ChevronRight: () => null }));
vi.mock("../components/AccountForm", async () => {
  const { createElement } = await import("react");
  return { AccountForm: ({ onAuthenticated }: any) => createElement("button", { onClick: () => { mocks.session = { userId: "tester" }; onAuthenticated(); } }, "Account access") };
});
vi.mock("../components/Ui", async () => {
  const { createElement } = await import("react");
  return { Chip: ({ label, selected, onPress, disabled }: any) => createElement("button", { onClick: onPress, disabled, "aria-pressed": selected }, label), Page: ({ children }: any) => createElement("main", null, children), BackButton: () => null, Notice: ({ title }: any) => createElement("p", null, title), ActionButton: ({ label, onPress, loading, disabled }: any) => createElement("button", { onClick: onPress, disabled: disabled || loading }, label) };
});
vi.mock("../components/HapticPressable", async () => {
  const { createElement } = await import("react");
  return { HapticPressable: ({ children, onPress, disabled, accessibilityRole, "aria-checked": checked }: any) => createElement("button", { onClick: onPress, disabled, role: accessibilityRole, "aria-checked": checked }, children) };
});
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children, accessibilityRole }: any) => createElement("div", { role: accessibilityRole }, children);
  return { View: box, Text: box, StyleSheet: { create: (value: unknown) => value }, TextInput: ({ accessibilityLabel, value, onChangeText }: any) => createElement("input", { "aria-label": accessibilityLabel, value, onChange: (e: any) => onChangeText(e.target.value) }) };
});
beforeEach(() => {
  vi.clearAllMocks(); mocks.places = [mockPlaces[0]]; mocks.placeId = mockPlaces[0].id;
  mocks.loading = false;
  mocks.session = null;
  mocks.read.mockResolvedValue(null); mocks.write.mockResolvedValue(undefined);
});
afterEach(cleanup);
function draft(createdAt = new Date().toISOString()) {
  return { placeId: mocks.placeId, createdAt, reportSource: "phone", answers: [{ type: "open_status", value: "open" }, { type: "kitchen_status", value: "yes" }, { type: "busy_level", value: "quiet" }] };
}
function next() { fireEvent.click(screen.getByRole("button", { name: "Continue" })); }
function answer(label: string) { fireEvent.click(screen.getByRole("radio", { name: label })); next(); }

describe("report account hand-off", () => {
  it("returns sign-in to review and requires a separate submit action", async () => {
    mocks.read.mockResolvedValue(draft()); render(<ConfirmScreen/>);
    fireEvent.click(await screen.findByRole("button", { name: "Sign in to submit" }));
    fireEvent.click(await screen.findByRole("button", { name: "Account access" }));
    expect(screen.getByRole("button", { name: "Submit check" })).toBeTruthy();
    expect(mocks.submit).not.toHaveBeenCalled(); expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("preserves a signed-in draft when submission fails", async () => {
    mocks.session = { userId: "tester" }; mocks.read.mockResolvedValue(draft()); mocks.submit.mockRejectedValue(new Error("Connection lost"));
    render(<ConfirmScreen/>); fireEvent.click(await screen.findByRole("button", { name: "Submit check" }));
    await screen.findByText("Connection lost");
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ placeId: mocks.placeId, answers: draft().answers }));
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("reviews a closure on its own without inferring kitchen or busyness", async () => {
    render(<ConfirmScreen/>); await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "By phone" })); next();
    fireEvent.click(screen.getByRole("radio", { name: "No, closed" }));
    fireEvent.click(screen.getByRole("button", { name: "Review report" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in to submit" }));
    await screen.findByText("Account access");
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ answers: [{ type: "open_status", value: "closed" }] }));
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("keeps one question visible and requires a choice before continuing", async () => {
    render(<ConfirmScreen/>); await act(async () => {});
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Is the place open?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "By phone" })); next();
    fireEvent.click(screen.getByRole("radio", { name: "Yes, open" }));
    expect(screen.getByText("Is the place open?")).toBeTruthy();
    expect(screen.queryByText("Is the kitchen serving?")).toBeNull();
    next();
    expect(screen.getByText("Is the kitchen serving?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "Yes, open" }).getAttribute("aria-checked")).toBe("true");
  });
  it("allows optional checks to be skipped without inventing answers", async () => {
    mocks.read.mockResolvedValue(draft()); render(<ConfirmScreen/>);
    await screen.findByRole("button", { name: "Sign in to submit" });
    fireEvent.click(screen.getByRole("button", { name: "Add more checks" }));
    for (let index = 0; index < 3; index++) fireEvent.click(screen.getByRole("button", { name: "Did not check" }));
    expect(screen.getByText("Review your check")).toBeTruthy();
    expect(screen.queryByText("Are walk-ins welcome?")).toBeNull();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("keeps reporting available when draft storage cannot be read", async () => {
    mocks.read.mockRejectedValueOnce(new Error("Storage unavailable"));
    render(<ConfirmScreen/>);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "By phone" })); next();
    answer("Yes, open");
    expect(screen.getByText("Is the kitchen serving?")).toBeTruthy();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("starts a separate report when the router changes venues", async () => {
    mocks.places = [mockPlaces[0], mockPlaces[1]];
    const view = render(<ConfirmScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "By phone" }));
    next(); answer("Yes, open");
    mocks.placeId = mockPlaces[1].id;
    view.rerender(<ConfirmScreen/>);
    await act(async () => {});
    expect(screen.getByText("How did you check?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "By phone" }).getAttribute("aria-pressed")).toBe("false");
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("does not restore an old venue draft after switching venues", async () => {
    let finish!: (value: unknown) => void;
    const oldDraft = draft();
    mocks.read.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    mocks.places = [mockPlaces[0], mockPlaces[1]];
    const view = render(<ConfirmScreen/>);
    mocks.placeId = mockPlaces[1].id;
    view.rerender(<ConfirmScreen/>);
    await act(async () => { finish(oldDraft); });
    expect(screen.getByText("How did you check?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "By phone" }).getAttribute("aria-pressed")).toBe("false");
  });
  it("waits for place loading before announcing a missing venue", async () => {
    mocks.places = []; mocks.loading = true;
    render(<ConfirmScreen/>);
    expect(screen.getByText("Loading place")).toBeTruthy();
    expect(screen.queryByText("Place not found")).toBeNull();
    await act(async () => {});
  });
  it("restores answers for review without submitting them", async () => {
    mocks.read.mockResolvedValue(draft()); render(<ConfirmScreen/>);
    await screen.findByRole("button", { name: "Sign in to submit" });
    expect(screen.getByText("By phone")).toBeTruthy();
    expect(screen.getByText("quiet")).toBeTruthy();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("does not overwrite a choice made before storage finishes loading", async () => {
    let finish!: (value: unknown) => void;
    mocks.read.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<ConfirmScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "At the venue" }));
    next(); answer("No, closed");
    await act(async () => { finish(draft()); });
    expect(screen.getByText("Is the kitchen serving?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "At the venue" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: "Sign in to submit" })).toBeNull();
  });
  it("keeps a stale draft out of the form", async () => {
    mocks.read.mockResolvedValue(draft(new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()));
    render(<ConfirmScreen/>);
    await act(async () => {});
    expect(screen.getByText("How did you check?")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign in to submit" })).toBeNull();
  });
  it("saves signed-out answers before showing account access", async () => {
    render(<ConfirmScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "By phone" }));
    next(); answer("Yes, open"); answer("Yes, serving");
    fireEvent.click(screen.getByRole("radio", { name: "quiet" }));
    fireEvent.click(screen.getByRole("button", { name: "Review check" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in to submit" }));
    await screen.findByText("Account access");
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ placeId: mocks.placeId, reportSource: "phone", answers: draft().answers }));
    expect(mocks.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back to my answers" }));
    await waitFor(() => expect(screen.getByText("quiet")).toBeTruthy());
  });
});
