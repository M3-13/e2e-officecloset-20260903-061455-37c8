import { describe, it, expect, beforeEach, vi } from "vitest";
import { register, login } from "./auth.js";

describe("auth", () => {
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

  it("register posts the credentials and stores the token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({ access_token: "tok_1", token_type: "bearer" }),
    });

    const data = await register({
      username: "ada",
      email: "ada@example.com",
      password: "secret",
    });

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/auth/register");
    expect(JSON.parse(opts.body)).toEqual({
      username: "ada",
      email: "ada@example.com",
      password: "secret",
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith("token", "tok_1");
    expect(data.access_token).toBe("tok_1");
  });

  it("login posts the credentials and stores the token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ access_token: "tok_2", token_type: "bearer" }),
    });

    await login({ username: "ada", password: "secret" });

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse(opts.body)).toEqual({
      username: "ada",
      password: "secret",
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith("token", "tok_2");
  });

  it("login surfaces the ApiError and does not store a token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          detail: { code: "unauthorized", message: "Anmeldung fehlgeschlagen" },
        }),
    });

    await expect(
      login({ username: "ada", password: "wrong" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });
});
