from datetime import datetime,timezone
from uuid import UUID,uuid4
from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy import func,select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.application import DSSReport
from app.models.iceberg import Iceberg,Trajectory
from app.models.operations import Vessel,Station,SeaIceRecord,WeatherRecord,OceanRecord
from app.models.navigation import Route,Alert,RiskAssessment
from app.models.intelligence import BehaviorProfile,IcebergInteraction,TrajectoryModelMetadata
from app.schemas.iceberg import DataStatus,Provenance
from app.schemas.application import Availability,ChatRequest,ChatResponse,DashboardResponse,ReportRequest,ReportResponse
router=APIRouter()
DOMAINS={'icebergs':Iceberg,'trajectories':Trajectory,'vessels':Vessel,'stations':Station,'seaIce':SeaIceRecord,'weather':WeatherRecord,'ocean':OceanRecord,'routes':Route,'riskAssessments':RiskAssessment,'alerts':Alert,'behaviorProfiles':BehaviorProfile,'interactionCandidates':IcebergInteraction}
def p(x):return Provenance(source=x.source,sourceId=x.source_id,sourceType=x.source_type,observedAt=x.observed_at,ingestedAt=x.ingested_at,processingVersion=x.processing_version,dataStatus=DataStatus(x.data_status),confidence=float(x.confidence) if x.confidence is not None else None)
def availability(db):
 out=[]
 for name,m in DOMAINS.items():
  rows=db.execute(select(m.data_status,func.count()).group_by(m.data_status)).all();out.append(Availability(domain=name,count=sum(c for _,c in rows),statuses={s:c for s,c in rows}))
 return out
@router.get('/dashboard/summary',response_model=DashboardResponse,summary='Aggregate available DSS evidence')
def dashboard(db:Session=Depends(get_db)):return DashboardResponse(availability=availability(db),activeAlerts=db.scalar(select(func.count()).select_from(Alert).where(Alert.acknowledged.is_(False))) or 0,provenanceNote='Counts preserve stored statuses. Absence means unavailable, not safe or clear.')
def report_response(x):return ReportResponse(id=x.catalog_id,databaseId=x.id,reportType=x.report_type,title=x.title,sections=x.content_json,limitations=x.limitations,createdAt=x.created_at,provenance=p(x))
@router.post('/reports/passage-briefing',response_model=ReportResponse,summary='Generate evidence-based passage briefing')
def briefing(req:ReportRequest,db:Session=Depends(get_db)):
 route=db.scalar(select(Route).where(Route.catalog_id==req.routeId)) if req.routeId else None
 sections={'availability':[x.model_dump() for x in availability(db)],'route':{'id':route.catalog_id,'status':route.data_status} if route else {'availability':'unavailable'},'alerts':{'active':db.scalar(select(func.count()).select_from(Alert).where(Alert.acknowledged.is_(False))) or 0}}
 x=DSSReport(id=uuid4(),catalog_id=f'briefing-{uuid4().hex[:12]}',report_type='passage_briefing',title='DSS passage briefing (evidence summary)',content_json=sections,limitations='This briefing aggregates persisted evidence only. It is not navigation guidance; demo, simulated, and provisional status must be respected.',created_at=datetime.now(timezone.utc),source='dss-report-service',source_type='aggregation',data_status='provisional',metadata_json={'requestedRouteId':req.routeId});db.add(x);db.commit();db.refresh(x);return report_response(x)
@router.get('/reports/{report_id}',response_model=ReportResponse,summary='Get generated report')
def report(report_id:str,db:Session=Depends(get_db)):
 x=db.scalar(select(DSSReport).where(DSSReport.catalog_id==report_id));
 if not x:raise HTTPException(404,'Report not found')
 return report_response(x)
@router.post('/chat',response_model=ChatResponse,summary='Retrieve deterministic backend context')
def chat(req:ChatRequest,db:Session=Depends(get_db)):
 q=req.message.lower()
 if 'iceberg' in q:return ChatResponse(answer=f"Backend currently has {db.scalar(select(func.count()).select_from(Iceberg)) or 0} iceberg records. Inspect each record's provenance before interpretation.",dataStatus='contextual',limitations='Deterministic retrieval response; no scientific inference or model prediction.')
 if 'model' in q or 'prediction' in q:return ChatResponse(answer=f"The registry contains {db.scalar(select(func.count()).select_from(TrajectoryModelMetadata)) or 0} metadata records. No validated prediction model is available through chat.",dataStatus='provisional',limitations='Metadata is not performance evidence.')
 return ChatResponse(answer='I can summarize stored backend domains, but the requested evidence is unavailable or unsupported by this deterministic chat interface.',dataStatus='provisional',limitations='No external LLM or invented scientific information is used.')
@router.get('/models',summary='List trajectory model metadata')
def models(db:Session=Depends(get_db)):
 xs=db.scalars(select(TrajectoryModelMetadata).order_by(TrajectoryModelMetadata.model_name)).all();return {'items':[{'id':str(x.id),'modelName':x.model_name,'modelVersion':x.model_version,'interfaceType':x.interface_type,'inputContract':x.input_contract,'outputContract':x.output_contract,'uncertainty':'Declared by output contract; no verified performance metrics stored.','limitations':x.limitations,'provenance':p(x).model_dump()} for x in xs]}
@router.get('/models/{model_id}',summary='Get trajectory model metadata')
def model(model_id:UUID,db:Session=Depends(get_db)):
 x=db.scalar(select(TrajectoryModelMetadata).where(TrajectoryModelMetadata.id==model_id))
 if not x:raise HTTPException(404,'Model not found')
 return {'id':str(x.id),'modelName':x.model_name,'modelVersion':x.model_version,'interfaceType':x.interface_type,'inputContract':x.input_contract,'outputContract':x.output_contract,'performance':'unavailable: no verified metrics stored','limitations':x.limitations,'provenance':p(x).model_dump()}
