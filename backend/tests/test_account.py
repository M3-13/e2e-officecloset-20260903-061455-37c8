import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import ClothingItem, Outfit, User
from app.security import create_access_token, hash_password


def _create_fixture_user(suffix: str, image_name: str) -> int:
    db = SessionLocal()
    try:
        user = User(
            username=f"delete_{suffix}",
            email=f"delete_{suffix}@example.com",
            password_hash=hash_password("pw"),
        )
        db.add(user)
        db.flush()

        item = ClothingItem(
            name="Test-Oberteil",
            category="Oberteil",
            image_url=f"/uploads/{image_name}",
            created_at="2026-01-01T00:00:00Z",
            owner_id=user.id,
        )
        db.add(item)
        db.flush()

        outfit = Outfit(
            name="Test-Outfit",
            created_at="2026-01-01T00:00:00Z",
            owner_id=user.id,
        )
        outfit.items.append(item)
        db.add(outfit)
        db.commit()

        settings.upload_dir.mkdir(parents=True, exist_ok=True)
        (settings.upload_dir / image_name).write_bytes(b"fake-image-data")

        return user.id
    finally:
        db.close()


def test_delete_account_removes_user_items_outfits_and_images() -> None:
    with TestClient(app) as client:
        suffix = uuid.uuid4().hex[:8]
        image_name = f"delete_{suffix}.jpg"
        user_id = _create_fixture_user(suffix, image_name)

        token = create_access_token(user_id)
        headers = {"Authorization": f"Bearer {token}"}

        response = client.delete("/api/auth/account", headers=headers)
        assert response.status_code == 204

        db: Session = SessionLocal()
        try:
            assert db.query(User).filter(User.id == user_id).count() == 0
            assert db.query(ClothingItem).filter(ClothingItem.owner_id == user_id).count() == 0
            assert db.query(Outfit).filter(Outfit.owner_id == user_id).count() == 0
        finally:
            db.close()

        assert not (settings.upload_dir / image_name).exists()


def test_login_after_account_deletion_fails() -> None:
    with TestClient(app) as client:
        suffix = uuid.uuid4().hex[:8]
        image_name = f"delete_{suffix}.jpg"
        user_id = _create_fixture_user(suffix, image_name)

        token = create_access_token(user_id)
        headers = {"Authorization": f"Bearer {token}"}

        assert client.delete("/api/auth/account", headers=headers).status_code == 204

        response = client.delete("/api/auth/account", headers=headers)
        assert response.status_code == 401


def test_account_delete_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.delete("/api/auth/account")
        assert response.status_code == 401
