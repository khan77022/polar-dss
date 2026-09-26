from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select

from app.core.database import SessionLocal
from app.main import app
from app.models.iceberg import Iceberg, IcebergObservation
from app.models.ingestion import IngestionLineage, IngestionRecord, IngestionRun, IngestionSource
from app.services.ingestion import IngestionService
from app.services.sentinel1 import Sentinel1Adapter, Sentinel1IngestionService, Sentinel1SarPayload


def sar_payload(catalog_id=None, record_id="sar-detection-001", **changes):
    values = dict(product_id="S1A_TEST_PRODUCT", record_id=record_id, acquisition_time=datetime.now(timezone.utc) - timedelta(days=1), latitude=-70.0, longitude=15.0, footprint_wkt="POLYGON((14.9 -70.1,15.1 -70.1,15.1 -69.9,14.9 -69.9,14.9 -70.1))", platform="Sentinel-1A", iceberg_catalog_id=catalog_id, polarization="HH", acquisition_mode="IW", orbit_identifier="test-orbit", product_type="GRD", processing_version="sar-adapter-v1", data_status="demo", length_km=2.0, width_km=1.0, area_sq_km=1.5, orientation_deg=40.0, shape_metadata={"shape_type": "source_polygon", "vertex_count": 5})
    values.update(changes)
    return Sentinel1SarPayload(**values)


def test_sentinel1_adapter_preserves_sar_contract_and_geometry():
    normalized = Sentinel1Adapter().normalize(sar_payload("known"))
    assert normalized.footprint_wkt.startswith("MULTIPOLYGON")
    assert normalized.observation_type == "sar_derived"
    assert normalized.metadata["sar"]["polarization"] == "HH"
    assert normalized.shape_metadata["vertex_count"] == 5


def test_sar_ingestion_association_lineage_geometry_and_history_api():
    key = uuid4().hex
    with SessionLocal.begin() as db:
        source = IngestionSource(name="polar-dss-sar-test", source_type="synthetic_sar_test", product_id=f"sar-product-{key}", version="test-v1", metadata_json={"synthetic": True, "adapter": "sentinel1_sar"})
        iceberg = Iceberg(catalog_id=f"SAR-{key}", name="Synthetic SAR test iceberg", source="polar-dss-sar-test", source_type="synthetic_sar_test", data_status="demo")
        db.add_all([source, iceberg]); db.flush(); source_id, catalog = source.id, iceberg.catalog_id
    try:
        with SessionLocal() as db:
            source = db.get(IngestionSource, source_id); result = Sentinel1IngestionService(IngestionService(db)).ingest(source, [sar_payload(catalog)])
            assert result.accepted == 1 and result.run.status == "completed"
            observation = db.scalar(select(IcebergObservation).where(IcebergObservation.source_id == "sar-detection-001"))
            assert observation.iceberg_id is not None and observation.observation_type == "sar_derived" and observation.data_status == "demo"
            assert db.scalar(select(func.ST_GeometryType(IcebergObservation.footprint)).where(IcebergObservation.id == observation.id)) == "ST_MultiPolygon"
            lineage = db.scalar(select(IngestionLineage).where(IngestionLineage.domain_record_id == observation.id))
            assert lineage.source_product_id == "S1A_TEST_PRODUCT" and lineage.ingestion_run_id == result.run.id
            duplicate = Sentinel1IngestionService(IngestionService(db)).ingest(source, [sar_payload(catalog)])
            assert duplicate.duplicates == 1
            unknown = Sentinel1IngestionService(IngestionService(db)).ingest(source, [sar_payload(None, "unresolved-detection")])
            assert unknown.accepted == 1
            assert db.scalar(select(IcebergObservation.iceberg_id).where(IcebergObservation.source_id == "unresolved-detection")) is None
        with TestClient(app) as client:
            history = client.get(f"/api/v1/icebergs/{catalog}/history")
            assert history.status_code == 200
            item = next(x for x in history.json()["items"] if x["provenance"]["sourceId"] == "sar-detection-001")
            assert item["hasFootprint"] and item["provenance"]["sourceType"] == "synthetic_sar_test" and item["provenance"]["dataStatus"] == "demo"
    finally:
        with SessionLocal.begin() as db:
            db.execute(delete(IngestionRecord).where(IngestionRecord.source_id == source_id)); db.execute(delete(IngestionLineage).where(IngestionLineage.source_id == source_id)); db.execute(delete(IngestionRun).where(IngestionRun.source_id == source_id)); db.execute(delete(IcebergObservation).where(IcebergObservation.source == "polar-dss-sar-test")); db.execute(delete(IngestionSource).where(IngestionSource.id == source_id)); db.execute(delete(Iceberg).where(Iceberg.catalog_id == catalog))


def test_invalid_sar_records_are_audited_without_domain_persistence():
    key = uuid4().hex
    with SessionLocal.begin() as db:
        source = IngestionSource(name="polar-dss-sar-test", source_type="synthetic_sar_test", product_id=f"invalid-{key}", version="test-v1")
        db.add(source); db.flush(); source_id = source.id
    try:
        with SessionLocal() as db:
            source = db.get(IngestionSource, source_id)
            invalid = sar_payload(record_id="", acquisition_time=None, latitude=100, footprint_wkt="LINESTRING(0 0,1 1)", confidence=2, length_km=-1)
            malformed = sar_payload(record_id="bad-geometry", footprint_wkt="MULTIPOLYGON(((0 0,1 1)")
            result = Sentinel1IngestionService(IngestionService(db)).ingest(source, [invalid, malformed])
            assert result.rejected == 2 and result.run.status == "completed_with_errors"
            records = db.scalars(select(IngestionRecord).where(IngestionRecord.ingestion_run_id == result.run.id)).all()
            assert all(record.outcome == "rejected" and record.validation_errors for record in records)
            assert db.scalar(select(func.count()).select_from(IcebergObservation).where(IcebergObservation.source == "polar-dss-sar-test")) == 0
    finally:
        with SessionLocal.begin() as db:
            db.execute(delete(IngestionRecord).where(IngestionRecord.source_id == source_id)); db.execute(delete(IngestionLineage).where(IngestionLineage.source_id == source_id)); db.execute(delete(IngestionRun).where(IngestionRun.source_id == source_id)); db.execute(delete(IngestionSource).where(IngestionSource.id == source_id))
