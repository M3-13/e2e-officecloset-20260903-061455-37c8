import { describe, it, expect, beforeEach, vi } from "vitest";
import { listOutfits, createOutfit, deleteOutfit } from "./outfits.js";

describe("outfits API", () => {
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

  it("listOutfits returns the outfits array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          outfits: [{ id: 1, name: "Gala", item_ids: [1, 2] }],
        }),
    });

    const outfits = await listOutfits();

    expect(outfits).toEqual([{ id: 1, name: "Gala", item_ids: [1, 2] }]);
    expect(fetch.mock.calls[0][0]).toBe("/api/outfits");
  });

  it("listOutfits returns [] when the response has no outfits", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({}),
    });

    expect(await listOutfits()).toEqual([]);
  });

  it("createOutfit posts name and item_ids", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({ id: 5, name: "Abend", item_ids: [1, 2] }),
    });

    const outfit = await createOutfit("Abend", [1, 2]);

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/outfits");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ name: "Abend", item_ids: [1, 2] });
    expect(outfit.id).toBe(5);
  });

  it("deleteOutfit calls DELETE on the outfit path", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    });

    await deleteOutfit(42);

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/outfits/42");
    expect(opts.method).toBe("DELETE");
  });
});
