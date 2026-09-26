"""Sentinel-1 SAR-derived observation adapter.

This module intentionally accepts already-derived detections.  It never reads
raw SAR pixels, segments imagery, or assigns iceberg identities by proximity.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.services.ingestion import IngestionResult, IngestionService, NormalizedObservation
from app.models.ingestion import IngestionSource


def _multipolygon(wkt: str) -> str:
    value = wkt.strip()
    upper = value.upper()
    if upper.startswith("MULTIPOLYGON"):
        return value
    if upper.startswith("POLYGON"):
        # A polygon is represented losslessly inside the model's MULTIPOLYGON contract.
        return "MULTIPOLYGON(" + value[len("POLYGON"): ] + ")"
    return value


@dataclass(frozen=True)
class Sentinel1SarPayload:
    product_id: str
    record_id: str
    acquisition_time: datetime | None
    latitude: float
    longitude: float
    footprint_wkt: str
    platform: str
    iceberg_catalog_id: str | None = None
    polarization: str | None = None
    acquisition_mode: str | None = None
    orbit_identifier: str | None = None
    product_type: str | None = None
    processing_version: str | None = None
    data_status: str = "provisional"
    confidence: float | None = None
    length_km: float | None = None
    width_km: float | None = None
    area_sq_km: float | None = None
    orientation_deg: float | None = None
    shape_metadata: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


class Sentinel1Adapter:
    """Maps a provider-neutral SAR detection contract to common ingestion input."""
    def normalize(self, payload: Sentinel1SarPayload) -> NormalizedObservation:
        sar = {"platform": payload.platform, "polarization": payload.polarization, "acquisitionMode": payload.acquisition_mode, "orbitIdentifier": payload.orbit_identifier, "productType": payload.product_type, "acquisitionTime": payload.acquisition_time.isoformat() if payload.acquisition_time else None}
        metadata = {**(payload.metadata or {}), "sar": {key: value for key, value in sar.items() if value is not None}}
        shape = dict(payload.shape_metadata or {})
        if payload.orientation_deg is not None: shape["orientation_deg"] = payload.orientation_deg
        return NormalizedObservation(source_product_id=payload.product_id, source_record_id=payload.record_id, iceberg_catalog_id=payload.iceberg_catalog_id, observed_at=payload.acquisition_time, latitude=payload.latitude, longitude=payload.longitude, data_status=payload.data_status, processing_version=payload.processing_version, confidence=payload.confidence, length_km=payload.length_km, width_km=payload.width_km, area_sq_km=payload.area_sq_km, orientation_deg=payload.orientation_deg, footprint_wkt=_multipolygon(payload.footprint_wkt), shape_metadata=shape, observation_type="sar_derived", metadata=metadata)


class Sentinel1IngestionService:
    """Thin SAR adapter that delegates lifecycle, validation, lineage, and deduplication."""
    def __init__(self, ingestion: IngestionService): self.ingestion = ingestion; self.adapter = Sentinel1Adapter()

    def ingest(self, source: IngestionSource, payloads: list[Sentinel1SarPayload], *, dry_run: bool = False, processing_version: str | None = None) -> IngestionResult:
        return self.ingestion.ingest_observations(source, [self.adapter.normalize(payload) for payload in payloads], dry_run=dry_run, processing_version=processing_version, configuration={"adapter": "sentinel1_sar", "sourceDerived": True}, allow_unresolved_identity=True)
