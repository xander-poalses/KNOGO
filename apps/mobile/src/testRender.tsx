import type { ReactElement, ReactNode } from "react";
import { render as renderUI } from "@testing-library/react";
import { SonnerHost } from "./components/Sonner";

export function render(ui: ReactElement) {
  return renderUI(ui, { wrapper: ({ children }: { children: ReactNode }) => <>{children}<SonnerHost /></> });
}
