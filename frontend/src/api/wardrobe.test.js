import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listItems,
  createItem,
  deleteItem,
  itemImageUrl,
  fetchItemImageBlob,
} from "./wardrobe.js";

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

  it("builds the authenticated image address from the item id", () => {
    expect(itemImageUrl(7)).toBe("/api/wardrobe/items/7/image");
  });

  it("fetches an item image with the Bearer header and returns its blob", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => blob,
    });
    window.localStorage.getItem = vi.fn(() => "tok123");

    const result = await fetchItemImageBlob(7);

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/api/wardrobe/items/7/image");
    expect(opts.headers.Authorization).toBe("Bearer tok123");
    expect(result).toBe(blob);
  });

  it("returns null for an image fetch without a token", async () => {
    await expect(fetchItemImageBlob(7)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns null when the image request is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      blob: async () => new Blob(),
    });
    window.localStorage.getItem = vi.fn(() => "tok123");

    await expect(fetchItemImageBlob(7)).resolves.toBeNull();
  });
});
