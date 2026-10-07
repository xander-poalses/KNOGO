import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKeys } from "@knogo/core";

export const sessionStorage = {
  read: () => AsyncStorage.getItem(storageKeys.supabaseSession).catch(() => null),
  write: (value: string) => AsyncStorage.setItem(storageKeys.supabaseSession, value),
  clear: () => AsyncStorage.removeItem(storageKeys.supabaseSession)
};
