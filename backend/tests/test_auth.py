import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.db import Base, get_db
from app.main import app
from app.routers import auth


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "_jwt_secret", "test-secret-key-not-a-real-secret")

    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    auth.reset_rate_limits()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _register(client, username, email, password="secret123"):
    return client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )


def test_register_creates_user_and_returns_token(client):
    response = _register(client, "marilyn", "marilyn@example.com")
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_returns_token_for_valid_credentials(client):
    _register(client, "grace", "grace@example.com")
    response = client.post(
        "/api/auth/login",
        json={"username": "grace", "password": "secret123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_rejects_wrong_password(client):
    _register(client, "audrey", "audrey@example.com")
    response = client.post(
        "/api/auth/login",
        json={"username": "audrey", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_credentials"


def test_login_rejects_unknown_user(client):
    response = client.post(
        "/api/auth/login",
        json={"username": "nobody", "password": "whatever123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_credentials"


def test_register_validates_email_format(client):
    response = _register(client, "bogart", "not-an-email")
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "invalid_email"


def test_register_validates_password_length(client):
    response = _register(client, "bogart", "bogart@example.com", password="short")
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "password_too_short"


def test_register_rejects_duplicate_username(client):
    payload = {"username": "dup", "email": "dup@example.com", "password": "secret123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "already_exists"


def test_rate_limit_returns_429_after_five_requests(client):
    for _ in range(5):
        response = client.post(
            "/api/auth/login",
            json={"username": "x", "password": "wrongwrong"},
        )
        assert response.status_code == 401
    response = client.post(
        "/api/auth/login",
        json={"username": "x", "password": "wrongwrong"},
    )
    assert response.status_code == 429
    assert response.json()["detail"]["code"] == "rate_limited"
