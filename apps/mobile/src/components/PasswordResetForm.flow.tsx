import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PasswordResetForm } from "./PasswordResetForm";
const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ updatePassword: mocks.update }) }));
vi.mock("../theme", () => ({ fonts: {}, sizes: {}, space: {}, useTheme: () => ({ colours: {} }), useThemeStyles: () => ({}) }));
vi.mock("./FeedbackToast", () => ({ FeedbackToast: ({ message }: any) => message ? <p role="alert">{message}</p> : null }));
vi.mock("./Ui", () => ({ ActionButton: ({ label, onPress, disabled, loading }: any) => <button onClick={onPress} disabled={disabled || loading}>{label}</button> }));
vi.mock("react-native", () => ({ StyleSheet: { create: (v: unknown) => v }, View: ({ children }: any) => <div>{children}</div>, Text: ({ children }: any) => <span>{children}</span>, TextInput: ({ accessibilityLabel, value, onChangeText }: any) => <input aria-label={accessibilityLabel} value={value} onChange={e => onChangeText(e.target.value)}/> }));
beforeEach(() => { vi.resetAllMocks(); mocks.update.mockResolvedValue(undefined); });
afterEach(cleanup);
function fill() {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "testing-password" } });
  fireEvent.change(screen.getByLabelText("Repeat password"), { target: { value: "testing-password" } });
}
describe("password recovery", () => {
  it("requires matching passwords before saving and waits for a return action", async () => {
    const done = vi.fn(); render(<PasswordResetForm onComplete={done} onRequestLink={vi.fn()}/>);
    expect((screen.getByRole("button", { name: "Save password" }) as HTMLButtonElement).disabled).toBe(true);
    fill(); fireEvent.click(screen.getByRole("button", { name: "Save password" }));
    await screen.findByText("Password saved");
    expect(mocks.update).toHaveBeenCalledWith("testing-password");
    expect(done).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Return to KNOGO" }));
    expect(done).toHaveBeenCalledOnce();
  });
  it("offers another link when a session has expired", async () => {
    mocks.update.mockRejectedValue({ code: "session_not_found", status: 401 });
    const retry = vi.fn(); render(<PasswordResetForm onComplete={vi.fn()} onRequestLink={retry}/>); fill();
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));
    expect((await screen.findByRole("alert")).textContent).toContain("expired");
    fireEvent.click(screen.getByRole("button", { name: "Request another link" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
