from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from ..schemas import ClothingItemList, ClothingItemOut

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])


@router.post("/items", response_model=ClothingItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile = File(...),
) -> ClothingItemOut:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={"code": "not_implemented", "message": "item upload is implemented by ticket #2"},
    )


@router.get("/items", response_model=ClothingItemList)
def list_items(category: str | None = Query(default=None)) -> ClothingItemList:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={"code": "not_implemented", "message": "item listing is implemented by ticket #2"},
    )


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={"code": "not_implemented", "message": "item deletion is implemented by ticket #2"},
    )
