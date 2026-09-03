from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ClothingItem, Outfit, User
from ..schemas import OutfitCreate, OutfitList, OutfitOut
from ..security import get_current_user

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


def _to_outfit_out(outfit: Outfit) -> OutfitOut:
    return OutfitOut(
        id=outfit.id,
        name=outfit.name,
        item_ids=[item.id for item in sorted(outfit.items, key=lambda item: item.id)],
        created_at=outfit.created_at,
    )


@router.post("", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def create_outfit(
    body: OutfitCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    item_ids = list(dict.fromkeys(body.item_ids))
    if not item_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "empty_items", "message": "an outfit needs at least one item"},
        )

    items = db.query(ClothingItem).filter(ClothingItem.id.in_(item_ids)).all()
    found_ids = {item.id for item in items}

    for item_id in item_ids:
        if item_id not in found_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "item_not_found", "message": f"item {item_id} does not exist"},
            )

    for item in items:
        if item.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "forbidden", "message": "item belongs to another user"},
            )

    outfit = Outfit(
        name=body.name,
        created_at=datetime.now(UTC).isoformat(),
        owner_id=user.id,
        items=items,
    )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    return _to_outfit_out(outfit)


@router.get("", response_model=OutfitList)
def list_outfits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitList:
    outfits = db.query(Outfit).filter(Outfit.owner_id == user.id).order_by(Outfit.id).all()
    return OutfitList(outfits=[_to_outfit_out(outfit) for outfit in outfits])


@router.delete("/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if outfit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "outfit_not_found", "message": "outfit does not exist"},
        )
    if outfit.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "forbidden", "message": "outfit belongs to another user"},
        )
    db.delete(outfit)
    db.commit()
    return None
