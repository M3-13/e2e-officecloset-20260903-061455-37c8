import { client } from "./client.js";

const TOKEN_KEY = "token";

function storeToken(token) {
  if (!token) {
    return;
  }
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode etc.) — the request still succeeded.
  }
}

export async function register({ username, email, password }) {
  const data = await client.post("/api/auth/register", {
    username,
    email,
    password,
  });
  storeToken(data && data.access_token);
  return data;
}

export async function login({ username, password }) {
  const data = await client.post("/api/auth/login", { username, password });
  storeToken(data && data.access_token);
  return data;
}
