import { client, getToken } from "./client.js";

const ITEMS_PATH = "/api/wardrobe/items";

export async function listItems(category = "") {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const data = await client.get(`${ITEMS_PATH}${query}`);
  return data && Array.isArray(data.items) ? data.items : [];
}

export function createItem({ name, category, image }) {
  const form = new FormData();
  form.append("name", name);
  form.append("category", category);
  if (image) {
    form.append("image", image);
  }
  return client.post(ITEMS_PATH, form);
}

export function deleteItem(itemId) {
  return client.del(`${ITEMS_PATH}/${itemId}`);
}

export function itemImageUrl(itemId) {
  return `${ITEMS_PATH}/${itemId}/image`;
}

export async function fetchItemImageBlob(itemId) {
  const token = getToken();
  if (!token) {
    return null;
  }
  const response = await fetch(itemImageUrl(itemId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return null;
  }
  return response.blob();
}
