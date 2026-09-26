from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Annotated
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.navigation import Alert, RiskAssessment, Route, RouteWaypoint
from app.schemas.iceberg import DataStatus, Provenance
from app.schemas.navigation import AlertPage,AlertResponse,Factor,RiskRequest,RiskResponse,RoutePage,RouteRequest,RouteResponse,Waypoint
router=APIRouter()
def n(v):return float(v) if v is not None else None
def prov(x):return Provenance(source=x.source,sourceId=x.source_id,sourceType=x.source_type,observedAt=x.observed_at,ingestedAt=x.ingested_at,processingVersion=x.processing_version,dataStatus=DataStatus(x.data_status),confidence=n(x.confidence))
def route_response(db,r):
 rows=db.execute(select(RouteWaypoint,func.ST_Y(RouteWaypoint.position),func.ST_X(RouteWaypoint.position)).where(RouteWaypoint.route_id==r.id).order_by(RouteWaypoint.sequence_number)).all()
 return RouteResponse(id=r.catalog_id,databaseId=r.id,name=r.name,objective=r.objective,distanceKm=n(r.distance_km),timeHours=n(r.estimated_time_hours),fuelLiters=n(r.fuel_liters),iceRisk=r.sea_ice_exposure,icebergRisk=r.iceberg_exposure,recommendedFor=r.recommendation_context,waypoints=[Waypoint(lat=float(lat),lon=float(lon),label=w.label) for w,lat,lon in rows],conflictAtKm=n(r.conflict_at_km),hasConflict=r.has_conflict,provenance=prov(r))
@router.get('/routes',response_model=RoutePage,summary='List stored routes')
def routes(db:Annotated[Session,Depends(get_db)],objective:str|None=Query(None,pattern='^(shortest|balanced|safety)$'),limit:int=Query(100,ge=1,le=250),offset:int=Query(0,ge=0)):
 f=[Route.objective==objective] if objective else [];total=db.scalar(select(func.count()).select_from(Route).where(*f)) or 0;rs=db.scalars(select(Route).where(*f).order_by(Route.catalog_id).limit(limit).offset(offset)).all();return RoutePage(items=[route_response(db,r) for r in rs],limit=limit,offset=offset,total=total)
@router.get('/routes/{route_id}',response_model=RouteResponse,summary='Get stored route')
def route(route_id:str,db:Annotated[Session,Depends(get_db)]):
 r=db.scalar(select(Route).where(Route.catalog_id==route_id));
 if not r:raise HTTPException(404,'Route not found')
 return route_response(db,r)
@router.post('/routes/calculate',response_model=RouteResponse,summary='Calculate deterministic geometric demo route')
def calculate(request:RouteRequest):
 """Great-circle geometry only; explicitly not an environmental route optimization."""
 a,b=request.origin,request.destination; dlat=radians(b.lat-a.lat);dlon=radians(b.lon-a.lon);h=sin(dlat/2)**2+cos(radians(a.lat))*cos(radians(b.lat))*sin(dlon/2)**2;km=6371*2*asin(sqrt(h));
 return RouteResponse(id='calculated-simulated',databaseId=uuid4(),name='Deterministic geometric planning line (simulated)',objective=request.objective,distanceKm=round(km,3),timeHours=None,fuelLiters=None,iceRisk=None,icebergRisk=None,recommendedFor='No environmental, vessel, or safety optimization was performed.',waypoints=[Waypoint(**a.model_dump(),label='origin'),Waypoint(**b.model_dump(),label='destination')],hasConflict=False,provenance=Provenance(source='deterministic-geodesic-framework',sourceType='algorithmic_stub',ingestedAt=datetime.now(timezone.utc),processingVersion='milestone-b-v1',dataStatus='simulated'))
def factors():return [Factor(name=x,status='unavailable',explanation='No real or validated input is available; no numerical contribution was inferred.') for x in ['iceberg_exposure','sea_ice_exposure','weather_exposure','ocean_exposure','vessel_context','route_exposure']]
def risk_response(x=None):
 p=prov(x) if x else Provenance(source='risk-foundation',sourceType='explicit-input-availability',ingestedAt=datetime.now(timezone.utc),processingVersion='milestone-b-v1',dataStatus='provisional')
 return RiskResponse(id=x.id if x else None,method=x.assessment_method if x else 'input-availability-assessment',riskLevel=x.risk_level if x else None,score=n(x.score) if x else None,factors=[Factor(**f) for f in (x.factors_json['factors'] if x else [f.model_dump() for f in factors()])],limitations=x.limitations if x else 'No persisted assessment selected; real environmental and vessel inputs are required.',provenance=p)
@router.get('/risk',response_model=RiskResponse,summary='Get latest risk assessment foundation')
def risk(db:Annotated[Session,Depends(get_db)]):return risk_response(db.scalar(select(RiskAssessment).order_by(RiskAssessment.created_at.desc())))
@router.post('/risk/assess',response_model=RiskResponse,summary='Assess input availability without fabricating risk')
def assess(request:RiskRequest,db:Annotated[Session,Depends(get_db)]):
 r=RiskAssessment(id=uuid4(),route_id=None,assessment_method='input-availability-assessment',risk_level=None,score=None,factors_json={'factors':[f.model_dump() for f in factors()]},limitations='No scientific risk score is calculated: required validated environmental, vessel, and route exposure inputs are unavailable.',created_at=datetime.now(timezone.utc),source='risk-foundation',source_type='explicit-input-availability',data_status='provisional',metadata_json={'routeId':request.routeId,'vesselId':request.vesselId});db.add(r);db.commit();db.refresh(r);return risk_response(r)
def alert_response(a):return AlertResponse(id=a.catalog_id,databaseId=a.id,category=a.category,severity=a.severity,title=a.title,message=a.message,relatedEntityType=a.related_entity_type,relatedEntityId=a.related_entity_id,triggerContext=a.trigger_context,createdAt=a.created_at,acknowledged=a.acknowledged,acknowledgedAt=a.acknowledged_at,provenance=prov(a))
@router.get('/alerts',response_model=AlertPage,summary='List explicit alerts')
def alerts(db:Annotated[Session,Depends(get_db)],severity:str|None=None,acknowledged:bool|None=None,limit:int=Query(100,ge=1,le=250),offset:int=Query(0,ge=0)):
 f=[]
 if severity:f.append(Alert.severity==severity)
 if acknowledged is not None:f.append(Alert.acknowledged==acknowledged)
 total=db.scalar(select(func.count()).select_from(Alert).where(*f)) or 0;xs=db.scalars(select(Alert).where(*f).order_by(Alert.created_at.desc()).limit(limit).offset(offset)).all();return AlertPage(items=[alert_response(x) for x in xs],limit=limit,offset=offset,total=total)
@router.post('/alerts/{alert_id}/acknowledge',response_model=AlertResponse,summary='Acknowledge an alert')
def acknowledge(alert_id:str,db:Annotated[Session,Depends(get_db)]):
 a=db.scalar(select(Alert).where(Alert.catalog_id==alert_id));
 if not a:raise HTTPException(404,'Alert not found')
 if not a.acknowledged:a.acknowledged=True;a.acknowledged_at=datetime.now(timezone.utc);db.commit();db.refresh(a)
 return alert_response(a)
