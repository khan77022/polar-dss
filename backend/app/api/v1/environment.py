from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.environment import EnvironmentalContextResponse, EnvironmentalDomainContext, EnvironmentalEvidence
from app.schemas.iceberg import DataStatus, LatLon, Provenance
from app.services.environment import EnvironmentalAlignmentService

router = APIRouter(prefix="/environment")

def provenance(row):
    return Provenance(source=row.source, sourceId=row.source_id, sourceType=row.source_type, observedAt=row.observed_at, ingestedAt=row.ingested_at, processingVersion=row.processing_version, dataStatus=DataStatus(row.data_status), confidence=float(row.confidence) if row.confidence is not None else None)

def domain(value):
    return EnvironmentalDomainContext(availability=value["availability"], items=[EnvironmentalEvidence(recordId=x["record"].id, validAt=x["record"].valid_at, recordType=x["record"].record_type, spatialDistanceKm=round(x["spatial_distance_km"], 6), temporalDistanceHours=round(x["temporal_distance_hours"], 6), dataStatus=x["record"].data_status, provenance=provenance(x["record"])) for x in value["items"]])

@router.get("/context", response_model=EnvironmentalContextResponse, summary="Retrieve available environmental evidence around a location and time")
def context(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180), timestamp: datetime = Query(...), spatial_radius_km: float = Query(50, gt=0, le=1000), temporal_window_hours: float = Query(24, gt=0, le=8760), db: Session = Depends(get_db)):
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        from fastapi import HTTPException
        raise HTTPException(422, "timestamp must be timezone-aware")
    raw = EnvironmentalAlignmentService(db).context(latitude, longitude, timestamp, spatial_radius_km, temporal_window_hours)
    return EnvironmentalContextResponse(targetTime=raw["target_time"], targetLocation=LatLon(**raw["target_location"]), seaIce=domain(raw["sea_ice"]), weather=domain(raw["weather"]), ocean=domain(raw["ocean"]), limitations=["Returned records are available evidence only; no spatial or temporal interpolation is performed.", "Distance and time offset are descriptive retrieval measures, not confidence, accuracy, or safety scores."])
