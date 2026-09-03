from fastapi import APIRouter, HTTPException, status

from ..schemas import Token, UserCreate, UserLogin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate) -> Token:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={"code": "not_implemented", "message": "registration is implemented by ticket #9"},
    )


@router.post("/login", response_model=Token)
def login(body: UserLogin) -> Token:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={"code": "not_implemented", "message": "login is implemented by ticket #9"},
    )
