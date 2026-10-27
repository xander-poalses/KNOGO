import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { Notifications } from "./Notifications";

vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ settings: { theme: "dark" } }) }));
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList);
afterEach(() => { cleanup(); toast.dismiss(); });

it("uses the app theme and dismisses a notification", async () => {
  render(<Notifications />);
  act(() => { toast.success("Place saved", { id: "save-test" }); });
  await screen.findByText("Place saved");
  expect(document.querySelector("[data-sonner-toaster]")?.getAttribute("data-sonner-theme")).toBe("dark");
  const host = document.querySelector<HTMLElement>("[data-sonner-toaster]")!;
  for (const prefix of ["--offset-", "--mobile-offset-"]) {
    for (const side of ["top", "left", "right"]) {
      expect(host.style.getPropertyValue(prefix + side)).toBe(`calc(16px + env(safe-area-inset-${side}, 0px))`);
    }
  }
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
  await waitFor(() => expect(screen.queryByText("Place saved")).toBeNull());
});

it("updates one toast by ID and keeps its retry action", async () => {
  const retry = vi.fn();
  render(<Notifications />);
  act(() => { toast.error("Places could not refresh", { id: "load-test", duration: Infinity }); });
  await screen.findByText("Places could not refresh");
  act(() => { toast.error("Check your connection", { id: "load-test", duration: Infinity, action: { label: "Retry", onClick: retry } }); });
  await screen.findByText("Check your connection");
  expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(retry).toHaveBeenCalledOnce();
});
