"""Offline ingestion boundary for future connectors.

Connectors supply normalized payloads to this service; they do not write domain
tables directly.  A successful persistence operation deliberately preserves the
payload's status and never promotes it to ``observed``.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from geoalchemy2 import WKTElement
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.iceberg import Iceberg, IcebergObservation
from app.models.ingestion import IngestionLineage, IngestionRecord, IngestionRun, IngestionSource
from app.models.operations import OceanRecord, SeaIceRecord, WeatherRecord


@dataclass(frozen=True)
class NormalizedObservation:
    source_product_id: str
    source_record_id: str
    iceberg_catalog_id: str | None
    observed_at: datetime | None
    latitude: float
    longitude: float
    data_status: str = "provisional"
    processing_version: str | None = None
    confidence: float | None = None
    length_km: float | None = None
    width_km: float | None = None
    area_sq_km: float | None = None
    orientation_deg: float | None = None
    geometry_wkt: str | None = None
    geometry_type: str = "POINT"
    centroid_wkt: str | None = None
    footprint_wkt: str | None = None
    shape_metadata: dict[str, Any] = field(default_factory=dict)
    observation_type: str = "ingested"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class IngestionResult:
    run: IngestionRun
    accepted: int = 0
    rejected: int = 0
    duplicates: int = 0
    errors: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class NormalizedEnvironmentalRecord:
    domain_type: str
    source_product_id: str
    source_record_id: str
    record_type: str
    valid_at: datetime | None
    latitude: float
    longitude: float
    observed_at: datetime | None = None
    geometry_wkt: str | None = None
    data_status: str = "provisional"
    processing_version: str | None = None
    confidence: float | None = None
    values: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


VALID_STATUSES = {"observed", "forecast", "predicted", "simulated", "demo", "provisional", "invalid"}


def validate_observation(payload: NormalizedObservation, now: datetime | None = None, *, require_catalog_id: bool = True) -> list[str]:
    """Provider-neutral structural validation without asserting scientific truth."""
    errors: list[str] = []
    now = now or datetime.now(timezone.utc)
    if not payload.source_product_id.strip(): errors.append("source_product_id is required")
    if not payload.source_record_id.strip(): errors.append("source_record_id is required")
    if require_catalog_id and (not payload.iceberg_catalog_id or not payload.iceberg_catalog_id.strip()): errors.append("iceberg_catalog_id is required")
    if payload.observed_at is None: errors.append("observed_at is required")
    elif payload.observed_at.tzinfo is None or payload.observed_at.utcoffset() is None: errors.append("observed_at must be timezone-aware")
    elif payload.observed_at > now: errors.append("observed_at cannot be in the future")
    if not -90 <= payload.latitude <= 90: errors.append("latitude must be between -90 and 90")
    if not -180 <= payload.longitude <= 180: errors.append("longitude must be between -180 and 180")
    if payload.geometry_type != "POINT": errors.append("geometry_type must be POINT for iceberg observations")
    if payload.geometry_wkt and not payload.geometry_wkt.upper().startswith("POINT"):
        errors.append("geometry_wkt must be a valid POINT geometry")
    if payload.footprint_wkt and (not payload.footprint_wkt.upper().startswith("MULTIPOLYGON") or payload.footprint_wkt.count("(") != payload.footprint_wkt.count(")")):
        errors.append("footprint_wkt must be a valid MULTIPOLYGON geometry")
    if payload.centroid_wkt and not payload.centroid_wkt.upper().startswith("POINT"):
        errors.append("centroid_wkt must be a valid POINT geometry")
    for name in ("length_km", "width_km", "area_sq_km"):
        value = getattr(payload, name)
        if value is not None and value < 0: errors.append(f"{name} cannot be negative")
    if payload.confidence is not None and not 0 <= payload.confidence <= 1: errors.append("confidence must be between 0 and 1")
    if payload.data_status not in VALID_STATUSES: errors.append("data_status is unsupported")
    return errors


def validate_environmental_record(payload: NormalizedEnvironmentalRecord, now: datetime | None = None) -> list[str]:
    errors: list[str] = []
    now = now or datetime.now(timezone.utc)
    if payload.domain_type not in {"sea_ice_record", "weather_record", "ocean_record"}: errors.append("domain_type is unsupported")
    if payload.record_type not in {"current", "forecast"}: errors.append("record_type is unsupported")
    if not payload.source_product_id.strip(): errors.append("source_product_id is required")
    if not payload.source_record_id.strip(): errors.append("source_record_id is required")
    if payload.valid_at is None: errors.append("valid_at is required")
    elif payload.valid_at.tzinfo is None or payload.valid_at.utcoffset() is None: errors.append("valid_at must be timezone-aware")
    elif payload.record_type == "current" and payload.valid_at > now: errors.append("current valid_at cannot be in the future")
    if payload.observed_at is not None and (payload.observed_at.tzinfo is None or payload.observed_at.utcoffset() is None): errors.append("observed_at must be timezone-aware")
    if not -90 <= payload.latitude <= 90: errors.append("latitude must be between -90 and 90")
    if not -180 <= payload.longitude <= 180: errors.append("longitude must be between -180 and 180")
    if payload.domain_type == "sea_ice_record" and (not payload.geometry_wkt or not payload.geometry_wkt.upper().startswith("MULTIPOLYGON")): errors.append("sea ice geometry must be a MULTIPOLYGON")
    if payload.confidence is not None and not 0 <= payload.confidence <= 1: errors.append("confidence must be between 0 and 1")
    for field_name in ("concentration_percent", "thickness_m", "wind_speed_kts", "visibility_km", "wave_height_m", "wave_period_s", "current_speed_ms"):
        value = payload.values.get(field_name)
        if value is not None and value < 0: errors.append(f"{field_name} cannot be negative")
    if payload.domain_type == "sea_ice_record" and payload.values.get("concentration_percent") is not None and payload.values["concentration_percent"] > 100: errors.append("concentration_percent cannot exceed 100")
    if payload.data_status not in VALID_STATUSES: errors.append("data_status is unsupported")
    return errors


class IngestionService:
    """Normalised payload -> validation -> deduplication -> persistence boundary."""
    def __init__(self, db: Session): self.db = db

    def start_run(self, source: IngestionSource, *, dry_run: bool = False, processing_version: str | None = None, configuration: dict[str, Any] | None = None) -> IngestionRun:
        run = IngestionRun(source_id=source.id, dataset_product_id=source.product_id, dry_run=dry_run, status="running", processing_version=processing_version, configuration_json=configuration)
        # Persist the lifecycle start independently so a later persistence error
        # can be represented as a durable failed run after its work is rolled back.
        self.db.add(run); self.db.commit(); self.db.refresh(run)
        return run

    def ingest_observations(self, source: IngestionSource, payloads: list[NormalizedObservation], *, dry_run: bool = False, processing_version: str | None = None, configuration: dict[str, Any] | None = None, allow_unresolved_identity: bool = False) -> IngestionResult:
        run = self.start_run(source, dry_run=dry_run, processing_version=processing_version, configuration=configuration)
        result = IngestionResult(run=run)
        run.records_discovered = len(payloads)
        try:
            for payload in payloads:
                errors = validate_observation(payload, require_catalog_id=not allow_unresolved_identity)
                if errors:
                    self._audit(run, source, payload, "rejected", errors)
                    result.rejected += 1; result.errors.extend(errors); continue
                existing = self.db.scalar(select(IngestionLineage).where(IngestionLineage.source_id == source.id, IngestionLineage.source_product_id == payload.source_product_id, IngestionLineage.source_record_id == payload.source_record_id, IngestionLineage.domain_type == "iceberg_observation"))
                if existing:
                    self._audit(run, source, payload, "duplicate")
                    result.duplicates += 1; continue
                if dry_run:
                    self._audit(run, source, payload, "dry_run")
                    result.accepted += 1; continue
                iceberg = self.db.scalar(select(Iceberg).where(Iceberg.catalog_id == payload.iceberg_catalog_id)) if payload.iceberg_catalog_id else None
                if payload.iceberg_catalog_id and iceberg is None:
                    msg = f"unknown iceberg catalog_id: {payload.iceberg_catalog_id}"
                    self._audit(run, source, payload, "rejected", [msg])
                    result.rejected += 1; result.errors.append(msg); continue
                observation = IcebergObservation(
                    iceberg_id=iceberg.id if iceberg else None, observed_at=payload.observed_at, position=WKTElement(payload.geometry_wkt or f"POINT({payload.longitude} {payload.latitude})", srid=4326), centroid=WKTElement(payload.centroid_wkt or f"POINT({payload.longitude} {payload.latitude})", srid=4326), footprint=WKTElement(payload.footprint_wkt, srid=4326) if payload.footprint_wkt else None,
                    length_km=payload.length_km, width_km=payload.width_km, area_sq_km=payload.area_sq_km, orientation_deg=payload.orientation_deg,
                    source=source.name, source_id=payload.source_record_id, source_type=source.source_type,
                    processing_version=payload.processing_version or processing_version, data_status=payload.data_status,
                    confidence=payload.confidence, observation_type=payload.observation_type, shape_metadata=payload.shape_metadata or None, metadata_json=payload.metadata,
                )
                self.db.add(observation); self.db.flush()
                self.db.add(IngestionLineage(source_id=source.id, ingestion_run_id=run.id, source_product_id=payload.source_product_id, source_record_id=payload.source_record_id, domain_type="iceberg_observation", domain_record_id=observation.id, observed_at=payload.observed_at, processing_version=payload.processing_version or processing_version, data_status=payload.data_status, metadata_json=payload.metadata))
                self._audit(run, source, payload, "accepted")
                result.accepted += 1
            run.records_accepted, run.records_rejected, run.records_skipped_duplicate = result.accepted, result.rejected, result.duplicates
            run.status = "completed_with_errors" if result.rejected else "completed"
            run.error_summary = "; ".join(result.errors)[:4000] if result.errors else None
            run.completed_at = datetime.now(timezone.utc)
            self.db.commit(); self.db.refresh(run)
            return result
        except Exception as exc:
            self.db.rollback()
            # Recover the run status in a new transaction; payload persistence is rolled back.
            failed = self.db.get(IngestionRun, run.id)
            if failed:
                failed.status, failed.completed_at, failed.error_summary = "failed", datetime.now(timezone.utc), str(exc)[:4000]
                self.db.commit(); self.db.refresh(failed); result.run = failed
            raise

    def _audit(self, run: IngestionRun, source: IngestionSource, payload: NormalizedObservation, outcome: str, errors: list[str] | None = None) -> None:
        self.db.add(IngestionRecord(ingestion_run_id=run.id, source_id=source.id, source_product_id=payload.source_product_id, source_record_id=payload.source_record_id, domain_type="iceberg_observation", outcome=outcome, observed_at=payload.observed_at, processing_version=payload.processing_version or run.processing_version, validation_errors=errors, metadata_json=payload.metadata))

    def ingest_environmental(self, source: IngestionSource, payloads: list[NormalizedEnvironmentalRecord], *, dry_run: bool = False, processing_version: str | None = None) -> IngestionResult:
        run = self.start_run(source, dry_run=dry_run, processing_version=processing_version, configuration={"pipeline": "environmental"})
        result = IngestionResult(run=run); run.records_discovered = len(payloads)
        models = {"sea_ice_record": SeaIceRecord, "weather_record": WeatherRecord, "ocean_record": OceanRecord}
        try:
            for payload in payloads:
                errors = validate_environmental_record(payload)
                if errors:
                    self._audit_environment(run, source, payload, "rejected", errors); result.rejected += 1; result.errors.extend(errors); continue
                existing = self.db.scalar(select(IngestionLineage).where(IngestionLineage.source_id == source.id, IngestionLineage.source_product_id == payload.source_product_id, IngestionLineage.source_record_id == payload.source_record_id, IngestionLineage.domain_type == payload.domain_type))
                if existing:
                    self._audit_environment(run, source, payload, "duplicate"); result.duplicates += 1; continue
                if dry_run:
                    self._audit_environment(run, source, payload, "dry_run"); result.accepted += 1; continue
                common = dict(record_type=payload.record_type, valid_at=payload.valid_at, source=source.name, source_id=payload.source_record_id, source_type=source.source_type, observed_at=payload.observed_at, processing_version=payload.processing_version or processing_version, data_status=payload.data_status, confidence=payload.confidence, metadata_json=payload.metadata)
                if payload.domain_type == "sea_ice_record": row = SeaIceRecord(**common, geometry=WKTElement(payload.geometry_wkt, srid=4326), **payload.values)
                else: row = models[payload.domain_type](**common, position=WKTElement(f"POINT({payload.longitude} {payload.latitude})", srid=4326), **payload.values)
                self.db.add(row); self.db.flush()
                self.db.add(IngestionLineage(source_id=source.id, ingestion_run_id=run.id, source_product_id=payload.source_product_id, source_record_id=payload.source_record_id, domain_type=payload.domain_type, domain_record_id=row.id, observed_at=payload.observed_at or payload.valid_at, processing_version=payload.processing_version or processing_version, data_status=payload.data_status, metadata_json=payload.metadata))
                self._audit_environment(run, source, payload, "accepted"); result.accepted += 1
            run.records_accepted, run.records_rejected, run.records_skipped_duplicate = result.accepted, result.rejected, result.duplicates
            run.status = "completed_with_errors" if result.rejected else "completed"; run.error_summary = "; ".join(result.errors)[:4000] if result.errors else None; run.completed_at = datetime.now(timezone.utc)
            self.db.commit(); self.db.refresh(run); return result
        except Exception as exc:
            self.db.rollback(); failed = self.db.get(IngestionRun, run.id)
            if failed: failed.status, failed.completed_at, failed.error_summary = "failed", datetime.now(timezone.utc), str(exc)[:4000]; self.db.commit(); self.db.refresh(failed); result.run = failed
            raise

    def _audit_environment(self, run: IngestionRun, source: IngestionSource, payload: NormalizedEnvironmentalRecord, outcome: str, errors: list[str] | None = None) -> None:
        self.db.add(IngestionRecord(ingestion_run_id=run.id, source_id=source.id, source_product_id=payload.source_product_id, source_record_id=payload.source_record_id, domain_type=payload.domain_type, outcome=outcome, observed_at=payload.observed_at or payload.valid_at, processing_version=payload.processing_version or run.processing_version, validation_errors=errors, metadata_json=payload.metadata))
