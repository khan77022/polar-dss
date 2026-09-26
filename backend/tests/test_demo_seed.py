from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.seed.demo_data import DEMO_SOURCE, reset_demo_data, seed_demo_data


def _seed() -> dict[str, int]:
    with SessionLocal.begin() as session:
        return seed_demo_data(session)


def _reset() -> None:
    with SessionLocal.begin() as session:
        reset_demo_data(session)


def test_demo_seed_is_repeatable_and_retrievable() -> None:
    _reset()
    try:
        first_counts = _seed()
        second_counts = _seed()

        assert first_counts == second_counts == {
            "icebergs": 3,
            "iceberg_observations": 9,
            "trajectories": 6,
            "trajectory_points": 18,
        }
        with TestClient(app) as client:
            iceberg = client.get("/api/v1/icebergs/A68A")
            history = client.get("/api/v1/icebergs/A68A/history")
            trajectory = client.get("/api/v1/icebergs/A68A/trajectory", params={"trajectory_type": "predicted"})

        assert iceberg.status_code == history.status_code == trajectory.status_code == 200
        assert iceberg.json()["provenance"]["source"] == DEMO_SOURCE
        assert iceberg.json()["provenance"]["dataStatus"] == "demo"
        assert all(item["provenance"]["dataStatus"] == "demo" for item in history.json()["items"])
        assert trajectory.json()["items"][0]["trajectoryType"] == "predicted"
        assert trajectory.json()["items"][0]["provenance"]["dataStatus"] == "demo"
    finally:
        _reset()
