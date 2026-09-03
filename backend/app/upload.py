"""Image upload helpers: validation, EXIF/GPS stripping and file deletion."""

import io
import uuid
from pathlib import Path

from fastapi import HTTPException, status
from PIL import Image, UnidentifiedImageError

from .config import settings

MAX_UPLOAD_BYTES = 5 * 1024 * 1024

_ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

_FORMAT_EXTENSIONS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


def _prepare_for_save(image: Image.Image, image_format: str) -> Image.Image:
    if image_format == "JPEG" and image.mode not in ("RGB", "L"):
        return image.convert("RGB")
    return image


def save_image(data: bytes) -> str:
    """Validate and store an image; returns the stored filename.

    Re-encoding via Pillow drops EXIF/GPS metadata before the file is written.
    """
    try:
        image = Image.open(io.BytesIO(data))
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_image",
                "message": "The uploaded file is not a valid image.",
            },
        ) from exc

    try:
        image_format = (image.format or "").upper()
        if image_format not in _ALLOWED_FORMATS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail={
                    "code": "unsupported_file_type",
                    "message": "Image must be a JPEG, PNG or WebP file.",
                },
            )

        filename = f"{uuid.uuid4().hex}.{_FORMAT_EXTENSIONS[image_format]}"
        settings.upload_dir.mkdir(parents=True, exist_ok=True)
        prepared = _prepare_for_save(image, image_format)
        prepared.save(settings.upload_dir / filename, format=image_format)
    except HTTPException:
        raise
    except (OSError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_image",
                "message": "The uploaded image could not be processed.",
            },
        ) from exc
    finally:
        image.close()

    return filename


def delete_image_file(image_url: str) -> None:
    """Remove the stored file referenced by an image_url, if present."""
    filename = Path(image_url).name
    if not filename:
        return
    try:
        (settings.upload_dir / filename).unlink(missing_ok=True)
    except OSError:
        return
