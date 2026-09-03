const TOKEN_KEY = "token";

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request(path, options = {}) {
  const { headers, body, ...rest } = options;

  const finalHeaders = { ...headers };
  const token = getToken();
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let finalBody = body;
  if (
    body !== undefined &&
    body !== null &&
    typeof body !== "string" &&
    !(body instanceof FormData)
  ) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(path, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  const data = await parseBody(response);

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && data.detail ? data.detail : null;
    const code = detail && detail.code ? String(detail.code) : "error";
    const message =
      detail && detail.message
        ? String(detail.message)
        : `Anfrage fehlgeschlagen (${response.status})`;
    throw new ApiError(response.status, code, message);
  }

  return data;
}

export const client = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};

export default client;
