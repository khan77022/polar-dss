from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.ingestion import IngestionRun, IngestionSource
from app.schemas.ingestion import IngestionRunListResponse, IngestionRunResponse, IngestionSourceResponse

router = APIRouter(prefix="/ingestion")

def source_out(x: IngestionSource) -> IngestionSourceResponse:
    return IngestionSourceResponse(id=x.id, name=x.name, sourceType=x.source_type, productId=x.product_id, description=x.description, providerIdentifier=x.provider_identifier, version=x.version, active=x.active, metadata=x.metadata_json)

def run_out(x: IngestionRun) -> IngestionRunResponse:
    return IngestionRunResponse(id=x.id, sourceId=x.source_id, datasetProductId=x.dataset_product_id, status=x.status, dryRun=x.dry_run, startedAt=x.started_at, completedAt=x.completed_at, recordsDiscovered=x.records_discovered, recordsAccepted=x.records_accepted, recordsRejected=x.records_rejected, recordsSkippedDuplicate=x.records_skipped_duplicate, errorSummary=x.error_summary, processingVersion=x.processing_version, configuration=x.configuration_json, metadata=x.metadata_json)

@router.get("/sources", response_model=list[IngestionSourceResponse], summary="List registered ingestion sources")
def sources(active: bool | None = None, source_type: str | None = None, db: Session = Depends(get_db)):
    stmt = select(IngestionSource).order_by(IngestionSource.name, IngestionSource.version)
    if active is not None: stmt = stmt.where(IngestionSource.active.is_(active))
    if source_type: stmt = stmt.where(IngestionSource.source_type == source_type)
    return [source_out(x) for x in db.scalars(stmt).all()]

@router.get("/runs", response_model=IngestionRunListResponse, summary="List ingestion runs")
def runs(source_id: UUID | None = None, status: str | None = None, dry_run: bool | None = None, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    stmt = select(IngestionRun).order_by(IngestionRun.started_at.desc()).offset(offset).limit(limit)
    if source_id: stmt = stmt.where(IngestionRun.source_id == source_id)
    if status: stmt = stmt.where(IngestionRun.status == status)
    if dry_run is not None: stmt = stmt.where(IngestionRun.dry_run.is_(dry_run))
    return IngestionRunListResponse(items=[run_out(x) for x in db.scalars(stmt).all()], limit=limit, offset=offset)

@router.get("/runs/{run_id}", response_model=IngestionRunResponse, summary="Inspect an ingestion run")
def run(run_id: UUID, db: Session = Depends(get_db)):
    x = db.get(IngestionRun, run_id)
    if not x: raise HTTPException(404, "Ingestion run not found")
    return run_out(x)
