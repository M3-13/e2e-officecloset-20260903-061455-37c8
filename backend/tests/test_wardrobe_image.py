import io
from collections.abc import Generator
from dataclasses import dataclass
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base, get_db
from app.main import app
from app.models import User
from app.security import create_access_token, hash_password


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (200, 20, 20)).save(buf, format="PNG")
    return buf.getvalue()


@dataclass
class Env:
    client: TestClient
    session_factory: sessionmaker
    upload_dir: Path


@pytest.fixture
def env(tmp_path: Path) -> Generator[Env]:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def _override_get_db() -> Generator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db

    original_upload_dir = settings.upload_dir
    original_secret = settings._jwt_secret
    settings.upload_dir = tmp_path / "uploads"
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings._jwt_secret = "test-secret-for-image-tests-0123456789abcdef"

    try:
        yield Env(TestClient(app), session_factory, settings.upload_dir)
    finally:
        app.dependency_overrides.pop(get_db, None)
        settings.upload_dir = original_upload_dir
        settings._jwt_secret = original_secret
        engine.dispose()


def _create_user(session_factory: sessionmaker, username: str, email: str) -> User:
    db = session_factory()
    try:
        user = User(username=username, email=email, password_hash=hash_password("secret"))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def _upload_png(env: Env, headers: dict[str, str], name: str, category: str):
    return env.client.post(
        "/api/wardrobe/items",
        data={"name": name, "category": category},
        files={"image": ("img.png", _png_bytes(), "image/png")},
        headers=headers,
    )


def test_image_endpoint_serves_owners_image(env: Env) -> None:
    user = _create_user(env.session_factory, "alice", "alice@example.com")
    created = _upload_png(env, _headers(user), "Rotes Hemd", "Oberteil").json()

    resp = env.client.get(f"/api/wardrobe/items/{created['id']}/image", headers=_headers(user))

    assert resp.status_code == 200
    filename = Path(created["image_url"]).name
    assert resp.content == (env.upload_dir / filename).read_bytes()
    assert resp.headers["content-type"].startswith("image/")


def test_image_endpoint_requires_auth(env: Env) -> None:
    assert env.client.get("/api/wardrobe/items/1/image").status_code == 401


def test_image_endpoint_rejects_foreign_item(env: Env) -> None:
    alice = _create_user(env.session_factory, "alice", "alice@example.com")
    bob = _create_user(env.session_factory, "bob", "bob@example.com")
    created = _upload_png(env, _headers(alice), "Geheim", "Accessoire").json()

    resp = env.client.get(f"/api/wardrobe/items/{created['id']}/image", headers=_headers(bob))

    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "forbidden"


def test_image_endpoint_missing_item_returns_404(env: Env) -> None:
    user = _create_user(env.session_factory, "alice", "alice@example.com")

    resp = env.client.get("/api/wardrobe/items/99999/image", headers=_headers(user))

    assert resp.status_code == 404


def test_image_endpoint_missing_file_returns_404(env: Env) -> None:
    from app.models import ClothingItem

    user = _create_user(env.session_factory, "alice", "alice@example.com")
    db = env.session_factory()
    try:
        item = ClothingItem(
            name="Ohne Datei",
            category="Hose",
            image_url="/uploads/fehlt.jpg",
            created_at="2026-09-03T00:00:00+00:00",
            owner_id=user.id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        item_id = item.id
    finally:
        db.close()

    resp = env.client.get(f"/api/wardrobe/items/{item_id}/image", headers=_headers(user))

    assert resp.status_code == 404


def test_public_uploads_mount_is_removed(env: Env) -> None:
    assert env.client.get("/uploads/whatever.jpg").status_code == 404
