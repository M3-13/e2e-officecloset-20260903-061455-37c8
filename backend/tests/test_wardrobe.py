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

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (200, 20, 20)).save(buf, format="PNG")
    return buf.getvalue()


def _webp_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (20, 200, 20)).save(buf, format="WEBP")
    return buf.getvalue()


def _gif_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (20, 20, 200)).save(buf, format="GIF")
    return buf.getvalue()


def _jpeg_with_exif_bytes() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (32, 32), (200, 200, 20))
    exif = Image.Exif()
    exif[0x010F] = "AcmeCam"
    exif[0x0110] = "Model 7"
    img.save(buf, format="JPEG", exif=exif)
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
    settings._jwt_secret = "test-secret-for-wardrobe-tests-0123456789abcdef"

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


def test_upload_creates_item_and_strips_exif(env: Env) -> None:
    user = _create_user(env.session_factory, "alice", "alice@example.com")
    resp = env.client.post(
        "/api/wardrobe/items",
        data={"name": "Rotes Hemd", "category": "Oberteil"},
        files={"image": ("shirt.jpg", _jpeg_with_exif_bytes(), "image/jpeg")},
        headers=_headers(user),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Rotes Hemd"
    assert body["category"] == "Oberteil"
    assert body["image_url"].startswith("/uploads/")
    assert isinstance(body["id"], int)

    saved_path = env.upload_dir / Path(body["image_url"]).name
    assert saved_path.exists()
    with Image.open(saved_path) as stored:
        exif = stored.getexif()
    assert 0x010F not in exif
    assert 0x0110 not in exif


def test_upload_accepts_png_and_webp(env: Env) -> None:
    user = _create_user(env.session_factory, "alice", "alice@example.com")
    headers = _headers(user)
    assert _upload_png(env, headers, "PNG Stück", "Hose").status_code == 201

    webp_resp = env.client.post(
        "/api/wardrobe/items",
        data={"name": "WebP Stück", "category": "Schuhe"},
        files={"image": ("img.webp", _webp_bytes(), "image/webp")},
        headers=headers,
    )
    assert webp_resp.status_code == 201
    assert webp_resp.json()["image_url"].endswith(".webp")


def test_upload_rejects_unsupported_and_invalid_files(env: Env) -> None:
    user = _create_user(env.session_factory, "alice", "alice@example.com")
    headers = _headers(user)

    gif_resp = env.client.post(
        "/api/wardrobe/items",
        data={"name": "GIF", "category": "Accessoire"},
        files={"image": ("img.gif", _gif_bytes(), "image/gif")},
        headers=headers,
    )
    assert gif_resp.status_code == 415

    invalid_resp = env.client.post(
        "/api/wardrobe/items",
        data={"name": "Kein Bild", "category": "Hose"},
        files={"image": ("note.txt", b"not an image", "text/plain")},
        headers=headers,
    )
    assert invalid_resp.status_code == 400


def test_upload_rejects_content_length_over_limit(env: Env) -> None:
    user = _create_user(env.session_factory, "alice", "alice@example.com")
    big_payload = b"x" * (MAX_UPLOAD_BYTES + 1)
    resp = env.client.post(
        "/api/wardrobe/items",
        data={"name": "Zu groß", "category": "Hose"},
        files={"image": ("big.bin", big_payload, "application/octet-stream")},
        headers=_headers(user),
    )
    assert resp.status_code == 413
    assert list(env.upload_dir.iterdir()) == []


def test_list_filters_by_category(env: Env) -> None:
    user = _create_user(env.session_factory, "alice", "alice@example.com")
    headers = _headers(user)
    assert _upload_png(env, headers, "Shirt", "Oberteil").status_code == 201
    assert _upload_png(env, headers, "Jeans", "Hose").status_code == 201

    filtered = env.client.get("/api/wardrobe/items", params={"category": "Hose"}, headers=headers)
    assert filtered.status_code == 200
    items = filtered.json()["items"]
    assert len(items) == 1
    assert items[0]["category"] == "Hose"
    assert items[0]["name"] == "Jeans"

    all_items = env.client.get("/api/wardrobe/items", headers=headers)
    assert len(all_items.json()["items"]) == 2


def test_delete_item_removes_record_and_file(env: Env) -> None:
    user = _create_user(env.session_factory, "alice", "alice@example.com")
    headers = _headers(user)
    created = _upload_png(env, headers, "Kleid", "Kleid").json()
    filename = Path(created["image_url"]).name
    assert (env.upload_dir / filename).exists()

    resp = env.client.delete(f"/api/wardrobe/items/{created['id']}", headers=headers)
    assert resp.status_code == 204
    assert not (env.upload_dir / filename).exists()

    remaining = env.client.get("/api/wardrobe/items", headers=headers)
    assert remaining.json()["items"] == []


def test_cannot_delete_or_see_foreign_item(env: Env) -> None:
    alice = _create_user(env.session_factory, "alice", "alice@example.com")
    bob = _create_user(env.session_factory, "bob", "bob@example.com")
    alice_headers = _headers(alice)
    bob_headers = _headers(bob)

    created = _upload_png(env, alice_headers, "Geheim", "Accessoire").json()
    item_id = created["id"]

    assert env.client.get("/api/wardrobe/items", headers=bob_headers).json()["items"] == []
    assert (
        env.client.delete(f"/api/wardrobe/items/{item_id}", headers=bob_headers).status_code == 403
    )
    assert env.client.delete("/api/wardrobe/items/99999", headers=bob_headers).status_code == 404

    alice_items = env.client.get("/api/wardrobe/items", headers=alice_headers).json()["items"]
    assert [item["id"] for item in alice_items] == [item_id]


def test_endpoints_require_authentication(env: Env) -> None:
    assert env.client.get("/api/wardrobe/items").status_code == 401
    assert env.client.post("/api/wardrobe/items").status_code == 401
    assert env.client.delete("/api/wardrobe/items/1").status_code == 401
