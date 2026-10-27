// Imports
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { FeedbackToast } from "./FeedbackToast";
import { ToastProvider, ToastViewport } from "./ToastProvider";
import { toast } from "sonner";

// Setup
// @ts-expect-error Exercise the installed web renderer.
vi.mock("react-native", () => import("../../node_modules/react-native-web"));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 32, right: 18 }) }));
vi.mock("./Sonner", () => import("./Sonner.web"));
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList);
vi.mock("lucide-react-native", () => ({ X: () => null }));
vi.mock("../theme", () => ({ fonts: {}, radii: { control: 26 }, useTheme: () => ({ colours: {} }), useThemeStyles: (factory: (value: object) => object) => factory({}) }));
afterEach(() => { cleanup(); toast.dismiss(); });

// Tests
describe("floating notifications", () => {
  it("renders outside the originating content at the top safe area", async () => {
    render(<ToastProvider><section data-testid="page"><p>Page content</p><FeedbackToast message="Report received"/></section></ToastProvider>);
    const alert = await screen.findByRole("alert");
    expect(screen.getByTestId("page").contains(alert)).toBe(false);
    expect(screen.getByTestId("page").childElementCount).toBe(1);
    const overlay = document.querySelector<HTMLElement>("[data-sonner-toaster]")!;
    expect(overlay.style.getPropertyValue("--offset-top")).toBe("40px");
    expect(overlay.style.getPropertyValue("--offset-left")).toBe("48px");
    expect(overlay.style.getPropertyValue("--offset-right")).toBe("34px");
    expect(overlay.style.getPropertyValue("--mobile-offset-top")).toBe("40px");
    expect(overlay.style.getPropertyValue("--mobile-offset-left")).toBe("48px");
    expect(overlay.style.getPropertyValue("--mobile-offset-right")).toBe("34px");
  });

  it("updates a notification without duplicating it and removes it with its source", async () => {
    const view = render(<ToastProvider><FeedbackToast message="Waiting for review"/></ToastProvider>);
    await screen.findByText("Waiting for review");
    view.rerender(<ToastProvider><FeedbackToast message="Review complete"/></ToastProvider>);
    await screen.findByText("Review complete");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.queryByText("Waiting for review")).toBeNull();
    view.rerender(<ToastProvider><p>Another screen</p></ToastProvider>);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("keeps one host and retains the toast when a popup closes", async () => {
    function Example({ modal }: { modal: boolean }) {
      return <ToastProvider><FeedbackToast message="Check your connection"/>{modal ? <section role="dialog" aria-label="Popup"><p>Popup content</p><ToastViewport modal/></section> : null}</ToastProvider>;
    }
    const view = render(<Example modal/>);
    await screen.findByRole("alert");
    expect(document.querySelectorAll("[data-sonner-toaster]")).toHaveLength(1);
    view.rerender(<Example modal={false}/>);
    expect(document.querySelectorAll("[data-sonner-toaster]")).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toBe("Check your connection");
  });

  it("keeps retry, dismiss and the underlying page controls working", async () => {
    const retry = vi.fn(), pageAction = vi.fn();
    function Example() {
      const [visible, setVisible] = useState(true);
      return <ToastProvider><button onClick={pageAction}>Page action</button><FeedbackToast message={visible ? "Try again" : null} onDismiss={() => setVisible(false)} action={{ label: "Retry", onPress: retry }}/></ToastProvider>;
    }
    render(<Example/>);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Page action" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(pageAction).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
  it("does not resurrect a dismissed message on a parent render", async () => {
    const view = render(<ToastProvider><FeedbackToast message="Account notice" /></ToastProvider>);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    view.rerender(<ToastProvider><FeedbackToast message="Account notice" /></ToastProvider>);
    expect(screen.queryByRole("alert")).toBeNull();
    view.rerender(<ToastProvider><FeedbackToast message="Report received" /></ToastProvider>);
    expect(await screen.findByText("Report received")).toBeTruthy();
    view.rerender(<ToastProvider><FeedbackToast message="Account notice" /></ToastProvider>);
    expect(await screen.findByText("Account notice")).toBeTruthy();
  });
});
