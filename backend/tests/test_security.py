import pytest

from app.config import Settings


def test_jwt_secret_requires_environment(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    fresh_settings = Settings()

    with pytest.raises(RuntimeError):
        _ = fresh_settings.jwt_secret
