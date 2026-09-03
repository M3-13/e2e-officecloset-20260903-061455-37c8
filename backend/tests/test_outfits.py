from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base, get_db
from app.main import app
from app.models import ClothingItem, Outfit, User
from app.security import create_access_token

SessionFactory = sessionmaker[Session]


@pytest.fixture()
def session_factory(monkeypatch: pytest.MonkeyPatch) -> SessionFactory:
    monkeypatch.setattr(settings, "_jwt_secret", "outfit-test-secret-key-0123456789abcdef")
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


@pytest.fixture()
def client(session_factory: SessionFactory) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _make_user(db: Session, username: str, email: str | None = None) -> User:
    user = User(username=username, email=email or f"{username}@example.com", password_hash="x")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_item(db: Session, owner_id: int, name: str, category: str = "Oberteil") -> ClothingItem:
    item = ClothingItem(
        name=name,
        category=category,
        image_url="/uploads/placeholder.jpg",
        created_at="2026-09-03T00:00:00+00:00",
        owner_id=owner_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _auth_headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


def test_create_outfit(session_factory: SessionFactory, client: TestClient) -> None:
    db = session_factory()
    user = _make_user(db, "alice")
    shirt = _make_item(db, user.id, "Shirt")
    pants = _make_item(db, user.id, "Jeans", category="Hose")
    db.close()

    response = client.post(
        "/api/outfits",
        json={"name": "Casual", "item_ids": [shirt.id, pants.id]},
        headers=_auth_headers(user.id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Casual"
    assert body["item_ids"] == [shirt.id, pants.id]
    assert body["created_at"]
    assert isinstance(body["id"], int)

    db = session_factory()
    outfit = db.query(Outfit).filter(Outfit.id == body["id"]).first()
    assert outfit is not None
    assert outfit.owner_id == user.id
    db.close()


def test_create_outfit_requires_auth(client: TestClient) -> None:
    response = client.post("/api/outfits", json={"name": "X", "item_ids": [1]})
    assert response.status_code == 401


def test_create_outfit_rejects_foreign_item(
    session_factory: SessionFactory, client: TestClient
) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    bob = _make_user(db, "bob")
    bob_item = _make_item(db, bob.id, "BobShirt")
    db.close()

    response = client.post(
        "/api/outfits",
        json={"name": "Thief", "item_ids": [bob_item.id]},
        headers=_auth_headers(alice.id),
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "forbidden"


def test_create_outfit_rejects_missing_item(
    session_factory: SessionFactory, client: TestClient
) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    db.close()

    response = client.post(
        "/api/outfits",
        json={"name": "Ghost", "item_ids": [999999]},
        headers=_auth_headers(alice.id),
    )

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "item_not_found"


def test_list_outfits_returns_only_own(session_factory: SessionFactory, client: TestClient) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    bob = _make_user(db, "bob")
    alice_item = _make_item(db, alice.id, "AliceShirt")
    bob_item = _make_item(db, bob.id, "BobShirt")

    alice_outfit = Outfit(
        name="Alice Outfit",
        created_at="2026-09-03T00:00:00+00:00",
        owner_id=alice.id,
        items=[alice_item],
    )
    bob_outfit = Outfit(
        name="Bob Outfit",
        created_at="2026-09-03T00:00:00+00:00",
        owner_id=bob.id,
        items=[bob_item],
    )
    db.add_all([alice_outfit, bob_outfit])
    db.commit()
    db.close()

    response = client.get("/api/outfits", headers=_auth_headers(alice.id))

    assert response.status_code == 200
    outfits = response.json()["outfits"]
    assert [o["name"] for o in outfits] == ["Alice Outfit"]
    assert outfits[0]["item_ids"] == [alice_item.id]


def test_list_outfits_requires_auth(client: TestClient) -> None:
    response = client.get("/api/outfits")
    assert response.status_code == 401


def test_delete_outfit(session_factory: SessionFactory, client: TestClient) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    item = _make_item(db, alice.id, "Shirt")
    outfit = Outfit(
        name="ToDelete",
        created_at="2026-09-03T00:00:00+00:00",
        owner_id=alice.id,
        items=[item],
    )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    outfit_id = outfit.id
    db.close()

    response = client.delete(f"/api/outfits/{outfit_id}", headers=_auth_headers(alice.id))

    assert response.status_code == 204

    db = session_factory()
    assert db.query(Outfit).filter(Outfit.id == outfit_id).first() is None
    db.close()


def test_delete_foreign_outfit(session_factory: SessionFactory, client: TestClient) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    bob = _make_user(db, "bob")
    item = _make_item(db, alice.id, "Shirt")
    outfit = Outfit(
        name="Alice Outfit",
        created_at="2026-09-03T00:00:00+00:00",
        owner_id=alice.id,
        items=[item],
    )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    outfit_id = outfit.id
    db.close()

    response = client.delete(f"/api/outfits/{outfit_id}", headers=_auth_headers(bob.id))

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "forbidden"


def test_delete_missing_outfit(session_factory: SessionFactory, client: TestClient) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    db.close()

    response = client.delete("/api/outfits/999999", headers=_auth_headers(alice.id))

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "outfit_not_found"
