import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { Toaster, toast } from "sonner";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function showToast(id: string, content: ReactElement, onDismiss: () => void) {
  toast.custom(() => content, { id, duration: Infinity, onDismiss });
}

export const dismissToast = (id: string) => toast.dismiss(id);

export function SonnerHost() {
  const { top = 0, left = 0, right = 0 } = useSafeAreaInsets();
  const offset = { top: top + 16, left: left + 16, right: right + 16 };
  return createPortal(<Toaster position="top-center" visibleToasts={3} offset={offset} mobileOffset={offset} swipeDirections={["top", "left", "right"]} style={{ zIndex: 10000 }} />, document.body);
}
