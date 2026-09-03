import { describe, it, expect, beforeEach, vi } from "vitest";
import { listItems, createItem, deleteItem } from "./wardrobe.js";

describe("wardrobe api", () => {
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

  it("lists items and returns the items array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ items: [{ id: 1, name: "Hemd" }] }),
    });

    const items = await listItems();

    expect(fetch).toHaveBeenCalledWith("/api/wardrobe/items", expect.any(Object));
    expect(items).toEqual([{ id: 1, name: "Hemd" }]);
  });

  it("appends the category query when filtering", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ items: [] }),
    });

    await listItems("Hose");

    expect(fetch.mock.calls[0][0]).toBe("/api/wardrobe/items?category=Hose");
  });

  it("returns an empty array when the response has no items", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({}),
    });

    await expect(listItems()).resolves.toEqual([]);
  });

  it("posts a FormData with name, category and image", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 2, name: "Hose" }),
    });
    const image = new Blob(["x"], { type: "image/png" });

    await createItem({ name: "Hose", category: "Hose", image });

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/wardrobe/items");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
    expect(opts.body.get("name")).toBe("Hose");
    expect(opts.body.get("category")).toBe("Hose");
    expect(opts.body.get("image")).toBeInstanceOf(Blob);
  });

  it("deletes an item by id", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    });

    await deleteItem(7);

    expect(fetch.mock.calls[0][0]).toBe("/api/wardrobe/items/7");
    expect(fetch.mock.calls[0][1].method).toBe("DELETE");
  });
});
