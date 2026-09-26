from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.external_ml import BehaviorPredictionInput, ExternalOutputResponse, TrajectoryPredictionInput
from app.services.external_ml import iceberg_for, persist_behavior, persist_trajectory

router=APIRouter(prefix="/icebergs")

@router.post("/{iceberg_id}/external-ml/trajectory",response_model=ExternalOutputResponse,summary="Persist an externally supplied predicted trajectory")
def trajectory(iceberg_id:str,payload:TrajectoryPredictionInput,db:Session=Depends(get_db)):
    iceberg=iceberg_for(db,iceberg_id)
    if not iceberg: raise HTTPException(404,"Iceberg not found")
    try: row,run=persist_trajectory(db,iceberg,payload)
    except ValueError as exc: db.rollback();raise HTTPException(409,str(exc))
    return ExternalOutputResponse(id=str(row.id),ingestionRunId=str(run.id),dataStatus="predicted",limitations=payload.limitations)

@router.post("/{iceberg_id}/external-ml/behavior",response_model=ExternalOutputResponse,summary="Persist an externally supplied predicted behavior profile")
def behavior(iceberg_id:str,payload:BehaviorPredictionInput,db:Session=Depends(get_db)):
    iceberg=iceberg_for(db,iceberg_id)
    if not iceberg: raise HTTPException(404,"Iceberg not found")
    try: row,run=persist_behavior(db,iceberg,payload)
    except ValueError as exc: db.rollback();raise HTTPException(409,str(exc))
    return ExternalOutputResponse(id=str(row.id),ingestionRunId=str(run.id),dataStatus="predicted",limitations=payload.limitations)
