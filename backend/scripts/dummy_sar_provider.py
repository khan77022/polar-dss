"""Deterministic, development-only SAR-shaped provider.

This module deliberately supplies an already-derived detection to the normal
Sentinel-1 adapter.  It neither downloads nor processes Sentinel imagery.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ingestion import IngestionSource
from app.services.ingestion import IngestionService, IngestionResult
from app.services.sentinel1 import Sentinel1IngestionService, Sentinel1SarPayload

SCENARIO = "polar-dss-e2e"
SOURCE = "dummy-sentinel-1-e2e"
SOURCE_TYPE = "synthetic_sar"
PRODUCT_ID = "polar-dss-e2e-s1-product-001"
RECORD_ID = "polar-dss-e2e-s1-detection-a68a-001"
PROCESSING_VERSION = "dummy-sar-v1"
OBSERVATION_TIME = datetime(2026, 9, 18, 14, 30, tzinfo=timezone.utc)


def payload() -> Sentinel1SarPayload:
    return Sentinel1SarPayload(
        product_id=PRODUCT_ID, record_id=RECORD_ID, acquisition_time=OBSERVATION_TIME,
        latitude=-63.85, longitude=-56.20,
        footprint_wkt="POLYGON((-56.24 -63.89,-56.16 -63.89,-56.16 -63.81,-56.24 -63.81,-56.24 -63.89))",
        platform="dummy-sentinel-1", iceberg_catalog_id="A68A", polarization="HH",
        acquisition_mode="IW", orbit_identifier="synthetic-orbit-e2e", product_type="synthetic-grd",
        processing_version=PROCESSING_VERSION, data_status="demo", confidence=0.5,
        length_km=82.0, width_km=28.0, area_sq_km=2296.0, orientation_deg=325.0,
        shape_metadata={"shape_type": "synthetic_rectangle", "vertex_count": 5, "scenario": SCENARIO},
        metadata={"scenario": SCENARIO, "synthetic": True,
                  "limitations": "Synthetic SAR-shaped fixture for software integration only; not a Sentinel observation."},
    )


def source_for(session: Session) -> IngestionSource:
    source = session.scalar(select(IngestionSource).where(
        IngestionSource.name == SOURCE, IngestionSource.source_type == SOURCE_TYPE,
        IngestionSource.product_id == PRODUCT_ID, IngestionSource.version == PROCESSING_VERSION,
    ))
    if source:
        return source
    source = IngestionSource(name=SOURCE, source_type=SOURCE_TYPE, product_id=PRODUCT_ID,
        version=PROCESSING_VERSION, description="Development-only synthetic SAR provider.",
        metadata_json={"scenario": SCENARIO, "synthetic": True, "notScientific": True})
    session.add(source)
    session.flush()
    return source


def submit(session: Session) -> IngestionResult:
    """Submit through the production Sentinel adapter/ingestion boundary."""
    return Sentinel1IngestionService(IngestionService(session)).ingest(
        source_for(session), [payload()], processing_version=PROCESSING_VERSION
    )
