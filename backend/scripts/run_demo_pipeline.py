"""Run the deterministic, local POLAR-DSS integration demonstration.

Usage: ``python -m scripts.run_demo_pipeline`` from ``backend``.  The runner
uses the same ASGI public API contracts as a local frontend, while the SAR
fixture uses the existing provider adapter boundary by design.
"""
from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.core.database import SessionLocal
from app.main import app
from app.models.iceberg import IcebergObservation, Trajectory, TrajectoryPoint
from app.models.ingestion import IngestionLineage, IngestionRecord, IngestionRun, IngestionSource
from app.models.intelligence import BehaviorProfile
from app.models.navigation import RiskAssessment
from app.models.application import DSSReport
from app.seed.demo_data import seed_demo_data
from app.seed.intelligence_demo_data import seed as seed_intelligence
from app.seed.navigation_demo_data import seed as seed_navigation
from app.seed.operational_demo_data import seed as seed_operational
from app.seed.emergency_demo_data import seed as seed_emergency
from scripts.dummy_ml_provider import submit as submit_ml
from scripts.dummy_sar_provider import RECORD_ID, submit as submit_sar


def check(label: str, condition: bool) -> None:
    if not condition:
        raise RuntimeError(f"[FAIL] {label}")
    print(f"[PASS] {label}")


def reset_external_fixtures(session) -> None:
    """Remove only this scenario's derived outputs before rebuilding A68A."""
    names = ("dummy-sentinel-1-e2e", "dummy-ml-e2e")
    source_ids = session.scalars(select(IngestionSource.id).where(IngestionSource.name.in_(names))).all()
    session.execute(delete(IngestionRecord).where(IngestionRecord.source_id.in_(source_ids)))
    session.execute(delete(IngestionLineage).where(IngestionLineage.source_id.in_(source_ids)))
    session.execute(delete(TrajectoryPoint).where(TrajectoryPoint.source == "dummy-ml-e2e"))
    session.execute(delete(Trajectory).where(Trajectory.source == "dummy-ml-e2e"))
    session.execute(delete(BehaviorProfile).where(BehaviorProfile.source == "dummy-ml-e2e"))
    session.execute(delete(IcebergObservation).where(IcebergObservation.source == "dummy-sentinel-1-e2e"))
    session.execute(delete(IngestionRun).where(IngestionRun.source_id.in_(source_ids)))
    session.execute(delete(IngestionSource).where(IngestionSource.id.in_(source_ids)))


def main() -> None:
    print("=" * 60 + "\nPOLAR-DSS END-TO-END DEMO\n" + "=" * 60)
    with SessionLocal.begin() as session:
        reset_external_fixtures(session)
        seed_demo_data(session)
        seed_operational(session)
        seed_emergency(session)
        seed_navigation(session)
        seed_intelligence(session)
    with SessionLocal() as session:
        sar = submit_sar(session)
        check("Dummy SAR provider / common ingestion contract", sar.accepted == 1 or sar.duplicates == 1)
        observation = session.scalar(select(IcebergObservation).where(IcebergObservation.source_id == RECORD_ID))
        check("SAR observation is persisted as synthetic demo data", observation is not None and observation.data_status == "demo")
    with SessionLocal() as session:
        risk_exists = any((row.metadata_json or {}).get("routeId") == "DEMO-ROUTE-1" and (row.metadata_json or {}).get("vesselId") == "DEMO-CURRENT" for row in session.scalars(select(RiskAssessment).where(RiskAssessment.source == "risk-foundation")).all())
        report_exists = any((row.metadata_json or {}).get("requestedRouteId") == "DEMO-ROUTE-1" for row in session.scalars(select(DSSReport).where(DSSReport.source == "dss-report-service")).all())
    with TestClient(app) as client:
        check("Health endpoint", client.get("/api/v1/health").status_code == 200)
        check("Iceberg history and SAR provenance", any(
            item["provenance"]["sourceId"] == RECORD_ID and item["provenance"]["dataStatus"] == "demo"
            for item in client.get("/api/v1/icebergs/A68A/history").json()["items"]
        ))
        trajectory, behavior = submit_ml(client)
        check("Dummy ML trajectory external contract", trajectory.status_code in (200, 409))
        check("Dummy ML behavior external contract", behavior.status_code in (200, 409))
        predicted = client.get("/api/v1/icebergs/A68A/trajectory", params={"trajectory_type": "predicted"})
        check("Predicted trajectory remains predicted", any(
            item["provenance"]["source"] == "dummy-ml-e2e" and item["provenance"]["dataStatus"] == "predicted"
            for item in predicted.json()["items"]
        ))
        profile = client.get("/api/v1/icebergs/A68A/behavior")
        check("Predicted behavior profile remains predicted", profile.status_code == 200 and profile.json()["provenance"]["dataStatus"] == "predicted")
        for endpoint in ("/api/v1/environment/context?latitude=-63.85&longitude=-56.2&timestamp=2026-09-18T14:30:00Z", "/api/v1/vessels/current", "/api/v1/routes", "/api/v1/alerts", "/api/v1/dashboard/summary", "/api/v1/models"):
            check(f"Frontend contract {endpoint.split('?')[0]}", client.get(endpoint).status_code == 200)
        check("Emergency scenario", client.get("/api/v1/emergencies").status_code == 200 and client.get("/api/v1/emergency-resources").status_code == 200)
        risk = client.get("/api/v1/risk") if risk_exists else client.post("/api/v1/risk/assess", json={"routeId": "DEMO-ROUTE-1", "vesselId": "DEMO-CURRENT"})
        check("Provisional risk assessment", risk.status_code == 200 and risk.json()["provenance"]["dataStatus"] == "provisional")
        report = client.get("/api/v1/dashboard/summary") if report_exists else client.post("/api/v1/reports/passage-briefing", json={"routeId": "DEMO-ROUTE-1"})
        check("Evidence-based passage briefing", report.status_code == 200)
        chat = client.post("/api/v1/chat", json={"message": "What is the status of A68A prediction?"})
        check("Deterministic backend chat", chat.status_code == 200)
    print("=" * 60 + "\nPOLAR-DSS DEMO PIPELINE PASSED\nSynthetic data only; no Sentinel observation, ML inference, or navigation decision.\n" + "=" * 60)


if __name__ == "__main__":
    main()
