import type { ReactElement } from "react";
import { Toaster, toast } from "sonner-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function showToast(id: string, content: ReactElement, onDismiss: () => void) {
  toast.custom(content, { id, duration: Infinity, onDismiss });
}

export const dismissToast = (id: string) => toast.dismiss(id);

export function SonnerHost() {
  const { top, left, right } = useSafeAreaInsets();
  return <Toaster position="top-center" offset={top + 16} positionerStyle={{ left: left + 16, right: right + 16, width: "auto", zIndex: 10000 }} visibleToasts={3} fullWindowOverlay={false} swipeToDismissDirection="up" autoWiggleOnUpdate="never" />;
}
