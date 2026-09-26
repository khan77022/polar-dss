from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.iceberg import LatLon, Provenance


class EnvironmentalEvidence(BaseModel):
    recordId: UUID; validAt: datetime; recordType: str; spatialDistanceKm: float; temporalDistanceHours: float; dataStatus: str; provenance: Provenance

class EnvironmentalDomainContext(BaseModel):
    availability: str; items: list[EnvironmentalEvidence]

class EnvironmentalContextResponse(BaseModel):
    targetTime: datetime; targetLocation: LatLon; seaIce: EnvironmentalDomainContext; weather: EnvironmentalDomainContext; ocean: EnvironmentalDomainContext
    limitations: list[str]
