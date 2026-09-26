"""Provider-neutral environmental adapters and evidence-only alignment."""
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ingestion import IngestionRecord
from app.models.operations import OceanRecord, SeaIceRecord, WeatherRecord
from app.services.ingestion import NormalizedEnvironmentalRecord


def _multi(wkt: str) -> str:
    value = wkt.strip()
    return value if value.upper().startswith("MULTIPOLYGON") else "MULTIPOLYGON(" + value[len("POLYGON"): ] + ")" if value.upper().startswith("POLYGON") else value


@dataclass(frozen=True)
class SeaIcePayload:
    product_id: str; record_id: str; valid_at: datetime | None; latitude: float; longitude: float; footprint_wkt: str; concentration_percent: float | None = None; thickness_m: float | None = None; observed_at: datetime | None = None; record_type: str = "current"; data_status: str = "provisional"; processing_version: str | None = None; confidence: float | None = None; metadata: dict[str, Any] | None = None

@dataclass(frozen=True)
class WeatherPayload:
    product_id: str; record_id: str; valid_at: datetime | None; latitude: float; longitude: float; observed_at: datetime | None = None; record_type: str = "current"; data_status: str = "provisional"; processing_version: str | None = None; confidence: float | None = None; air_temperature_c: float | None = None; wind_speed_kts: float | None = None; wind_direction_deg: float | None = None; pressure_hpa: float | None = None; visibility_km: float | None = None; wave_height_m: float | None = None; wave_period_s: float | None = None; metadata: dict[str, Any] | None = None

@dataclass(frozen=True)
class OceanPayload:
    product_id: str; record_id: str; valid_at: datetime | None; latitude: float; longitude: float; observed_at: datetime | None = None; record_type: str = "current"; data_status: str = "provisional"; processing_version: str | None = None; confidence: float | None = None; sea_surface_temperature_c: float | None = None; current_speed_ms: float | None = None; current_direction_deg: float | None = None; current_u_ms: float | None = None; current_v_ms: float | None = None; wave_height_m: float | None = None; wave_period_s: float | None = None; metadata: dict[str, Any] | None = None


class SeaIceSourceAdapter:
    def normalize(self, x: SeaIcePayload) -> NormalizedEnvironmentalRecord:
        return NormalizedEnvironmentalRecord(domain_type="sea_ice_record", source_product_id=x.product_id, source_record_id=x.record_id, record_type=x.record_type, valid_at=x.valid_at, observed_at=x.observed_at, latitude=x.latitude, longitude=x.longitude, geometry_wkt=_multi(x.footprint_wkt), data_status=x.data_status, processing_version=x.processing_version, confidence=x.confidence, values={"concentration_percent": x.concentration_percent, "thickness_m": x.thickness_m}, metadata=x.metadata or {})


class WeatherSourceAdapter:
    def normalize(self, x: WeatherPayload) -> NormalizedEnvironmentalRecord:
        values = {key: getattr(x, key) for key in ("air_temperature_c", "wind_speed_kts", "wind_direction_deg", "pressure_hpa", "visibility_km", "wave_height_m", "wave_period_s")}
        return NormalizedEnvironmentalRecord(domain_type="weather_record", source_product_id=x.product_id, source_record_id=x.record_id, record_type=x.record_type, valid_at=x.valid_at, observed_at=x.observed_at, latitude=x.latitude, longitude=x.longitude, data_status=x.data_status, processing_version=x.processing_version, confidence=x.confidence, values=values, metadata=x.metadata or {})


class OceanSourceAdapter:
    def normalize(self, x: OceanPayload) -> NormalizedEnvironmentalRecord:
        metadata = dict(x.metadata or {})
        if x.current_u_ms is not None or x.current_v_ms is not None: metadata["currentVectorMs"] = {"u": x.current_u_ms, "v": x.current_v_ms}
        speed, direction = x.current_speed_ms, x.current_direction_deg
        if speed is None and x.current_u_ms is not None and x.current_v_ms is not None:
            speed = math.hypot(x.current_u_ms, x.current_v_ms); direction = (math.degrees(math.atan2(x.current_u_ms, x.current_v_ms)) + 360) % 360; metadata["currentSpeedDirectionDerivedFromVector"] = True
        values = {"sea_surface_temperature_c": x.sea_surface_temperature_c, "current_speed_ms": speed, "current_direction_deg": direction, "wave_height_m": x.wave_height_m, "wave_period_s": x.wave_period_s}
        return NormalizedEnvironmentalRecord(domain_type="ocean_record", source_product_id=x.product_id, source_record_id=x.record_id, record_type=x.record_type, valid_at=x.valid_at, observed_at=x.observed_at, latitude=x.latitude, longitude=x.longitude, data_status=x.data_status, processing_version=x.processing_version, confidence=x.confidence, values=values, metadata=metadata)


def _haversine_km(a_lat, a_lon, b_lat, b_lon):
    p = math.pi / 180; x = math.sin((b_lat-a_lat)*p/2)**2 + math.cos(a_lat*p)*math.cos(b_lat*p)*math.sin((b_lon-a_lon)*p/2)**2
    return 6371.0088 * 2 * math.asin(math.sqrt(x))


class EnvironmentalAlignmentService:
    """Returns persisted evidence and descriptive distances; it never interpolates."""
    def __init__(self, db: Session): self.db = db
    def context(self, latitude: float, longitude: float, timestamp: datetime, spatial_radius_km: float, temporal_window_hours: float):
        start, end = timestamp - timedelta(hours=temporal_window_hours), timestamp + timedelta(hours=temporal_window_hours)
        return {"target_time": timestamp, "target_location": {"lat": latitude, "lon": longitude}, "sea_ice": self._sea_ice(latitude, longitude, timestamp, spatial_radius_km, start, end), "weather": self._points(WeatherRecord, "weather", latitude, longitude, timestamp, spatial_radius_km, start, end), "ocean": self._points(OceanRecord, "ocean", latitude, longitude, timestamp, spatial_radius_km, start, end)}
    def _points(self, model, domain, lat, lon, timestamp, radius, start, end):
        rows = self.db.execute(select(model, func.ST_Y(model.position), func.ST_X(model.position)).where(model.valid_at.between(start, end))).all()
        return self._format(domain, rows, lat, lon, timestamp, radius)
    def _sea_ice(self, lat, lon, timestamp, radius, start, end):
        rows = self.db.execute(select(SeaIceRecord, func.ST_Y(func.ST_Centroid(SeaIceRecord.geometry)), func.ST_X(func.ST_Centroid(SeaIceRecord.geometry))).where(SeaIceRecord.valid_at.between(start, end))).all()
        return self._format("sea_ice", rows, lat, lon, timestamp, radius)
    def _format(self, domain, rows, lat, lon, timestamp, radius):
        items=[]
        for row, record_lat, record_lon in rows:
            distance=_haversine_km(lat, lon, float(record_lat), float(record_lon))
            if distance <= radius: items.append({"record": row, "spatial_distance_km": distance, "temporal_distance_hours": abs((row.valid_at-timestamp).total_seconds())/3600})
        if items: availability="available"
        elif self.db.scalar(select(func.count()).select_from({"sea_ice":SeaIceRecord,"weather":WeatherRecord,"ocean":OceanRecord}[domain])): availability="no_matching_record"
        elif self.db.scalar(select(func.count()).select_from(IngestionRecord).where(IngestionRecord.domain_type == f"{domain}_record" if domain != "sea_ice" else IngestionRecord.domain_type == "sea_ice_record", IngestionRecord.outcome == "rejected")): availability="record_invalid"
        else: availability="source_unavailable"
        return {"items": items, "availability": availability}
