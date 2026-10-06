import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelemetryGate } from "./TelemetryGate";

const mocks = vi.hoisted(() => ({ update: vi.fn(), enable: vi.fn(), disable: vi.fn(), capture: vi.fn(), consent: "unset", loaded: true }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ settings: { telemetryConsent: mocks.consent }, settingsLoaded: mocks.loaded, updateSettings: mocks.update }) }));
vi.mock("../telemetry", () => ({ captureEvent: mocks.capture, enableTelemetry: mocks.enable, disableTelemetry: mocks.disable }));
vi.mock("../theme", () => ({ fonts: {}, useThemeStyles: (factory: (value: object) => object) => factory({}) }));
vi.mock("./PlaceSheet", async () => {
  const { createElement } = await import("react");
  return { PlaceSheet: ({ visible, title, onClose, children }: any) => visible ? createElement("section", { role: "dialog", "aria-label": title }, createElement("button", { onClick: onClose }, "Close"), children) : null };
});
vi.mock("./Ui", async () => {
  const { createElement } = await import("react");
  return { ActionButton: ({ label, disabled, onPress }: any) => createElement("button", { disabled, onClick: onPress }, label) };
});
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  return { Text: ({ children, accessibilityRole }: any) => createElement("p", { role: accessibilityRole }, children), StyleSheet: { create: (value: unknown) => value } };
});
beforeEach(() => { vi.clearAllMocks(); mocks.consent = "unset"; mocks.loaded = true; mocks.update.mockResolvedValue(undefined); });
afterEach(cleanup);

describe("diagnostics consent", () => {
  it("does not flash the prompt before restoring a declined choice", () => {
    mocks.loaded = false;
    const view = render(<TelemetryGate>App</TelemetryGate>);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.enable).not.toHaveBeenCalled();
    mocks.consent = "denied";
    mocks.loaded = true;
    view.rerender(<TelemetryGate>App</TelemetryGate>);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.enable).not.toHaveBeenCalled();
  });
  it("waits for settings restoration before enabling diagnostics", () => {
    mocks.loaded = false;
    mocks.consent = "granted";
    const view = render(<TelemetryGate>App</TelemetryGate>);
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
    mocks.loaded = true;
    view.rerender(<TelemetryGate>App</TelemetryGate>);
    expect(mocks.enable).toHaveBeenCalledOnce();
  });
  it("treats close as declining rather than granting access", async () => {
    render(<TelemetryGate>App</TelemetryGate>);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ telemetryConsent: "denied" }));
    expect(mocks.enable).not.toHaveBeenCalled();
  });
  it("does not enable diagnostics when saving consent fails", async () => {
    mocks.update.mockRejectedValue(new Error("Storage unavailable"));
    render(<TelemetryGate>App</TelemetryGate>);
    fireEvent.click(screen.getByRole("button", { name: "Allow diagnostics" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Diagnostics stay off");
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });
  it("blocks repeated choices while saving", () => {
    mocks.update.mockReturnValue(new Promise(() => {}));
    render(<TelemetryGate>App</TelemetryGate>);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    fireEvent.click(screen.getByRole("button", { name: "Allow diagnostics" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(mocks.update).toHaveBeenCalledOnce();
  });
  it("enables diagnostics only when stored consent is granted", () => {
    mocks.consent = "granted";
    render(<TelemetryGate>App</TelemetryGate>);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.enable).toHaveBeenCalledOnce();
    expect(mocks.capture).toHaveBeenCalledWith("app_opened");
  });
});
