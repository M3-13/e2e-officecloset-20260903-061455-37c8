import logging
from pathlib import Path

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import User
from ..security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["account"])


def _delete_image_file(image_url: str) -> None:
    safe_name = Path(image_url).name
    if not safe_name:
        return
    file_path = settings.upload_dir / safe_name
    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        logger.warning("could not delete uploaded image %s", file_path)


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    image_urls = [item.image_url for item in user.clothing_items]
    db.delete(user)
    db.commit()
    for image_url in image_urls:
        _delete_image_file(image_url)
