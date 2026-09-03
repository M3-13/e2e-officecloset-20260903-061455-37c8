from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import get_current_user
from ..upload import delete_image_file

router = APIRouter(prefix="/api/auth", tags=["account"])


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    image_urls = [item.image_url for item in user.clothing_items]
    failed = [image_url for image_url in image_urls if not delete_image_file(image_url)]
    if failed:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "file_delete_failed",
                "message": "One or more image files could not be deleted.",
            },
        )
    db.delete(user)
    db.commit()
