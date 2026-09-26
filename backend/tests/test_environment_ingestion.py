from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.core.database import SessionLocal
from app.main import app
from app.models.ingestion import IngestionLineage, IngestionRecord, IngestionRun, IngestionSource
from app.models.operations import OceanRecord, SeaIceRecord, WeatherRecord
from app.services.environment import OceanPayload, OceanSourceAdapter, SeaIcePayload, SeaIceSourceAdapter, WeatherPayload, WeatherSourceAdapter
from app.services.ingestion import IngestionService


def payloads(now):
    base = dict(product_id="synthetic-environment-product", valid_at=now, latitude=-70.0, longitude=15.0, observed_at=now, data_status="demo", processing_version="environment-test-v1")
    return (
        SeaIcePayload(record_id="ice-1", footprint_wkt="POLYGON((14.9 -70.1,15.1 -70.1,15.1 -69.9,14.9 -69.9,14.9 -70.1))", concentration_percent=50, **base),
        WeatherPayload(record_id="weather-1", wind_speed_kts=10, pressure_hpa=990, **base),
        OceanPayload(record_id="ocean-1", current_u_ms=1, current_v_ms=0, **base),
    )


def test_environment_adapters_preserve_supported_fields():
    now = datetime.now(timezone.utc) - timedelta(hours=1); sea, weather, ocean = payloads(now)
    normalized_sea = SeaIceSourceAdapter().normalize(sea)
    assert normalized_sea.geometry_wkt.startswith("MULTIPOLYGON") and normalized_sea.values["thickness_m"] is None
    assert WeatherSourceAdapter().normalize(weather).values["wind_speed_kts"] == 10
    normalized_ocean = OceanSourceAdapter().normalize(ocean)
    assert normalized_ocean.values["current_speed_ms"] == 1 and normalized_ocean.metadata["currentVectorMs"] == {"u": 1, "v": 0}


def test_environment_ingestion_dedup_alignment_and_context_api():
    key = uuid4().hex; now = datetime.now(timezone.utc) - timedelta(hours=1)
    with SessionLocal.begin() as db:
        source = IngestionSource(name="polar-dss-environment-test", source_type="synthetic_environment_test", product_id=f"environment-{key}", version="test-v1", metadata_json={"synthetic": True})
        db.add(source); db.flush(); source_id = source.id
    try:
        sea, weather, ocean = payloads(now)
        # A second time-offset weather record proves evidence is listed, not interpolated.
        weather_later = WeatherPayload(product_id=weather.product_id, record_id="weather-2", valid_at=now + timedelta(hours=2), latitude=-70.0, longitude=15.0, observed_at=now + timedelta(hours=2), data_status="forecast", record_type="forecast", wind_speed_kts=12)
        normalized = [SeaIceSourceAdapter().normalize(sea), WeatherSourceAdapter().normalize(weather), OceanSourceAdapter().normalize(ocean), WeatherSourceAdapter().normalize(weather_later)]
        with SessionLocal() as db:
            source = db.get(IngestionSource, source_id); service = IngestionService(db)
            accepted = service.ingest_environmental(source, normalized, processing_version="runner-v1")
            assert accepted.accepted == 4 and accepted.run.status == "completed"
            assert service.ingest_environmental(source, normalized).duplicates == 4
            assert db.scalar(select(SeaIceRecord).where(SeaIceRecord.source_id == "ice-1")).data_status == "demo"
            assert db.scalar(select(WeatherRecord).where(WeatherRecord.source_id == "weather-1")).processing_version == "environment-test-v1"
            assert db.scalar(select(OceanRecord).where(OceanRecord.source_id == "ocean-1")).metadata_json["currentVectorMs"]["u"] == 1
            assert db.scalar(select(IngestionLineage).where(IngestionLineage.domain_type == "weather_record")).ingestion_run_id == accepted.run.id
        with TestClient(app) as client:
            response = client.get("/api/v1/environment/context", params={"latitude": -70, "longitude": 15, "timestamp": now.isoformat(), "spatial_radius_km": 20, "temporal_window_hours": 4})
            assert response.status_code == 200
            data = response.json(); assert len(data["weather"]["items"]) == 2 and data["weather"]["availability"] == "available"
            assert data["ocean"]["items"][0]["spatialDistanceKm"] == 0 and data["weather"]["items"][1]["dataStatus"] == "forecast"
            absent = client.get("/api/v1/environment/context", params={"latitude": -20, "longitude": 15, "timestamp": now.isoformat(), "spatial_radius_km": 1, "temporal_window_hours": 1}).json()
            assert absent["weather"]["availability"] == "no_matching_record"
            assert client.get("/api/v1/environment/context?latitude=0&longitude=0&timestamp=not-a-time").status_code == 422
    finally:
        with SessionLocal.begin() as db:
            db.execute(delete(IngestionRecord).where(IngestionRecord.source_id == source_id)); db.execute(delete(IngestionLineage).where(IngestionLineage.source_id == source_id)); db.execute(delete(IngestionRun).where(IngestionRun.source_id == source_id)); db.execute(delete(SeaIceRecord).where(SeaIceRecord.source == "polar-dss-environment-test")); db.execute(delete(WeatherRecord).where(WeatherRecord.source == "polar-dss-environment-test")); db.execute(delete(OceanRecord).where(OceanRecord.source == "polar-dss-environment-test")); db.execute(delete(IngestionSource).where(IngestionSource.id == source_id))


def test_invalid_environmental_payload_is_recorded():
    key = uuid4().hex
    with SessionLocal.begin() as db:
        source = IngestionSource(name="polar-dss-environment-test", source_type="synthetic_environment_test", product_id=f"invalid-{key}", version="test-v1"); db.add(source); db.flush(); source_id = source.id
    try:
        invalid = WeatherSourceAdapter().normalize(WeatherPayload(product_id="", record_id="", valid_at=None, latitude=100, longitude=0, wind_speed_kts=-1, confidence=2))
        with SessionLocal() as db:
            result = IngestionService(db).ingest_environmental(db.get(IngestionSource, source_id), [invalid])
            assert result.rejected == 1 and result.run.status == "completed_with_errors"
            audit = db.scalar(select(IngestionRecord).where(IngestionRecord.ingestion_run_id == result.run.id)); assert audit.outcome == "rejected" and audit.validation_errors
    finally:
        with SessionLocal.begin() as db:
            db.execute(delete(IngestionRecord).where(IngestionRecord.source_id == source_id)); db.execute(delete(IngestionLineage).where(IngestionLineage.source_id == source_id)); db.execute(delete(IngestionRun).where(IngestionRun.source_id == source_id)); db.execute(delete(IngestionSource).where(IngestionSource.id == source_id))
