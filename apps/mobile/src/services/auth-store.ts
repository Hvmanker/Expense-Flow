import * as SecureStore from 'expo-secure-store';
import { syncClient } from './sync-client';

const TOKEN_KEY = 'expenseflow_auth_jwt_token';
const USER_KEY = 'expenseflow_auth_user_email';

let memoryToken: string | null = null;
let memoryUser: string | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveAuthSession(token: string, email?: string): Promise<void> {
  if (!(await isSecureStoreAvailable())) {
    throw new Error('Secure credential storage is unavailable on this device.');
  }

  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (email) {
      await SecureStore.setItemAsync(USER_KEY, email);
    }
  } catch {
    throw new Error('Unable to save the authentication session securely.');
  }

  memoryToken = token;
  if (email) memoryUser = email;

  // Immediately wire token into active syncClient instance
  syncClient.setAuthToken(token);
}

export async function getAuthSession(): Promise<{ token: string | null; email: string | null }> {
  try {
    if (await isSecureStoreAvailable()) {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const email = await SecureStore.getItemAsync(USER_KEY);
      if (token) {
        memoryToken = token;
        memoryUser = email;
        syncClient.setAuthToken(token);
        return { token, email };
      }
    }
  } catch (err) {
    console.warn('[AuthStore] Failed to read token from SecureStore:', err);
  }

  if (memoryToken) {
    syncClient.setAuthToken(memoryToken);
  }

  return { token: memoryToken, email: memoryUser };
}

export async function clearAuthSession(): Promise<void> {
  memoryToken = null;
  memoryUser = null;

  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch (err) {
    console.warn('[AuthStore] Failed to delete token from SecureStore:', err);
  }

  syncClient.setAuthToken('');
}
