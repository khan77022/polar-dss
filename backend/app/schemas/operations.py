from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.schemas.iceberg import DataStatus, LatLon, Provenance


class Page(BaseModel):
    items: list[Any]
    limit: int
    offset: int
    total: int


class VesselResponse(BaseModel):
    id: str
    databaseId: UUID
    name: str
    callSign: str | None = None
    polarClass: str | None = None
    role: str | None = None
    currentPos: LatLon | None = None
    speedKts: float | None = None
    headingDeg: float | None = None
    destination: str | None = None
    eta: str | None = None
    aheadReport: dict[str, Any] | None = None
    provenance: Provenance


class StationResponse(BaseModel):
    id: str
    databaseId: UUID
    name: str
    country: str | None = None
    position: LatLon
    crew: int | None = None
    scienceFocus: str | None = None
    status: str | None = None
    provenance: Provenance


class SeaIceResponse(BaseModel):
    id: UUID
    regionId: str | None = None
    recordType: str
    validAt: datetime
    concentrationPercent: float | None = None
    thicknessM: float | None = None
    provenance: Provenance


class SeaIceRegionResponse(BaseModel):
    id: str
    databaseId: UUID
    name: str
    provenance: Provenance


class EnvironmentResponse(BaseModel):
    id: UUID
    recordType: str
    validAt: datetime
    position: LatLon
    values: dict[str, float | str | None]
    provenance: Provenance
