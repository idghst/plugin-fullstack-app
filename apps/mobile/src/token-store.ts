import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createMemoryTokenStore, type TokenStore } from '@starter/auth';
import { tokensSchema, type Tokens } from '@starter/contracts';
const key = 'project-studio.session.v1';
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
// One JSON record keeps access/refresh credentials atomic during refresh rotation.
export const tokenStore: TokenStore =
  Platform.OS === 'web'
    ? createMemoryTokenStore()
    : {
        async get() {
          const raw = await SecureStore.getItemAsync(key, options);
          if (!raw) return null;
          try {
            return tokensSchema.parse(JSON.parse(raw));
          } catch {
            await SecureStore.deleteItemAsync(key, options);
            return null;
          }
        },
        async set(tokens: Tokens) {
          await SecureStore.setItemAsync(key, JSON.stringify(tokensSchema.parse(tokens)), options);
        },
        async clear() {
          await SecureStore.deleteItemAsync(key, options);
        },
      };
