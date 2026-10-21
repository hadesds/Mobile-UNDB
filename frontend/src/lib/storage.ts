import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore no celular; localStorage no modo web (SecureStore não roda no navegador).
export const storage = {
  async get(chave: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(chave) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(chave);
  },
  async set(chave: string, valor: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(chave, valor);
      } catch {}
      return;
    }
    await SecureStore.setItemAsync(chave, valor);
  },
  async remove(chave: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.removeItem(chave);
      } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(chave);
  },
};