from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.database import engine
from app.main import app


@pytest.fixture(scope="module", autouse=True)
def phase_3_api_records():
    """Temporary fixtures only; no observation or trajectory data is retained."""
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM icebergs WHERE catalog_id LIKE 'API-P3-%'"))
        iceberg_id = connection.execute(text("""
            INSERT INTO icebergs (catalog_id, name, classification, current_position, length_km, width_km,
                area_sq_km, drift_speed_kts, drift_direction_deg, risk_level, source, source_type,
                observed_at, data_status, confidence)
            VALUES ('API-P3-ALPHA', 'Phase 3 Alpha', 'Test tabular iceberg',
                ST_SetSRID(ST_MakePoint(-56.2, -63.85), 4326), 82, 28, 2296, 1.4, 325, 'high',
                'test-fixture', 'test', :observed_at, 'demo', 0.8)
            RETURNING id
        """), {"observed_at": datetime(2026, 9, 18, 14, 30, tzinfo=timezone.utc)}).scalar_one()
        connection.execute(text("""
            INSERT INTO icebergs (catalog_id, name, risk_level, data_status)
            VALUES ('API-P3-BRAVO', 'Phase 3 Bravo', 'low', 'provisional')
        """))
        connection.execute(text("""
            INSERT INTO iceberg_observations (iceberg_id, observed_at, position, centroid, source, source_type, data_status, confidence, observation_type)
            VALUES
            (:iceberg_id, '2026-09-17T12:00:00Z', ST_SetSRID(ST_MakePoint(-55.5, -64.35), 4326), ST_SetSRID(ST_MakePoint(-55.5, -64.35), 4326), 'test-fixture', 'test', 'observed', 0.9, 'manual'),
            (:iceberg_id, '2026-09-18T14:30:00Z', ST_SetSRID(ST_MakePoint(-56.2, -63.85), 4326), ST_SetSRID(ST_MakePoint(-56.2, -63.85), 4326), 'test-fixture', 'test', 'demo', 0.8, 'manual')
        """), {"iceberg_id": iceberg_id})
        trajectory_id = connection.execute(text("""
            INSERT INTO trajectories (iceberg_id, trajectory_type, reference_time, source, source_type, data_status, model_name)
            VALUES (:iceberg_id, 'predicted', '2026-09-18T14:30:00Z', 'test-fixture', 'test', 'demo', 'test-only')
            RETURNING id
        """), {"iceberg_id": iceberg_id}).scalar_one()
        connection.execute(text("""
            INSERT INTO trajectory_points (trajectory_id, sequence_number, timestamp, position, uncertainty_radius_km, source, source_type, data_status)
            VALUES
            (:trajectory_id, 0, '2026-09-18T14:30:00Z', ST_SetSRID(ST_MakePoint(-56.2, -63.85), 4326), 3.5, 'test-fixture', 'test', 'demo'),
            (:trajectory_id, 1, '2026-09-19T12:00:00Z', ST_SetSRID(ST_MakePoint(-57.1, -63.3), 4326), 7.0, 'test-fixture', 'test', 'demo')
        """), {"trajectory_id": trajectory_id})
    yield
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM icebergs WHERE catalog_id LIKE 'API-P3-%'"))


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_list_icebergs_supports_pagination_and_filters(client: TestClient) -> None:
    response = client.get("/api/v1/icebergs", params={"risk_level": "high", "limit": 250, "offset": 0})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    alpha = next(item for item in body["items"] if item["id"] == "API-P3-ALPHA")
    assert alpha["currentPos"] == {"lat": -63.85, "lon": -56.2}
    assert alpha["provenance"]["dataStatus"] == "demo"


def test_iceberg_detail_is_frontend_shaped(client: TestClient) -> None:
    response = client.get("/api/v1/icebergs/API-P3-ALPHA")

    assert response.status_code == 200
    body = response.json()
    assert body["dimensionsKm"] == {"length": 82.0, "width": 28.0, "heightAboveWaterM": None}
    assert body["driftSpeedKts"] == 1.4
    assert body["provenance"]["source"] == "test-fixture"


def test_missing_and_invalid_iceberg_identifiers_are_rejected(client: TestClient) -> None:
    assert client.get("/api/v1/icebergs/UNKNOWN-999").status_code == 404
    assert client.get("/api/v1/icebergs/not%20valid").status_code == 422


def test_observation_history_supports_temporal_filtering(client: TestClient) -> None:
    response = client.get("/api/v1/icebergs/API-P3-ALPHA/history", params={"observed_from": "2026-09-18T00:00:00Z"})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["observedAt"].startswith("2026-09-18T14:30:00")
    assert body["items"][0]["provenance"]["dataStatus"] == "demo"


def test_trajectory_response_contains_points_uncertainty_and_status(client: TestClient) -> None:
    response = client.get("/api/v1/icebergs/API-P3-ALPHA/trajectory", params={"trajectory_type": "predicted"})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    trajectory = body["items"][0]
    assert trajectory["trajectoryType"] == "predicted"
    assert trajectory["provenance"]["dataStatus"] == "demo"
    assert trajectory["points"][1]["uncertaintyRadiusKm"] == 7.0


def test_invalid_query_parameters_return_422(client: TestClient) -> None:
    assert client.get("/api/v1/icebergs", params={"risk_level": "critical"}).status_code == 422
    assert client.get("/api/v1/icebergs", params={"min_lat": -60, "max_lat": -70}).status_code == 422
    assert client.get("/api/v1/icebergs/API-P3-ALPHA/trajectory", params={"trajectory_type": "ml"}).status_code == 422
