import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlaces } from "@knogo/core";
import { ConfirmScreen } from "./ConfirmScreen";
import { ReportAssessmentReceipt } from "../components/ReportAssessmentReceipt";

const mocks = vi.hoisted(() => ({ session: null as object | null, replace: vi.fn(), authLoading: false, configured: true, read: vi.fn(), write: vi.fn(), clear: vi.fn(), submit: vi.fn(), assessment: vi.fn(), places: [] as any[], placeId: "", loading: false }));
vi.mock("../supabase", () => ({ supabaseApi: { readReportAssessment: mocks.assessment } }));
vi.mock("../storage", () => ({ mobileStorage: { readPendingReport: mocks.read, writePendingReport: mocks.write, clearPendingReport: mocks.clear } }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ places: mocks.places, loading: mocks.loading, addConfirmations: mocks.submit, authLoading: mocks.authLoading, hasSupabaseConfig: mocks.configured, session: mocks.session }) }));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => ({ placeId: mocks.placeId }), useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("../components/PlaceSheet", () => ({ PlaceSheet: ({ visible, title, onClose, children }: any) => visible ? <div role="dialog" aria-label={title}>{children}<button onClick={onClose}>Cancel report</button></div> : null }));
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
  mocks.session = { userId: "tester" }; mocks.authLoading = false; mocks.configured = true;
  mocks.read.mockResolvedValue(null); mocks.write.mockResolvedValue(undefined);
  mocks.clear.mockResolvedValue(undefined);
  mocks.assessment.mockResolvedValue({ reportId: "report-1", state: "queued", risk: null, model: null, assessedAt: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
function draft(createdAt = new Date().toISOString()) {
  return { placeId: mocks.placeId, createdAt, reportSource: "phone", answers: [{ type: "open_status", value: "open" }, { type: "kitchen_status", value: "yes" }, { type: "busy_level", value: "quiet" }] };
}
function next() { fireEvent.click(screen.getByRole("button", { name: "Continue" })); }
function answer(label: string) { fireEvent.click(screen.getByRole("radio", { name: label })); next(); }

describe("report assessment polling", () => {
  it("stops after six reads and leaves a manual retry", async () => {
    vi.useFakeTimers();
    render(<ReportAssessmentReceipt reportId="report-1" />);
    await act(async () => {});
    for (let check = 0; check < 5; check++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mocks.assessment).toHaveBeenCalledTimes(6);
    expect(screen.getByRole("button", { name: "Check review" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Check review" }));
    await act(async () => {});
    expect(mocks.assessment).toHaveBeenCalledTimes(7);
  });
  it("stops polling when the review completes", async () => {
    vi.useFakeTimers();
    mocks.assessment.mockResolvedValueOnce({ reportId: "report-1", state: "queued" })
      .mockResolvedValue({ reportId: "report-1", state: "complete", risk: "low", model: "gemini-test", assessedAt: "2026-10-11T10:00:00Z" });
    render(<ReportAssessmentReceipt reportId="report-1" />);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(screen.getByText("Gemini review complete")).toBeTruthy();
    expect(screen.getByText("No pattern flagged. This does not prove the report.")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mocks.assessment).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Check review" })).toBeNull();
  });
  it.each(["expired", "unavailable"])("does not poll a %s receipt", async state => {
    vi.useFakeTimers();
    mocks.assessment.mockResolvedValue({ reportId: "report-1", state });
    render(<ReportAssessmentReceipt reportId="report-1" />);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mocks.assessment).toHaveBeenCalledOnce();
    expect(screen.queryByText("Gemini review complete")).toBeNull();
  });
  it("replaces the scheduled poll when manually checking", async () => {
    vi.useFakeTimers();
    render(<ReportAssessmentReceipt reportId="report-1" />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Check review" }));
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(mocks.assessment).toHaveBeenCalledTimes(3);
  });
  it("ignores a response received after unmount and schedules no more reads", async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    mocks.assessment.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const view = render(<ReportAssessmentReceipt reportId="report-1" />);
    view.unmount();
    await act(async () => { finish({ reportId: "report-1", state: "queued" }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mocks.assessment).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("report account hand-off", () => {
  it("asks guests to sign in in a popup before showing any questions", async () => {
    mocks.session = null;
    const view = render(<ConfirmScreen/>);
    await screen.findByRole("dialog", { name: "Leave a report" });
    expect(screen.queryByText("How did you check?")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Account access" }));
    view.rerender(<ConfirmScreen/>);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("How did you check?")).toBeTruthy();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("returns to the place when the sign-in popup is cancelled", async () => {
    mocks.session = null;
    render(<ConfirmScreen/>);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel report" }));
    expect(mocks.replace).toHaveBeenCalledWith({ pathname: "/restaurants/[placeId]", params: { placeId: mocks.placeId } });
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("waits for account hydration before showing the survey or popup", async () => {
    mocks.session = null; mocks.authLoading = true;
    render(<ConfirmScreen/>);
    expect(screen.getByText("Checking your account")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("How did you check?")).toBeNull();
    await act(async () => {});
  });
  it("gates the survey again if the session ends mid-report", async () => {
    const view = render(<ConfirmScreen/>);
    fireEvent.click(screen.getByRole("button", { name: "By phone" })); next();
    mocks.session = null;
    view.rerender(<ConfirmScreen/>);
    expect(screen.getByRole("dialog", { name: "Leave a report" })).toBeTruthy();
    expect(screen.queryByText("Is the place open?")).toBeNull();
    expect(mocks.submit).not.toHaveBeenCalled();
    await act(async () => {});
  });
  it("keeps mock-data reporting available without an account provider", async () => {
    mocks.configured = false; mocks.session = null;
    render(<ConfirmScreen/>);
    expect(screen.getByText("How did you check?")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => {});
  });
  it("skips kitchen checks for a shop and keeps Back on the applicable steps", async () => {
    mocks.places = [{ ...mockPlaces[0], category: "shops", placeType: "supermarket" }];
    render(<ConfirmScreen />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "At the venue" }));
    next();
    answer("Yes, open");
    expect(screen.getByText("How busy is it?")).toBeTruthy();
    expect(screen.queryByText("Is the kitchen serving?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Is the place open?")).toBeTruthy();
    next();
    fireEvent.click(screen.getByRole("radio", { name: "quiet" }));
    fireEvent.click(screen.getByRole("button", { name: "Review check" }));
    expect(screen.getByText("Step 4 of 4")).toBeTruthy();
    expect(screen.queryByText("Is the kitchen serving?")).toBeNull();
  });
  it("keeps the submitted report ID and shows its queued review without claiming Gemini ran", async () => {
    mocks.session = { userId: "tester" }; mocks.read.mockResolvedValue(draft());
    mocks.submit.mockResolvedValue({ reportId: "report-1", outcome: "pending" });
    render(<ConfirmScreen/>);
    fireEvent.click(await screen.findByRole("button", { name: "Submit check" }));
    await screen.findByText("Waiting for review");
    expect(mocks.assessment).toHaveBeenCalledWith("report-1");
    expect(screen.queryByText("Gemini review complete")).toBeNull();
    expect(mocks.submit).toHaveBeenCalledOnce();
  });
  it("shows a provider assessment with its limits and keeps raw model data out of the screen", async () => {
    mocks.session = { userId: "tester" }; mocks.read.mockResolvedValue(draft());
    mocks.submit.mockResolvedValue({ reportId: "report-1", outcome: "pending" });
    mocks.assessment.mockResolvedValue({ reportId: "report-1", state: "complete", risk: "high", model: "gemini-3.5-flash-lite", assessedAt: "2026-10-09T12:00:00Z" });
    render(<ConfirmScreen/>);
    fireEvent.click(await screen.findByRole("button", { name: "Submit check" }));
    await screen.findByText("Gemini review complete");
    expect(screen.getByText("More community checks needed. This is not a verdict on your report.")).toBeTruthy();
    expect(screen.queryByText("high")).toBeNull();
  });
  it("keeps the report saved when its assessment fails and retries only the read", async () => {
    mocks.session = { userId: "tester" }; mocks.read.mockResolvedValue(draft());
    mocks.submit.mockResolvedValue({ reportId: "report-1", outcome: "pending" });
    mocks.assessment.mockRejectedValueOnce(new Error("Offline"));
    render(<ConfirmScreen/>);
    fireEvent.click(await screen.findByRole("button", { name: "Submit check" }));
    await screen.findByText("Review could not load. Your report is saved.");
    fireEvent.click(screen.getByRole("button", { name: "Check review" }));
    await screen.findByText("Waiting for review");
    expect(mocks.submit).toHaveBeenCalledOnce();
    expect(mocks.clear).toHaveBeenCalledOnce();
  });
  it("returns sign-in to review and requires a separate submit action", async () => {
    mocks.session = null; mocks.read.mockResolvedValue(draft());
    const view = render(<ConfirmScreen/>);
    fireEvent.click(await screen.findByRole("button", { name: "Account access" }));
    view.rerender(<ConfirmScreen/>);
    await screen.findByText("Review your check");
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
    mocks.submit.mockResolvedValue({ reportId: "report-1", outcome: "pending" });
    fireEvent.click(screen.getByRole("button", { name: "Submit check" }));
    await screen.findByText("Report received.");
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ answers: [{ type: "open_status", value: "closed" }] }));
    expect(mocks.submit).toHaveBeenCalledWith(mocks.placeId, [{ type: "open_status", value: "closed" }], "phone", "");
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
    mocks.session = { userId: "tester" };
    mocks.read.mockResolvedValue({ ...draft(), answers: [...draft().answers,
      { type: "walk_ins", value: "no" }, { type: "card_machine", value: "cash_only" }, { type: "backup_power", value: "limited" }] });
    mocks.submit.mockResolvedValue({ reportId: "report-1", outcome: "pending" });
    render(<ConfirmScreen/>);
    await screen.findByRole("button", { name: "Submit check" });
    fireEvent.click(screen.getByRole("button", { name: "Add more checks" }));
    for (let index = 0; index < 3; index++) fireEvent.click(screen.getByRole("button", { name: "Did not check" }));
    expect(screen.getByText("Review your check")).toBeTruthy();
    expect(screen.queryByText("Are walk-ins welcome?")).toBeNull();
    expect(mocks.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit check" }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(mocks.placeId, draft().answers, "phone", ""));
    expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ answers: draft().answers }));
    expect(mocks.submit).toHaveBeenCalledOnce();
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
    await screen.findByRole("button", { name: "Submit check" });
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
  it("keeps a guest's saved draft behind account access", async () => {
    mocks.session = null; mocks.read.mockResolvedValue(draft());
    render(<ConfirmScreen/>);
    await screen.findByText("Account access");
    expect(screen.queryByText("Review your check")).toBeNull();
    expect(screen.queryByText("quiet")).toBeNull();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
