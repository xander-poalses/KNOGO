import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageKeys } from "@knogo/core";
import * as SecureStore from "expo-secure-store";

const key = "knogo.session.v1";
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let pending: Promise<unknown> = Promise.resolve();

// Keep migration, refresh and sign-out in order so an old read cannot restore a session.
function ordered<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result.catch(() => undefined);
  return result;
}

export const sessionStorage = {
  read: () => ordered(async () => {
    const stored = await SecureStore.getItemAsync(key, options);
    if (stored !== null) {
      await AsyncStorage.removeItem(storageKeys.supabaseSession);
      return stored;
    }
    const legacy = await AsyncStorage.getItem(storageKeys.supabaseSession);
    if (legacy === null) return null;
    await SecureStore.setItemAsync(key, legacy, options);
    await AsyncStorage.removeItem(storageKeys.supabaseSession);
    return legacy;
  }),
  write: (value: string) => ordered(async () => {
    await SecureStore.setItemAsync(key, value, options);
    await AsyncStorage.removeItem(storageKeys.supabaseSession);
  }),
  clear: () => ordered(async () => {
    // Remove the migration source first so it cannot bring back a signed-out session.
    await AsyncStorage.removeItem(storageKeys.supabaseSession);
    await SecureStore.deleteItemAsync(key, options);
  })
};
