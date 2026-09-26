from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class IngestionSourceResponse(BaseModel):
    id: UUID; name: str; sourceType: str; productId: str | None; description: str | None; providerIdentifier: str | None; version: str | None; active: bool; metadata: dict | None


class IngestionRunResponse(BaseModel):
    id: UUID; sourceId: UUID; datasetProductId: str | None; status: str; dryRun: bool; startedAt: datetime; completedAt: datetime | None
    recordsDiscovered: int; recordsAccepted: int; recordsRejected: int; recordsSkippedDuplicate: int; errorSummary: str | None; processingVersion: str | None; configuration: dict | None; metadata: dict | None


class IngestionRunListResponse(BaseModel):
    items: list[IngestionRunResponse]; limit: int; offset: int
