import client from "./client.js";

export async function listOutfits() {
  const data = await client.get("/api/outfits");
  return Array.isArray(data?.outfits) ? data.outfits : [];
}

export async function createOutfit(name, itemIds) {
  return client.post("/api/outfits", { name, item_ids: itemIds });
}

export async function deleteOutfit(outfitId) {
  await client.del(`/api/outfits/${outfitId}`);
}
