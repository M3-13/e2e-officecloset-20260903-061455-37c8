import pytest

from app.config import Settings


def test_jwt_secret_requires_environment(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)

    fresh_settings = Settings()

    with pytest.raises(RuntimeError):
        _ = fresh_settings.jwt_secret


def test_jwt_secret_rejects_short_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "x" * 31)

    fresh_settings = Settings()

    with pytest.raises(RuntimeError, match="at least 32"):
        _ = fresh_settings.jwt_secret


def test_jwt_secret_accepts_32_char_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "x" * 32)

    fresh_settings = Settings()

    assert fresh_settings.jwt_secret == "x" * 32
