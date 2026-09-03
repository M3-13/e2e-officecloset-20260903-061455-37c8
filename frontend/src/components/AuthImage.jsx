import { useEffect, useState } from "react";
import { fetchItemImageBlob } from "../api/wardrobe.js";

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
      try {
        const blob = await fetchItemImageBlob(itemId);
        if (!blob || !active) {
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
