from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.core.database import SessionLocal
from app.main import app
from app.models.iceberg import IcebergObservation, Trajectory, TrajectoryPoint
from app.models.ingestion import IngestionLineage, IngestionRecord, IngestionRun, IngestionSource
from app.models.intelligence import BehaviorProfile
from app.seed.demo_data import reset_demo_data, seed_demo_data
from app.seed.intelligence_demo_data import reset as reset_intelligence, seed as seed_intelligence
from app.seed.navigation_demo_data import reset as reset_navigation, seed as seed_navigation
from app.seed.operational_demo_data import reset as reset_operational, seed as seed_operational
from scripts.dummy_ml_provider import submit as submit_ml
from scripts.dummy_sar_provider import RECORD_ID, SOURCE as SAR_SOURCE, submit as submit_sar


def _cleanup_external(session):
    source_ids = session.scalars(select(IngestionSource.id).where(IngestionSource.name.in_([SAR_SOURCE, "dummy-ml-e2e"]))).all()
    session.execute(delete(IngestionRecord).where(IngestionRecord.source_id.in_(source_ids)))
    session.execute(delete(IngestionLineage).where(IngestionLineage.source_id.in_(source_ids)))
    session.execute(delete(IngestionRun).where(IngestionRun.source_id.in_(source_ids)))
    session.execute(delete(TrajectoryPoint).where(TrajectoryPoint.source == "dummy-ml-e2e"))
    session.execute(delete(Trajectory).where(Trajectory.source == "dummy-ml-e2e"))
    session.execute(delete(BehaviorProfile).where(BehaviorProfile.source == "dummy-ml-e2e"))
    session.execute(delete(IcebergObservation).where(IcebergObservation.source == SAR_SOURCE))
    session.execute(delete(IngestionSource).where(IngestionSource.id.in_(source_ids)))


def test_complete_synthetic_demo_chain_preserves_status_and_provenance():
    with SessionLocal.begin() as db:
        _cleanup_external(db); reset_demo_data(db); reset_operational(db); reset_navigation(db); reset_intelligence(db)
        seed_demo_data(db); seed_operational(db); seed_navigation(db); seed_intelligence(db)
    try:
        with SessionLocal() as db:
            first = submit_sar(db)
            second = submit_sar(db)
            assert first.accepted == 1 and second.duplicates == 1
        with TestClient(app) as client:
            assert client.get("/api/v1/health").status_code == 200
            history = client.get("/api/v1/icebergs/A68A/history").json()
            sar = next(item for item in history["items"] if item["provenance"]["sourceId"] == RECORD_ID)
            assert sar["hasFootprint"] and sar["provenance"]["sourceType"] == "synthetic_sar" and sar["provenance"]["dataStatus"] == "demo"
            trajectory, behavior = submit_ml(client)
            assert trajectory.status_code == behavior.status_code == 200
            assert submit_ml(client)[0].status_code == 409
            predicted = client.get("/api/v1/icebergs/A68A/trajectory", params={"trajectory_type": "predicted"}).json()
            dummy_trajectory = next(item for item in predicted["items"] if item["provenance"]["source"] == "dummy-ml-e2e")
            assert dummy_trajectory["provenance"]["dataStatus"] == "predicted"
            profile = client.get("/api/v1/icebergs/A68A/behavior").json()
            assert profile["behaviorClass"] == "current-dominated" and profile["provenance"]["dataStatus"] == "predicted"
            assert client.get("/api/v1/environment/context", params={"latitude": -63.85, "longitude": -56.2, "timestamp": "2026-09-18T14:30:00Z"}).status_code == 200
            assert client.get("/api/v1/vessels/current").status_code == client.get("/api/v1/routes").status_code == client.get("/api/v1/alerts").status_code == 200
            risk = client.post("/api/v1/risk/assess", json={"routeId": "DEMO-ROUTE-1", "vesselId": "DEMO-CURRENT"}).json()
            assert risk["provenance"]["dataStatus"] == "provisional"
            assert client.post("/api/v1/reports/passage-briefing", json={"routeId": "DEMO-ROUTE-1"}).status_code == 200
            assert client.get("/api/v1/dashboard/summary").status_code == client.post("/api/v1/chat", json={"message": "What is predicted for A68A?"}).status_code == 200
    finally:
        with SessionLocal.begin() as db:
            _cleanup_external(db); reset_intelligence(db); reset_navigation(db); reset_operational(db); reset_demo_data(db)
