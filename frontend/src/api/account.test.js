import { describe, it, expect, beforeEach, vi } from "vitest";
import { deleteAccount, clearToken, getAccount, getAccountData } from "./account.js";

describe("account API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.window = {
      localStorage: {
        getItem: vi.fn(() => "abc123"),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    };
    globalThis.fetch = vi.fn();
  });

  it("deleteAccount calls DELETE on the account path and removes the token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    });

    await deleteAccount();

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/auth/account");
    expect(opts.method).toBe("DELETE");
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("token");
  });

  it("deleteAccount does not remove the token when the request fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          detail: { code: "unauthorized", message: "Not authenticated" },
        }),
    });

    await expect(deleteAccount()).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
    expect(window.localStorage.removeItem).not.toHaveBeenCalled();
  });

  it("clearToken removes the token from localStorage", () => {
    clearToken();
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("token");
  });

  it("getAccount fetches the current profile with the Bearer header", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ id: 1, username: "alice", email: "alice@example.com" }),
    });

    const data = await getAccount();

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/account");
    expect(opts.headers.Authorization).toBe("Bearer abc123");
    expect(data).toEqual({ id: 1, username: "alice", email: "alice@example.com" });
  });

  it("getAccountData fetches the full export", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          user: { id: 1, username: "alice", email: "alice@example.com" },
          items: [],
          outfits: [],
        }),
    });

    const data = await getAccountData();

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/account/data");
    expect(opts.headers.Authorization).toBe("Bearer abc123");
    expect(data.user.username).toBe("alice");
    expect(data.items).toEqual([]);
    expect(data.outfits).toEqual([]);
  });
});
