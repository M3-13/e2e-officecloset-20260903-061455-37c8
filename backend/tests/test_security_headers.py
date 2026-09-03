import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import _parse_origins, _validate_origins, app

CSP_VALUE = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; "
    "base-uri 'self'; form-action 'self'"
)


def test_parse_origins_splits_and_strips() -> None:
    assert _parse_origins(" http://localhost:5173 , https://example.com ") == [
        "http://localhost:5173",
        "https://example.com",
    ]
    assert _parse_origins("") == []


def test_validate_origins_rejects_wildcard() -> None:
    with pytest.raises(RuntimeError, match="wildcard"):
        _validate_origins(["*"])
    with pytest.raises(RuntimeError, match="wildcard"):
        _validate_origins(["http://localhost:5173", "*"])


def test_validate_origins_accepts_explicit_origins() -> None:
    _validate_origins(["http://localhost:5173", "https://example.com"])
    _validate_origins([])


def test_app_refuses_to_start_with_wildcard_origin() -> None:
    backend_dir = Path(__file__).resolve().parent.parent
    env = {**os.environ, "FRONTEND_ORIGIN": "*"}
    result = subprocess.run(
        [sys.executable, "-c", "import app.main"],
        capture_output=True,
        text=True,
        cwd=str(backend_dir),
        env=env,
        check=False,
    )
    assert result.returncode != 0
    assert "wildcard" in result.stderr


def test_security_headers_are_set_on_responses() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert response.headers["Content-Security-Policy"] == CSP_VALUE


def test_security_headers_apply_to_not_found_responses() -> None:
    with TestClient(app) as client:
        response = client.get("/definitely-not-a-route")
    assert response.status_code == 404
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_hsts_header_absent_by_default() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert "Strict-Transport-Security" not in response.headers


def test_hsts_header_present_when_https_enforced(monkeypatch) -> None:
    monkeypatch.setenv("HTTPS_ENFORCED", "true")
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"


def test_cors_echoes_explicit_origin_and_never_wildcard() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert response.headers["Access-Control-Allow-Credentials"] == "true"
    assert response.headers["Access-Control-Allow-Origin"] != "*"
