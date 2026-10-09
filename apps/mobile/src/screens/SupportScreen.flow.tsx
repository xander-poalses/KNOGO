import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SupportScreen } from "./SupportScreen";
const mocks = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("expo-router", () => ({ useLocalSearchParams: () => ({}) }));
vi.mock("../theme", () => ({ fonts: {}, useTheme: () => ({ colours: {} }), useThemeStyles: () => ({}) }));
vi.mock("lucide-react-native", () => ({ Mail: () => null }));
vi.mock("../components/Ui", () => ({ BackButton: () => null, Page: ({ children }: any) => <main>{children}</main> }));
vi.mock("../components/FeedbackToast", () => ({ FeedbackToast: ({ message }: any) => message ? <p role="alert">{message}</p> : null }));
vi.mock("../components/HapticPressable", () => ({ HapticPressable: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button> }));
vi.mock("react-native", () => ({ Linking: { openURL: mocks.open }, StyleSheet: { create: (v: unknown) => v }, View: ({ children }: any) => <div>{children}</div>, Text: ({ children }: any) => <span>{children}</span> }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe("support contact", () => {
  it("does not offer contact without a configured address", () => {
    vi.stubEnv("EXPO_PUBLIC_SUPPORT_EMAIL", ""); render(<SupportScreen/>);
    expect(screen.getByText(/No request can be sent/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Email KNOGO support" })).toBeNull();
  });
  it("keeps the address available when an email app cannot open", async () => {
    vi.stubEnv("EXPO_PUBLIC_SUPPORT_EMAIL", "support@example.com"); mocks.open.mockRejectedValue(new Error("No handler"));
    render(<SupportScreen/>); fireEvent.click(screen.getByRole("button", { name: "Email KNOGO support" }));
    await screen.findByRole("alert");
    expect(mocks.open).toHaveBeenCalledWith("mailto:support@example.com?subject=KNOGO%20support");
    expect(screen.getByText("support@example.com")).toBeTruthy();
  });
});
