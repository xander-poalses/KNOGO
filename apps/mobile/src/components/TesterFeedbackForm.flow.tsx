import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TesterFeedbackForm } from "./TesterFeedbackForm";

const mocks = vi.hoisted(() => ({ enabled: true, session: null as object | null, guest: vi.fn(), submit: vi.fn() }));
vi.mock("../testing", () => ({ get testerFeedbackEnabled() { return mocks.enabled; } }));
vi.mock("../supabase", () => ({ supabaseApi: { submitTesterFeedback: mocks.submit } }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ session: mocks.session, signInAsTester: mocks.guest }) }));
vi.mock("expo-application", () => ({ nativeApplicationVersion: "1.0.0", nativeBuildVersion: "12" }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { version: "1.0.0" } } }));
vi.mock("../theme", () => ({ fonts: {}, radii: {}, space: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (f: any) => f({}) }));
vi.mock("./FeedbackToast", () => ({ FeedbackToast: ({ message }: any) => message ? <div role="alert">{message}</div> : null }));
vi.mock("./Ui", () => ({
  ActionButton: ({ label, onPress, loading, disabled }: any) => <button disabled={loading || disabled} onClick={onPress}>{label}</button>,
  Chip: ({ label, selected, onPress, disabled }: any) => <button role="radio" aria-checked={selected} disabled={disabled} onClick={onPress}>{label}</button>
}));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children, accessibilityRole, accessibilityLabel }: any) => createElement("div", { role: accessibilityRole, "aria-label": accessibilityLabel }, children);
  return { Text: box, View: box, StyleSheet: { create: (s: any) => s }, TextInput: ({ value, onChangeText, editable, accessibilityLabel, maxLength }: any) => <textarea aria-label={accessibilityLabel} value={value} disabled={!editable} maxLength={maxLength} onChange={e => onChangeText(e.target.value)}/> };
});
beforeEach(() => { vi.clearAllMocks(); mocks.enabled = true; mocks.session = null; mocks.guest.mockResolvedValue(undefined); mocks.submit.mockResolvedValue("receipt"); });
afterEach(cleanup);

it("is absent outside the tester build", () => {
  mocks.enabled = false;
  render(<TesterFeedbackForm onSent={vi.fn()}/>);
  expect(screen.queryByRole("textbox")).toBeNull();
});
it("requires a message before sending", () => {
  render(<TesterFeedbackForm onSent={vi.fn()}/>);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
  expect(mocks.submit).not.toHaveBeenCalled();
});
it("starts a guest session, sends a bug and includes the build version", async () => {
  const sent = vi.fn();
  render(<TesterFeedbackForm onSent={sent}/>);
  fireEvent.click(screen.getByRole("radio", { name: "Bug report" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "The trip screen stopped responding." } });
  fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
  await waitFor(() => expect(sent).toHaveBeenCalledOnce());
  expect(mocks.guest).toHaveBeenCalledOnce();
  expect(mocks.submit).toHaveBeenCalledWith({ kind: "bug", message: "The trip screen stopped responding.", appVersion: "1.0.0 (12)" });
});
it("keeps the draft when sending fails and hides server details", async () => {
  mocks.session = { userId: "tester" };
  mocks.submit.mockRejectedValue(new Error("secret token"));
  render(<TesterFeedbackForm onSent={vi.fn()}/>);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Please make the trip screen clearer." } });
  fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Could not send");
  expect(screen.getByRole("alert").textContent).not.toContain("secret");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("Please make");
  expect(mocks.guest).not.toHaveBeenCalled();
});
it("blocks repeated sends while the request is pending", async () => {
  let finish!: () => void;
  mocks.submit.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  const sent = vi.fn();
  render(<TesterFeedbackForm onSent={sent}/>);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Please make the trip screen clearer." } });
  const button = screen.getByRole("button", { name: "Send feedback" });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledOnce());
  finish();
  await waitFor(() => expect(sent).toHaveBeenCalledOnce());
});
