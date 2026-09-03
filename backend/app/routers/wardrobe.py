from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from ..config import settings
from ..db import get_db
from ..models import ClothingItem, User
from ..schemas import ClothingItemList, ClothingItemOut
from ..security import get_current_user
from ..upload import MAX_UPLOAD_BYTES, delete_image_file, save_image

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])

ALLOWED_CATEGORIES = {"Oberteil", "Hose", "Kleid", "Schuhe", "Accessoire"}


@router.post("/items", response_model=ClothingItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            length = int(content_length)
        except ValueError:
            length = 0
        if length > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail={
                    "code": "file_too_large",
                    "message": "Image exceeds the 5 MB upload limit.",
                },
            )

    form = await request.form()
    name = form.get("name")
    category = form.get("category")
    image = form.get("image")

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "missing_name", "message": "A name is required."},
        )
    if not isinstance(category, str) or category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_category",
                "message": "Category must be one of Oberteil, Hose, Kleid, Schuhe, Accessoire.",
            },
        )
    if not isinstance(image, UploadFile):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "missing_image", "message": "An image file is required."},
        )

    data = await image.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail={
                "code": "file_too_large",
                "message": "Image exceeds the 5 MB upload limit.",
            },
        )

    filename = save_image(data)

    item = ClothingItem(
        name=name.strip(),
        category=category,
        image_url=f"/uploads/{filename}",
        created_at=datetime.now(UTC).isoformat(),
        owner_id=user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ClothingItemOut.model_validate(item)


@router.get("/items", response_model=ClothingItemList)
def list_items(
    category: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemList:
    query = db.query(ClothingItem).filter(ClothingItem.owner_id == user.id)
    if category is not None:
        query = query.filter(ClothingItem.category == category)
    items = query.order_by(ClothingItem.id).all()
    return ClothingItemList(items=[ClothingItemOut.model_validate(item) for item in items])


@router.get("/items/{item_id}/image")
def get_item_image(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Item not found."},
        )
    if item.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "forbidden", "message": "You do not own this item."},
        )

    filename = Path(item.image_url).name
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Image not found."},
        )
    file_path = settings.upload_dir / filename
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Image not found."},
        )
    return FileResponse(file_path)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    item = db.query(ClothingItem).filter(ClothingItem.id == item_id).first()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Item not found."},
        )
    if item.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "forbidden", "message": "You do not own this item."},
        )

    delete_image_file(item.image_url)
    db.delete(item)
    db.commit()
