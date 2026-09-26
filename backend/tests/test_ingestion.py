from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select

from app.core.database import SessionLocal
from app.main import app
from app.models.iceberg import Iceberg, IcebergObservation
from app.models.ingestion import IngestionLineage, IngestionRecord, IngestionRun, IngestionSource
from app.services.ingestion import IngestionService, NormalizedObservation, validate_observation


def payload(catalog_id: str, record_id: str = "synthetic-record-1", **changes):
    values = dict(source_product_id="synthetic-product-v1", source_record_id=record_id, iceberg_catalog_id=catalog_id, observed_at=datetime.now(timezone.utc) - timedelta(hours=1), latitude=-70.25, longitude=20.5, data_status="demo", processing_version="ingestion-test-v1", confidence=0.6, length_km=1.0)
    values.update(changes)
    return NormalizedObservation(**values)


@pytest.fixture
def fixture_data():
    key = uuid4().hex
    with SessionLocal.begin() as db:
        source = IngestionSource(name="polar-dss-ingestion-test", source_type="synthetic_test", product_id=f"product-{key}", version="test-v1", description="Synthetic test fixture only", active=True, metadata_json={"synthetic": True})
        iceberg = Iceberg(catalog_id=f"INGEST-{key}", name="Synthetic ingestion test iceberg", source="polar-dss-ingestion-test", source_type="synthetic_test", data_status="demo")
        db.add_all([source, iceberg]); db.flush(); source_id, catalog_id = source.id, iceberg.catalog_id
    try: yield source_id, catalog_id
    finally:
        with SessionLocal.begin() as db:
            run_ids = db.scalars(select(IngestionRun.id).where(IngestionRun.source_id == source_id)).all()
            db.execute(delete(IngestionRecord).where(IngestionRecord.source_id == source_id)); db.execute(delete(IngestionLineage).where(IngestionLineage.source_id == source_id)); db.execute(delete(IngestionRun).where(IngestionRun.source_id == source_id)); db.execute(delete(IcebergObservation).where(IcebergObservation.source == "polar-dss-ingestion-test")); db.execute(delete(IngestionSource).where(IngestionSource.id == source_id)); db.execute(delete(Iceberg).where(Iceberg.catalog_id == catalog_id))


def test_validation_rejects_bad_generic_values(fixture_data):
    _, catalog = fixture_data
    assert "latitude must be between -90 and 90" in validate_observation(payload(catalog, latitude=100))
    assert "geometry_wkt must be a valid POINT geometry" in validate_observation(payload(catalog, geometry_wkt="LINESTRING(0 0, 1 1)"))
    assert "observed_at must be timezone-aware" in validate_observation(payload(catalog, observed_at=datetime.now()))
    assert "length_km cannot be negative" in validate_observation(payload(catalog, length_km=-1))
    assert "confidence must be between 0 and 1" in validate_observation(payload(catalog, confidence=2))


def test_ingestion_lifecycle_dedup_provenance_and_dry_run(fixture_data):
    source_id, catalog = fixture_data
    with SessionLocal() as db:
        source = db.get(IngestionSource, source_id); service = IngestionService(db)
        accepted = service.ingest_observations(source, [payload(catalog)], processing_version="runner-v1")
        assert accepted.run.status == "completed" and accepted.accepted == 1
        lineage = db.scalar(select(IngestionLineage).where(IngestionLineage.ingestion_run_id == accepted.run.id))
        assert lineage.data_status == "demo" and lineage.processing_version == "ingestion-test-v1" and lineage.observed_at is not None
        duplicate = service.ingest_observations(source, [payload(catalog)], processing_version="runner-v1")
        assert duplicate.run.status == "completed" and duplicate.duplicates == 1
        before = db.scalar(select(func.count()).select_from(IcebergObservation).where(IcebergObservation.source == source.name))
        dry = service.ingest_observations(source, [payload(catalog, "dry-run-record")], dry_run=True)
        after = db.scalar(select(func.count()).select_from(IcebergObservation).where(IcebergObservation.source == source.name))
        assert dry.run.status == "completed" and dry.run.dry_run and dry.accepted == 1 and before == after
        rejected = service.ingest_observations(source, [payload(catalog, "bad-coordinate", latitude=100)])
        assert rejected.run.status == "completed_with_errors" and rejected.rejected == 1


def test_persistence_failure_is_recorded_as_failed_run(fixture_data):
    source_id, catalog = fixture_data
    with SessionLocal() as db:
        source = db.get(IngestionSource, source_id)
        with pytest.raises(Exception):
            IngestionService(db).ingest_observations(source, [payload(catalog, "malformed-wkt", geometry_wkt="POINT(not-a-number)")])
        failed = db.scalar(select(IngestionRun).where(IngestionRun.source_id == source_id).order_by(IngestionRun.started_at.desc()))
        assert failed.status == "failed" and failed.completed_at is not None and failed.error_summary


def test_ingestion_observability_api_and_invalid_parameters(fixture_data):
    source_id, catalog = fixture_data
    with SessionLocal() as db:
        source = db.get(IngestionSource, source_id); IngestionService(db).ingest_observations(source, [payload(catalog)])
    with TestClient(app) as client:
        sources = client.get("/api/v1/ingestion/sources?source_type=synthetic_test")
        assert sources.status_code == 200 and any(x["id"] == str(source_id) and x["metadata"]["synthetic"] for x in sources.json())
        runs = client.get(f"/api/v1/ingestion/runs?source_id={source_id}&limit=1")
        assert runs.status_code == 200 and len(runs.json()["items"]) == 1
        run_id = runs.json()["items"][0]["id"]
        assert client.get(f"/api/v1/ingestion/runs/{run_id}").status_code == 200
        assert client.get("/api/v1/ingestion/runs/not-a-uuid").status_code == 422
        assert client.get("/api/v1/ingestion/runs?limit=0").status_code == 422
