from fastapi import APIRouter, HTTPException, status

from ..schemas import OutfitCreate, OutfitList, OutfitOut

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


@router.post("", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def create_outfit(body: OutfitCreate) -> OutfitOut:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "code": "not_implemented",
            "message": "outfit creation is implemented by ticket #4",
        },
    )


@router.get("", response_model=OutfitList)
def list_outfits() -> OutfitList:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={"code": "not_implemented", "message": "outfit listing is implemented by ticket #4"},
    )


@router.delete("/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(outfit_id: int) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "code": "not_implemented",
            "message": "outfit deletion is implemented by ticket #4",
        },
    )
