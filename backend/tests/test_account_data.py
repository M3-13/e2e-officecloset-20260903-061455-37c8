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
    monkeypatch.setattr(settings, "_jwt_secret", "account-data-test-secret-0123456789abcdef")
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


def test_get_account_returns_own_profile(
    session_factory: SessionFactory, client: TestClient
) -> None:
    db = session_factory()
    alice = _make_user(db, "alice", "alice@example.com")
    db.close()

    response = client.get("/api/account", headers=_auth_headers(alice.id))

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == alice.id
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert "password_hash" not in body


def test_get_account_requires_auth(client: TestClient) -> None:
    response = client.get("/api/account")
    assert response.status_code == 401


def test_get_account_data_returns_profile_items_and_outfits(
    session_factory: SessionFactory, client: TestClient
) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    shirt = _make_item(db, alice.id, "Shirt")
    pants = _make_item(db, alice.id, "Jeans", category="Hose")
    outfit = Outfit(
        name="Casual",
        created_at="2026-09-03T00:00:00+00:00",
        owner_id=alice.id,
        items=[shirt, pants],
    )
    db.add(outfit)
    db.commit()
    db.close()

    response = client.get("/api/account/data", headers=_auth_headers(alice.id))

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["username"] == "alice"
    assert [item["name"] for item in body["items"]] == ["Shirt", "Jeans"]
    assert [outfit["name"] for outfit in body["outfits"]] == ["Casual"]
    assert body["outfits"][0]["item_ids"] == [shirt.id, pants.id]


def test_get_account_data_returns_empty_lists(
    session_factory: SessionFactory, client: TestClient
) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    db.close()

    response = client.get("/api/account/data", headers=_auth_headers(alice.id))

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["username"] == "alice"
    assert body["items"] == []
    assert body["outfits"] == []


def test_get_account_data_returns_only_own_data(
    session_factory: SessionFactory, client: TestClient
) -> None:
    db = session_factory()
    alice = _make_user(db, "alice")
    bob = _make_user(db, "bob")
    alice_item = _make_item(db, alice.id, "AliceShirt")
    _make_item(db, bob.id, "BobShirt")
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
        items=[alice_item],
    )
    db.add_all([alice_outfit, bob_outfit])
    db.commit()
    db.close()

    response = client.get("/api/account/data", headers=_auth_headers(alice.id))

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["username"] == "alice"
    assert [item["name"] for item in body["items"]] == ["AliceShirt"]
    assert [outfit["name"] for outfit in body["outfits"]] == ["Alice Outfit"]


def test_get_account_data_requires_auth(client: TestClient) -> None:
    response = client.get("/api/account/data")
    assert response.status_code == 401
