from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class DataStatus(str, Enum):
    observed = "observed"
    forecast = "forecast"
    predicted = "predicted"
    simulated = "simulated"
    demo = "demo"
    provisional = "provisional"
    invalid = "invalid"


class TrajectoryType(str, Enum):
    observed = "observed"
    forecast = "forecast"
    predicted = "predicted"


class LatLon(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class DimensionsKm(BaseModel):
    length: float | None = None
    width: float | None = None
    heightAboveWaterM: float | None = None


class Provenance(BaseModel):
    source: str | None = None
    sourceId: str | None = None
    sourceType: str | None = None
    observedAt: datetime | None = None
    ingestedAt: datetime | None = None
    processingVersion: str | None = None
    dataStatus: DataStatus
    confidence: float | None = Field(default=None, ge=0, le=1)


class IcebergResponse(BaseModel):
    """Frontend-shaped iceberg record with traceable data readiness."""

    id: str
    databaseId: UUID
    name: str
    classification: str | None = None
    currentPos: LatLon | None = None
    dimensionsKm: DimensionsKm
    areaSqKm: float | None = None
    driftSpeedKts: float | None = None
    driftDirectionDeg: float | None = None
    riskLevel: str | None = None
    origin: str | None = None
    calveYear: int | None = None
    imageUrl: str | None = None
    imageCaption: str | None = None
    provenance: Provenance
    createdAt: datetime
    updatedAt: datetime


class IcebergPage(BaseModel):
    items: list[IcebergResponse]
    limit: int
    offset: int
    total: int


class ObservationResponse(BaseModel):
    id: UUID
    icebergId: str | None = None
    observedAt: datetime
    position: LatLon | None = None
    centroid: LatLon | None = None
    lengthKm: float | None = None
    widthKm: float | None = None
    areaSqKm: float | None = None
    orientationDeg: float | None = None
    speedKts: float | None = None
    directionDeg: float | None = None
    observationType: str
    provenance: Provenance
    hasFootprint: bool


class ObservationPage(BaseModel):
    items: list[ObservationResponse]
    limit: int
    offset: int
    total: int


class TrajectoryPointResponse(BaseModel):
    sequenceNumber: int
    timestamp: datetime
    position: LatLon
    speedKts: float | None = None
    directionDeg: float | None = None
    uncertaintyRadiusKm: float | None = None
    provenance: Provenance


class TrajectoryResponse(BaseModel):
    id: UUID
    icebergId: str
    trajectoryType: TrajectoryType
    referenceTime: datetime | None = None
    validFrom: datetime | None = None
    validTo: datetime | None = None
    generatedAt: datetime | None = None
    provenance: Provenance
    modelName: str | None = None
    modelVersion: str | None = None
    points: list[TrajectoryPointResponse]


class TrajectoryPage(BaseModel):
    items: list[TrajectoryResponse]
    limit: int
    offset: int
    total: int
