import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ insets: { top: 0, bottom: 0, left: 0, right: 0 }, host: vi.fn((_props: unknown) => null) }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => mocks.insets }));
vi.mock("sonner-native", () => ({ Toaster: mocks.host, toast: { custom: vi.fn(), dismiss: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each([
  { top: 0, bottom: 0, left: 0, right: 0 },
  { top: 48, bottom: 24, left: 0, right: 0 },
  { top: 24, bottom: 0, left: 32, right: 18 }
])("keeps native toasts inside safe margins for %j", async insets => {
  mocks.insets = insets;
  const { SonnerHost } = await vi.importActual<typeof import("./Sonner")>("./Sonner");
  render(<SonnerHost />);
  expect(mocks.host.mock.calls.at(-1)?.[0]).toMatchObject({
    offset: insets.top + 16,
    positionerStyle: { left: insets.left + 16, right: insets.right + 16, width: "auto" }
  });
});
