import { client } from "./client.js";

const TOKEN_KEY = "token";

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode etc.) — there is nothing to clear.
  }
}

export async function deleteAccount() {
  await client.del("/api/auth/account");
  clearToken();
}
