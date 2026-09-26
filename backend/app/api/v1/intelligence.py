from datetime import datetime,timezone
from typing import Annotated
from fastapi import APIRouter,Depends,HTTPException,Query
from sqlalchemy import func,select,or_
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.iceberg import Iceberg
from app.models.intelligence import BehaviorProfile,IcebergInteraction
from app.schemas.iceberg import DataStatus,Provenance
from app.schemas.intelligence import BehaviorResponse,Feature,InteractionPage,InteractionResponse
router=APIRouter(prefix='/icebergs')
def n(x):return float(x) if x is not None else None
def pv(x):return Provenance(source=x.source,sourceId=x.source_id,sourceType=x.source_type,observedAt=x.observed_at,ingestedAt=x.ingested_at,processingVersion=x.processing_version,dataStatus=DataStatus(x.data_status),confidence=n(x.confidence))
def unavailable_behavior(catalog_id):
 return BehaviorResponse(icebergId=catalog_id,profileVersion='uncomputed',method='profile-foundation',behaviorClass='unclassified',features=[Feature(name=x,availability='unavailable',note='No persisted profile computation has established this feature.') for x in ['drift_speed','drift_direction','acceleration','direction_changes','trajectory_stability','rotation','area_evolution','shape_evolution','melt_rate','ocean_relationship','wind_relationship','seasonality']],limitations='No behavior classification is inferred. A validated method and sufficient attributable observation history are required.',provenance=Provenance(source='behavior-foundation',sourceType='availability-report',ingestedAt=datetime.now(timezone.utc),processingVersion='milestone-c-v1',dataStatus='provisional'))
@router.get('/{iceberg_id}/behavior',response_model=BehaviorResponse,summary='Get iceberg behavior profile')
def behavior(iceberg_id:str,db:Annotated[Session,Depends(get_db)]):
 i=db.scalar(select(Iceberg).where(Iceberg.catalog_id==iceberg_id))
 if not i:raise HTTPException(404,'Iceberg not found')
 # Prefer the latest externally supplied prediction when timestamps tie with a
 # synthetic schema fixture.  This keeps the retrieval surface faithful to the
 # explicit predicted/demo distinction instead of depending on insert order.
 p=db.scalar(select(BehaviorProfile).where(BehaviorProfile.iceberg_id==i.id).order_by((BehaviorProfile.data_status=="predicted").desc(),BehaviorProfile.created_at.desc()))
 if not p:return unavailable_behavior(iceberg_id)
 return BehaviorResponse(icebergId=iceberg_id,profileVersion=p.profile_version,method=p.method,behaviorClass=p.behavior_class,features=[Feature(**x) for x in p.features_json['features']],limitations=p.limitations,provenance=pv(p))
@router.get('/{iceberg_id}/interactions',response_model=InteractionPage,summary='List exploratory iceberg interaction candidates')
def interactions(iceberg_id:str,db:Annotated[Session,Depends(get_db)],limit:int=Query(100,ge=1,le=250),offset:int=Query(0,ge=0)):
 i=db.scalar(select(Iceberg).where(Iceberg.catalog_id==iceberg_id))
 if not i:raise HTTPException(404,'Iceberg not found')
 f=or_(IcebergInteraction.iceberg_a_id==i.id,IcebergInteraction.iceberg_b_id==i.id);total=db.scalar(select(func.count()).select_from(IcebergInteraction).where(f)) or 0;xs=db.scalars(select(IcebergInteraction).where(f).order_by(IcebergInteraction.analysis_at.desc()).limit(limit).offset(offset)).all()
 ids={z for x in xs for z in (x.iceberg_a_id,x.iceberg_b_id)};names=dict(db.execute(select(Iceberg.id,Iceberg.catalog_id).where(Iceberg.id.in_(ids))).all())
 return InteractionPage(items=[InteractionResponse(id=x.id,icebergAId=names[x.iceberg_a_id],icebergBId=names[x.iceberg_b_id],status=x.interaction_status,analysisAt=x.analysis_at,closestApproachKm=n(x.closest_approach_km),relativeVelocityKts=n(x.relative_velocity_kts),relativeHeadingDeg=n(x.relative_heading_deg),interactionScore=n(x.interaction_score),method=x.method,limitations=x.limitations,provenance=pv(x)) for x in xs],limit=limit,offset=offset,total=total)
