import { useEffect, useState } from "react";
import { getToken } from "../api/client.js";
import { itemImageUrl } from "../api/wardrobe.js";

export default function AuthImage({ item, className, alt, fallback = null }) {
  const [src, setSrc] = useState(null);

  const itemId = item?.id;
  const imageUrl = item?.image_url;
  const hasImage = Boolean(itemId && imageUrl);

  useEffect(() => {
    setSrc(null);
    if (!hasImage) {
      return undefined;
    }

    let objectUrl = null;
    let active = true;

    (async () => {
      const token = getToken();
      if (!token) {
        return;
      }
      try {
        const response = await fetch(itemImageUrl(itemId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          return;
        }
        const blob = await response.blob();
        if (!active) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        // Network/parse failure: keep the fallback visible.
      }
    })();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [itemId, imageUrl, hasImage]);

  if (!src) {
    return fallback;
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setSrc(null)}
    />
  );
}
