import re
import threading
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import User
from ..schemas import Token, UserCreate, UserLogin
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MIN_PASSWORD_LENGTH = 8

_RATE_LIMIT_WINDOW_SECONDS = 60.0

_rate_lock = threading.Lock()
_rate_buckets: defaultdict[str, deque[float]] = defaultdict(deque)


def _client_key(request: Request) -> str:
    if request.client is not None:
        return request.client.host
    return "unknown"


def _enforce_rate_limit(request: Request) -> None:
    if settings.auth_rate_limit_disabled:
        return
    key = _client_key(request)
    now = time.monotonic()
    with _rate_lock:
        window = _rate_buckets[key]
        while window and now - window[0] > _RATE_LIMIT_WINDOW_SECONDS:
            window.popleft()
        if not window:
            del _rate_buckets[key]
        if len(window) >= settings.auth_rate_limit_max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "rate_limited",
                    "message": "Too many requests. Please try again later.",
                },
            )
        window.append(now)
        _rate_buckets[key] = window


def reset_rate_limits() -> None:
    with _rate_lock:
        _rate_buckets.clear()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    body: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> Token:
    _enforce_rate_limit(request)

    username = body.username.strip()
    email = body.email.strip()

    if not username:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "invalid_username", "message": "Username must not be empty."},
        )
    if not _EMAIL_RE.match(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": "invalid_email", "message": "Email address is not valid."},
        )
    if len(body.password) < _MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": "password_too_short",
                "message": f"Password must be at least {_MIN_PASSWORD_LENGTH} characters long.",
            },
        )

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "already_exists",
                "message": "A user with this username or email already exists.",
            },
        ) from None
    db.refresh(user)

    return Token(access_token=create_access_token(user.id), token_type="bearer")


@router.post("/login", response_model=Token)
def login(
    body: UserLogin,
    request: Request,
    db: Session = Depends(get_db),
) -> Token:
    _enforce_rate_limit(request)

    user = db.query(User).filter(User.username == body.username).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_credentials",
                "message": "Invalid username or password.",
            },
        )

    return Token(access_token=create_access_token(user.id), token_type="bearer")
