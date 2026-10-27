import { CircleCheck, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";
import { usePlaces } from "../state/PlacesContext";

export function Notifications() {
  const { settings } = usePlaces();
  return <Toaster position="top-center" theme={settings.theme} closeButton visibleToasts={3} duration={6000}
    offset={{ top: "calc(16px + env(safe-area-inset-top, 0px))", left: "calc(16px + env(safe-area-inset-left, 0px))", right: "calc(16px + env(safe-area-inset-right, 0px))" }}
    mobileOffset={{ top: "calc(16px + env(safe-area-inset-top, 0px))", left: "calc(16px + env(safe-area-inset-left, 0px))", right: "calc(16px + env(safe-area-inset-right, 0px))" }}
    swipeDirections={["top", "left", "right"]}
    icons={{ success: <CircleCheck size={22} />, error: <CircleAlert size={22} />, warning: <TriangleAlert size={22} />, info: <Info size={22} /> }}
    toastOptions={{ closeButtonAriaLabel: "Dismiss notification", style: {
      background: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)",
      borderRadius: "var(--radius-control)", fontFamily: "var(--font-body)", fontSize: 16,
      padding: "18px 56px 18px 20px", gap: 12, boxShadow: "var(--shadow-small)"
    }, actionButtonStyle: {
      background: "var(--color-primary)", color: "var(--color-background)", minHeight: 44
    } }} />;
}
