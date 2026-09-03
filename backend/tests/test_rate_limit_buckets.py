import pytest
from fastapi import HTTPException

from app.routers import auth


class _FakeRequest:
    def __init__(self, host: str) -> None:
        self.client = type("_Client", (), {"host": host})()


def _clock(monkeypatch, start: float = 1_000_000.0):
    state = {"now": start}
    monkeypatch.setattr(auth.time, "monotonic", lambda: state["now"])
    return state


def test_rate_buckets_do_not_grow_unbounded_across_ips(monkeypatch):
    auth.reset_rate_limits()
    clock = _clock(monkeypatch)

    for i in range(1000):
        auth._enforce_rate_limit(_FakeRequest(f"10.{i // 256}.{i % 256}.1"))

    assert len(auth._rate_buckets) == 1000

    clock["now"] += auth._RATE_LIMIT_WINDOW_SECONDS + 1

    auth._enforce_rate_limit(_FakeRequest("10.9.9.9"))

    assert len(auth._rate_buckets) == 1


def test_rate_limit_still_enforced_after_expired_buckets_are_pruned(monkeypatch):
    auth.reset_rate_limits()
    clock = _clock(monkeypatch)
    req = _FakeRequest("10.1.1.1")

    for _ in range(5):
        auth._enforce_rate_limit(req)
    with pytest.raises(HTTPException) as exc:
        auth._enforce_rate_limit(req)
    assert exc.value.status_code == 429

    clock["now"] += auth._RATE_LIMIT_WINDOW_SECONDS + 1

    for _ in range(5):
        auth._enforce_rate_limit(req)
    with pytest.raises(HTTPException) as exc:
        auth._enforce_rate_limit(req)
    assert exc.value.status_code == 429
