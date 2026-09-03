from fastapi import APIRouter, Depends, HTTPException, status

from ..models import User
from ..security import get_current_user

router = APIRouter(prefix="/api/auth", tags=["account"])


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(user: User = Depends(get_current_user)) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "code": "not_implemented",
            "message": "account deletion is implemented by ticket #10",
        },
    )
