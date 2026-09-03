import { describe, it, expect, beforeEach, vi } from "vitest";
import { request, getToken, authHeaders, ApiError } from "./client.js";

describe("client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.window = {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    };
    globalThis.fetch = vi.fn();
  });

  it("reads the token from localStorage['token']", () => {
    window.localStorage.getItem = vi.fn(() => "abc123");
    expect(getToken()).toBe("abc123");
  });

  it("adds the Bearer header when a token is present", () => {
    window.localStorage.getItem = vi.fn(() => "abc123");
    expect(authHeaders()).toEqual({ Authorization: "Bearer abc123" });
  });

  it("omits the Authorization header when no token is present", () => {
    expect(authHeaders()).toEqual({});
  });

  it("sends the Authorization header and parses a JSON response", async () => {
    window.localStorage.getItem = vi.fn(() => "abc123");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ items: [] }),
    });

    const data = await request("/api/wardrobe/items");

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/wardrobe/items");
    expect(opts.headers.Authorization).toBe("Bearer abc123");
    expect(data).toEqual({ items: [] });
  });

  it("throws an ApiError carrying code and message from the detail body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          detail: { code: "unauthorized", message: "Anmeldung fehlgeschlagen" },
        }),
    });

    await expect(request("/api/auth/login")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      code: "unauthorized",
    });
    await expect(request("/api/auth/login")).rejects.toBeInstanceOf(ApiError);
  });

  it("does not overwrite the Content-Type of a FormData body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 1 }),
    });
    const form = new FormData();
    form.append("name", "Hose");

    await request("/api/wardrobe/items", { method: "POST", body: form });

    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBeUndefined();
    expect(opts.body).toBe(form);
  });
});
