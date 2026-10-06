import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import AuthCallbackScreen from "../../app/auth/callback";

const mocks = vi.hoisted(() => ({ finish: vi.fn(), replace: vi.fn(), url: "knogo://auth/callback?code=test", complete: vi.fn(), submit: vi.fn() }));
vi.mock("expo-linking", () => ({ useURL: () => mocks.url }));
vi.mock("expo-router", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("react-native", () => ({ StyleSheet: { create: (value: unknown) => value }, Text: ({ children }: { children: ReactNode }) => <span>{children}</span>, View: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("lucide-react-native", () => ({ AlertCircle: () => null }));
vi.mock("../components/Ui", () => ({ Page: ({ children }: { children: ReactNode }) => <div>{children}</div>, Notice: ({ title }: { title: string }) => <p>{title}</p>, ActionButton: () => null }));
vi.mock("../theme", () => ({ fonts: {}, space: {}, useTheme: () => ({ colours: {} }), useThemeStyles: () => ({}) }));
vi.mock("../storage", () => ({ mobileStorage: { readPendingReport: vi.fn(), clearPendingReport: vi.fn() } }));
vi.mock("../state/PlacesContext", () => ({ usePlaces: () => ({ completeEmailLink: mocks.complete, addConfirmations: mocks.submit }) }));
vi.mock("./googleSignIn", () => ({ completeBrowserAuthPopup: () => ({ type: "dismiss" }) }));
vi.mock("./finishEmailReport", () => ({ finishEmailReport: mocks.finish }));

beforeEach(() => { vi.resetAllMocks(); mocks.finish.mockResolvedValue({ kind: "account" }); });
afterEach(cleanup);

describe("account callback screen", () => {
  it.each([
    [{ kind: "account" }, "/settings"],
    [{ kind: "venue", placeId: "venue-a" }, { pathname: "/venue/[placeId]", params: { placeId: "venue-a" } }],
    [{ kind: "recheck", draft: { placeId: "venue-a" } }, { pathname: "/confirm/[placeId]", params: { placeId: "venue-a" } }]
  ])("returns to the intended screen (%j)", async (result, destination) => {
    mocks.finish.mockResolvedValue(result);
    render(<AuthCallbackScreen/>);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(destination));
    expect(mocks.finish).toHaveBeenCalledOnce();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("shows a callback failure without routing or submitting a report", async () => {
    mocks.finish.mockRejectedValue(new Error("Sign-in expired"));
    const view = render(<AuthCallbackScreen/>);
    await waitFor(() => expect(view.getByText("Sign-in expired")).toBeTruthy());
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("does not redirect after leaving a pending callback", async () => {
    let resolve!: (value: { kind: string }) => void;
    const pending = new Promise<{ kind: string }>(yes => { resolve = yes; });
    mocks.finish.mockReturnValue(pending);
    const view = render(<AuthCallbackScreen/>);
    view.unmount();
    await act(async () => { resolve({ kind: "account" }); await pending; });
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
