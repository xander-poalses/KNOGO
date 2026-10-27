// Imports
import { createContext, useContext, useId, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, View } from "react-native";
import { SonnerHost } from "./Sonner";

// State
type ToastController = {
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
};
const ToastCommands = createContext<ToastController | null>(null);
const ToastState = createContext<{ modals: string[] }>({ modals: [] });
export const useToastController = () => useContext(ToastCommands);

// Components
export function ToastProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<string[]>([]);
  const controller = useMemo<ToastController>(() => ({
    openModal: id => setModals(current => [...current.filter(item => item !== id), id]),
    closeModal: id => setModals(current => current.filter(item => item !== id))
  }), []);
  const state = useMemo(() => ({ modals }), [modals]);
  return <ToastCommands.Provider value={controller}><ToastState.Provider value={state}>
    <View style={{ flex: 1 }}>{children}<ToastViewport/></View>
  </ToastState.Provider></ToastCommands.Provider>;
}

export function ToastViewport({ modal = false }: { modal?: boolean }) {
  const controller = useToastController();
  const { modals } = useContext(ToastState);
  const id = useId();
  useLayoutEffect(() => {
    if (!modal || !controller || Platform.OS === "web") return;
    controller.openModal(id);
    return () => controller.closeModal(id);
  }, [controller, id, modal]);
  const activeModal = modals.at(-1);
  if (Platform.OS === "web") return modal ? null : <SonnerHost />;
  if (modal ? activeModal !== id : activeModal !== undefined) return null;
  return <SonnerHost />;
}
