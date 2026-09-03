from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_all_routers_are_registered() -> None:
    paths = set(app.openapi()["paths"].keys())
    assert "/api/auth/register" in paths
    assert "/api/auth/login" in paths
    assert "/api/auth/account" in paths
    assert "/api/wardrobe/items" in paths
    assert "/api/wardrobe/items/{item_id}" in paths
    assert "/api/outfits" in paths
    assert "/api/outfits/{outfit_id}" in paths


def test_database_schema_is_created_on_startup() -> None:
    from sqlalchemy import inspect

    from app.db import engine

    with TestClient(app):
        tables = set(inspect(engine).get_table_names())
    assert {"users", "clothing_items", "outfits", "outfit_items"} <= tables
