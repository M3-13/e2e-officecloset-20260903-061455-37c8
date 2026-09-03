from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas import AccountDataOut, ClothingItemOut, OutfitOut, UserOut
from ..security import get_current_user
from ..upload import delete_image_file

router = APIRouter(tags=["account"])


@router.get("/api/account", response_model=UserOut)
def get_account(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.get("/api/account/data", response_model=AccountDataOut)
def get_account_data(user: User = Depends(get_current_user)) -> AccountDataOut:
    items = [
        ClothingItemOut.model_validate(item)
        for item in sorted(user.clothing_items, key=lambda item: item.id)
    ]
    outfits = [
        OutfitOut(
            id=outfit.id,
            name=outfit.name,
            item_ids=[item.id for item in sorted(outfit.items, key=lambda item: item.id)],
            created_at=outfit.created_at,
        )
        for outfit in sorted(user.outfits, key=lambda outfit: outfit.id)
    ]
    return AccountDataOut(
        user=UserOut.model_validate(user),
        items=items,
        outfits=outfits,
    )


@router.delete("/api/auth/account", status_code=status.HTTP_204_NO_CONTENT)
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
