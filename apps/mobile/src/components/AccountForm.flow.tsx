import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountForm } from "./AccountForm";
const mocks = vi.hoisted(() => ({ recover: vi.fn(), signIn: vi.fn(), register: vi.fn(), adopt: vi.fn(), prepare: vi.fn(), open: vi.fn(), google: false, supported: true, configured: true }));
vi.mock("lucide-react-native", () => ({ Eye: () => null, EyeOff: () => null, CircleAlert: () => null, X: () => null, Pencil: () => null, Mail: () => null }));
vi.mock("./HapticPressable", async () => {
  const { createElement } = await import("react");
  return { HapticPressable: ({ children, accessibilityLabel, onPress, disabled }: any) => createElement("button", { "aria-label": accessibilityLabel, onClick: onPress, disabled }, children) };
});
vi.mock("../auth/googleSignIn", () => ({ get googleSignInEnabled() { return mocks.google; }, get googleSignInSupported() { return mocks.supported; }, prepareGoogleSignIn: mocks.prepare, openGoogleSignIn: mocks.open }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ requestPasswordRecovery: mocks.recover, signInWithEmail: mocks.signIn, registerWithEmail: mocks.register, adoptSession: mocks.adopt, hasSupabaseConfig: mocks.configured }) }));
vi.mock("expo-linking", () => ({ createURL: (_path: string, options: any) => "knogo://auth/callback?" + new URLSearchParams(options.queryParams) }));
vi.mock("../theme", () => ({ fonts: {}, radii: {}, sizes: {}, space: {}, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({}) }));
vi.mock("./Ui", async () => {
  const { createElement } = await import("react");
  return { ActionButton: ({ label, onPress, loading, disabled }: any) => createElement("button", { onClick: onPress, disabled: disabled || loading, "aria-busy": Boolean(loading) }, label) };
});
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  const box = ({ children, accessibilityRole }: any) => createElement("div", { role: accessibilityRole === "alert" ? "alert" : undefined }, children);
  return { View: box, Text: box, StyleSheet: { create: (styles: unknown) => styles }, TextInput: ({ accessibilityLabel, value, onChangeText, secureTextEntry, editable }: any) => createElement("input", { "aria-label": accessibilityLabel, value, type: secureTextEntry ? "password" : "text", disabled: !editable, onChange: (event: any) => onChangeText(event.target.value) }) };
});
beforeEach(() => { vi.clearAllMocks(); mocks.google = false; mocks.configured = true; mocks.adopt.mockResolvedValue(undefined); mocks.prepare.mockResolvedValue({ request: "test" }); mocks.open.mockResolvedValue({ userId: "google-person" }); mocks.signIn.mockResolvedValue({ userId: "person" }); mocks.register.mockResolvedValue(null); });
afterEach(() => { cleanup(); mocks.supported = true; });
function fill(password = "test-password") {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
  const next = screen.queryByRole("button", { name: "Continue" });
  if (next) fireEvent.click(next);
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}
describe("account form", () => {
  it("splits signup into email and password without creating an account on Continue", () => {
    render(<AccountForm onAuthenticated={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    expect(screen.queryByLabelText("Password")).toBeNull();
    const next = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "person@example.com" } });
    fireEvent.click(next);
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.queryByLabelText("Email address")).toBeNull();
    expect(screen.getByText("2 of 2")).toBeTruthy();
    expect(mocks.register).not.toHaveBeenCalled();
  });
  it("lets signup email be changed without retaining the password", () => {
    render(<AccountForm onAuthenticated={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" })); fill();
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    expect((screen.getByLabelText("Email address") as HTMLInputElement).value).toBe("person@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
  });
  it("requests recovery without publishing or leaving report review", async () => {
    mocks.recover.mockResolvedValue(undefined);
    const done = vi.fn(); render(<AccountForm reportPlaceId="branch-1" onAuthenticated={done}/>); fill();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.click(screen.getByRole("button", { name: "Send recovery email" }));
    await screen.findByText(/If an account can receive/);
    expect(mocks.recover).toHaveBeenCalledWith("person@example.com", "knogo://auth/callback?intent=recovery&placeId=branch-1");
    expect(done).not.toHaveBeenCalled();
  });
  it("offers recovery again after rate limiting without losing the email", async () => {
    mocks.recover.mockRejectedValue({ status: 429 });
    render(<AccountForm onAuthenticated={vi.fn()}/>); fill();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.click(screen.getByRole("button", { name: "Send recovery email" }));
    await screen.findByRole("alert");
    expect((screen.getByLabelText("Recovery email address") as HTMLInputElement).value).toBe("person@example.com");
    expect((screen.getByRole("button", { name: "Send recovery email" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("lets the user dismiss feedback without clearing the form", async () => {
    mocks.signIn.mockRejectedValue({ code: "invalid_credentials", status: 400 });
    render(<AccountForm onAuthenticated={vi.fn()}/>); fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Check your email and password");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByLabelText("Email address") as HTMLInputElement).value).toBe("person@example.com");
  });
  it("shows and hides a password, then masks it when changing modes", () => {
    render(<AccountForm onAuthenticated={vi.fn()}/>); fill();
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe("password");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
  });
  it("returns from confirmation to sign-in without assuming verification", async () => {
    const done = vi.fn(); render(<AccountForm reportPlaceId="branch-1" onAuthenticated={done}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" })); fill();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText(/If confirmation is needed/);
    expect(screen.getByRole("alert").textContent).toContain("Already registered? Use your password");
    expect(screen.getByRole("alert").textContent).toContain("it has not changed");
    expect(screen.queryByText(/Your check is saved/)).toBeNull();
    expect(screen.queryByLabelText("Password")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((screen.getByLabelText("Email address") as HTMLInputElement).value).toBe("person@example.com");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(done).not.toHaveBeenCalled();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("keeps Google visible in Expo Go and explains the limitation on press", () => {
    mocks.google = true; mocks.supported = false;
    render(<AccountForm onAuthenticated={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(screen.getByRole("alert").textContent).toContain("cannot run in Expo Go");
    expect(mocks.prepare).not.toHaveBeenCalled(); expect(mocks.open).not.toHaveBeenCalled();
  });
  it("does not navigate after leaving while Google session storage is pending", async () => {
    mocks.google = true;
    let resolve!: () => void;
    const pending = new Promise<void>(yes => { resolve = yes; });
    mocks.adopt.mockReturnValue(pending);
    const done = vi.fn(); const view = render(<AccountForm onAuthenticated={done}/>);
    const button = screen.getByRole("button", { name: "Continue with Google" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(mocks.adopt).toHaveBeenCalledOnce());
    view.unmount();
    await act(async () => { resolve(); await pending; });
    expect(done).not.toHaveBeenCalled();
  });
  it("does not navigate after leaving while account creation is pending", async () => {
    let resolve!: (value: { userId: string }) => void;
    const pending = new Promise<{ userId: string }>(yes => { resolve = yes; });
    mocks.register.mockReturnValue(pending);
    const done = vi.fn(); const view = render(<AccountForm onAuthenticated={done}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" })); fill();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    view.unmount();
    await act(async () => { resolve({ userId: "person" }); await pending; });
    expect(done).not.toHaveBeenCalled();
  });
  it("adopts Google access before returning to the report caller", async () => {
    mocks.google = true;
    let resolve!: () => void;
    mocks.adopt.mockReturnValue(new Promise<void>(yes => { resolve = yes; }));
    const done = vi.fn(); render(<AccountForm reportPlaceId="branch-1" onAuthenticated={done}/>);
    const button = screen.getByRole("button", { name: "Continue with Google" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(mocks.adopt).toHaveBeenCalledWith({ userId: "google-person" }));
    expect(done).not.toHaveBeenCalled();
    expect(mocks.prepare).toHaveBeenCalledWith("branch-1", undefined);
    await act(async () => { resolve(); });
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("does not authenticate or navigate when Google is cancelled", async () => {
    mocks.google = true; mocks.open.mockResolvedValue(null);
    const done = vi.fn(); render(<AccountForm onAuthenticated={done}/>);
    const button = screen.getByRole("button", { name: "Continue with Google" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledTimes(2));
    expect(mocks.adopt).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
  });
  it("keeps Google storage failures on the form without exposing provider data", async () => {
    mocks.google = true; mocks.adopt.mockRejectedValue(new Error("secret token person@example.com"));
    const done = vi.fn(); render(<AccountForm onAuthenticated={done}/>);
    const button = screen.getByRole("button", { name: "Continue with Google" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    expect((await screen.findByRole("alert")).textContent).not.toMatch(/secret|person@example/);
    expect(done).not.toHaveBeenCalled();
  });
  it("does not navigate from a password sign-in after leaving the form", async () => {
    let resolve!: (value: { userId: string }) => void;
    const pending = new Promise<{ userId: string }>(yes => { resolve = yes; });
    mocks.signIn.mockReturnValue(pending);
    const done = vi.fn(); const view = render(<AccountForm onAuthenticated={done}/>); fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    view.unmount();
    await act(async () => { resolve({ userId: "person" }); await pending; });
    expect(done).not.toHaveBeenCalled();
  });
  it("returns report registration to branch review without authenticating early", async () => {
    const done = vi.fn(); render(<AccountForm reportPlaceId="venue-1" onAuthenticated={done}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" })); fill();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText(/If confirmation is needed/);
    expect(mocks.register).toHaveBeenCalledWith("person@example.com", "test-password", "knogo://auth/callback?intent=review&placeId=venue-1");
    expect(done).not.toHaveBeenCalled();
  });
  it("returns registration confirmation to the venue without submitting a report", async () => {
    const done = vi.fn(); render(<AccountForm venuePlaceId="venue-1" onAuthenticated={done}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" })); fill();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText(/If confirmation is needed/);
    expect(mocks.register).toHaveBeenCalledWith("person@example.com", "test-password", "knogo://auth/callback?venue=venue-1");
    expect(done).not.toHaveBeenCalled();
  });
  it("signs in, clears the password and returns to the caller without submitting a report", async () => {
    const done = vi.fn(); render(<AccountForm onAuthenticated={done}/>); fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(mocks.signIn).toHaveBeenCalledWith("person@example.com", "test-password");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
  });
  it("keeps confirmation-required registration pending and asks for password sign-in", async () => {
    const done = vi.fn(); render(<AccountForm onAuthenticated={done}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" })); fill();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText(/If confirmation is needed/);
    expect(done).not.toHaveBeenCalled();
    expect(mocks.register).toHaveBeenCalledWith("person@example.com", "test-password", "knogo://auth/callback?intent=account");
  });
  it("blocks repeated taps while signing in", async () => {
    mocks.signIn.mockReturnValue(new Promise(() => {})); render(<AccountForm onAuthenticated={() => {}}/>); fill();
    const button = screen.getByRole("button", { name: "Sign in" });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.signIn).toHaveBeenCalledOnce();
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
  it("keeps credentials out of failure messages", async () => {
    mocks.signIn.mockRejectedValue(new Error("password=test-password person@example.com"));
    const done = vi.fn(); render(<AccountForm onAuthenticated={done}/>); fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain("test-password");
    expect(alert.textContent).not.toContain("person@example.com");
    expect(done).not.toHaveBeenCalled();
  });
  it("rejects missing configuration and short registration passwords", () => {
    mocks.configured = false; const { unmount } = render(<AccountForm onAuthenticated={() => {}}/>); fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" })); expect(mocks.signIn).not.toHaveBeenCalled();
    unmount(); mocks.configured = true; render(<AccountForm onAuthenticated={() => {}}/>);
    fireEvent.click(screen.getByRole("button", { name: "Create an account" })); fill("short");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("alert").textContent).toContain("at least 8 characters"); expect(mocks.register).not.toHaveBeenCalled();
  });
});
