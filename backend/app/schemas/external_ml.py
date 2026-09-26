"""Contracts for externally generated ML outputs; the backend performs no inference."""
from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from app.schemas.iceberg import DataStatus, LatLon

class ExternalProvenance(BaseModel):
    source: str = Field(min_length=1, max_length=255)
    sourceRecordId: str = Field(min_length=1, max_length=255)
    sourceProductId: str = Field(min_length=1, max_length=255)
    sourceType: str = Field(default="external_ml", min_length=1, max_length=64)
    processingVersion: str | None = Field(default=None, max_length=128)

class PredictionPointInput(BaseModel):
    timestamp: datetime
    position: LatLon
    uncertaintyRadiusKm: float | None = Field(default=None, ge=0)

class TrajectoryPredictionInput(BaseModel):
    modelName: str = Field(min_length=1, max_length=255)
    modelVersion: str = Field(min_length=1, max_length=128)
    generatedAt: datetime
    validFrom: datetime
    validTo: datetime
    points: list[PredictionPointInput] = Field(min_length=1)
    limitations: str = Field(min_length=1)
    provenance: ExternalProvenance
    dataStatus: DataStatus = DataStatus.predicted
    confidence: float | None = Field(default=None, ge=0, le=1)
    @model_validator(mode="after")
    def valid_prediction(self):
        if self.dataStatus != DataStatus.predicted: raise ValueError("external ML trajectory outputs must use dataStatus=predicted")
        if any(x.tzinfo is None or x.utcoffset() is None for x in (self.generatedAt, self.validFrom, self.validTo)): raise ValueError("prediction timestamps must be timezone-aware")
        if self.validFrom > self.validTo: raise ValueError("validFrom must not be after validTo")
        return self

class BehaviorFeatureInput(BaseModel):
    value: float | str | bool | None = None
    availability: bool
    unit: str | None = None
    explanation: str | None = None

class BehaviorPredictionInput(BaseModel):
    modelName: str = Field(min_length=1, max_length=255)
    modelVersion: str = Field(min_length=1, max_length=128)
    generatedAt: datetime
    behaviorClass: str = Field(min_length=1, max_length=64)
    features: dict[str, BehaviorFeatureInput]
    limitations: str = Field(min_length=1)
    provenance: ExternalProvenance
    dataStatus: DataStatus = DataStatus.predicted
    confidence: float | None = Field(default=None, ge=0, le=1)
    @model_validator(mode="after")
    def valid_prediction(self):
        if self.dataStatus != DataStatus.predicted: raise ValueError("external ML behavior outputs must use dataStatus=predicted")
        if self.generatedAt.tzinfo is None or self.generatedAt.utcoffset() is None: raise ValueError("generatedAt must be timezone-aware")
        return self

class ExternalOutputResponse(BaseModel):
    id: str
    ingestionRunId: str
    dataStatus: DataStatus
    limitations: str
