"""Emergency decision-support endpoints; routes are provisional candidates only."""
from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Annotated
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.emergency import Asset, EmergencyAssignment, EmergencyEvent, EmergencyIncident, EmergencyResource, VesselPosition
from app.models.operations import Station, Vessel
from app.models.navigation import Alert, Route, RouteWaypoint

router=APIRouter()
SOURCE="polar-dss-emergency-demo"; TYPE="synthetic_demo"; VERSION="emergency-demo-v1"
def prov(): return dict(source=SOURCE,source_type=TYPE,processing_version=VERSION,data_status="demo",metadata_json={"limitations":"Synthetic decision-support fixture only; requires operator validation."})
def point(lat,lon): return WKTElement(f"POINT({lon} {lat})",srid=4326)
def xy(row, field="position"): return (float(row[1]),float(row[2])) if row[1] is not None else None
def incident_out(row):
 x=row[0]; pos=xy(row); return {"id":str(x.id),"incidentType":x.incident_type,"severity":x.severity,"status":x.status,"title":x.title,"description":x.description,"reportedAt":x.reported_at,"updatedAt":x.updated_at,"location":{"lat":pos[0],"lon":pos[1]} if pos else None,"peopleAffected":x.people_affected,"affectedVesselId":str(x.affected_vessel_id) if x.affected_vessel_id else None,"affectedStationId":str(x.affected_station_id) if x.affected_station_id else None,"provenance":{"source":x.source,"sourceType":x.source_type,"dataStatus":x.data_status,"processingVersion":x.processing_version}}
def event(db,incident,event_type,actor,description): db.add(EmergencyEvent(incident_id=incident.id,event_type=event_type,actor=actor,description=description,occurred_at=datetime.now(timezone.utc),**prov()))

@router.get('/antarctic/sectors')
def sectors(): return {"items":[{"id":"indian-sector","name":"Indian Antarctic Operational Sector","description":"Demo map preset, not an authoritative maritime boundary.","center":{"lat":-69.5,"lon":76.0},"zoom":5,"dataStatus":"demo","provenance":{"source":"polar-dss-sector-config","sourceType":"configuration","dataStatus":"demo"}},{"id":"peninsula","name":"Antarctic Peninsula","center":{"lat":-64.2,"lon":-61.5},"zoom":6,"dataStatus":"demo","provenance":{"source":"polar-dss-sector-config","sourceType":"configuration","dataStatus":"demo"}}]}
@router.get('/antarctic/sectors/{sector_id}')
def sector(sector_id:str):
 for x in sectors()["items"]:
  if x["id"]==sector_id:return x
 raise HTTPException(404,"Sector not found")

@router.get('/emergencies')
def emergencies(db:Session=Depends(get_db),status:str|None=None,severity:str|None=None,incident_type:str|None=None,limit:int=Query(100,ge=1,le=250),offset:int=0):
 f=[]
 for col,val in ((EmergencyIncident.status,status),(EmergencyIncident.severity,severity),(EmergencyIncident.incident_type,incident_type)):
  if val:f.append(col==val)
 total=db.scalar(select(func.count()).select_from(EmergencyIncident).where(*f)) or 0; rows=db.execute(select(EmergencyIncident,func.ST_Y(EmergencyIncident.position),func.ST_X(EmergencyIncident.position)).where(*f).order_by(EmergencyIncident.reported_at.desc()).limit(limit).offset(offset)).all();return {"items":[incident_out(r) for r in rows],"limit":limit,"offset":offset,"total":total}
@router.get('/emergencies/{incident_id}')
def emergency(incident_id:UUID,db:Session=Depends(get_db)):
 row=db.execute(select(EmergencyIncident,func.ST_Y(EmergencyIncident.position),func.ST_X(EmergencyIncident.position)).where(EmergencyIncident.id==incident_id)).first()
 if not row:raise HTTPException(404,"Emergency not found")
 out=incident_out(row); events=db.scalars(select(EmergencyEvent).where(EmergencyEvent.incident_id==incident_id).order_by(EmergencyEvent.occurred_at)).all();out["events"]=[{"eventType":e.event_type,"timestamp":e.occurred_at,"actor":e.actor,"description":e.description,"provenance":{"source":e.source,"sourceType":e.source_type,"dataStatus":e.data_status}} for e in events];return out
@router.post('/emergencies',status_code=201)
def create_emergency(payload:dict,db:Session=Depends(get_db)):
 required=("incidentType","severity","title","description","location")
 if any(k not in payload for k in required):raise HTTPException(422,"incidentType, severity, title, description, and location are required")
 loc=payload["location"]; now=datetime.now(timezone.utc); x=EmergencyIncident(incident_type=payload["incidentType"],severity=payload["severity"],status="reported",title=payload["title"],description=payload["description"],position=point(loc["lat"],loc["lon"]),reported_at=now,updated_at=now,people_affected=payload.get("peopleAffected"),**prov());db.add(x);db.flush();event(db,x,"incident_created","system","Emergency incident recorded as a decision-support input.");db.commit();return emergency(x.id,db)
def transition(incident_id:UUID,status:str,event_type:str,db:Session):
 x=db.get(EmergencyIncident,incident_id)
 if not x:raise HTTPException(404,"Emergency not found")
 if x.status in ("resolved","cancelled"):raise HTTPException(409,"Emergency is already closed")
 x.status=status;x.updated_at=datetime.now(timezone.utc);event(db,x,event_type,"system",f"State changed to {status}.");db.commit();return emergency(x.id,db)
@router.post('/emergencies/{incident_id}/acknowledge')
def acknowledge(incident_id:UUID,db:Session=Depends(get_db)):return transition(incident_id,"acknowledged","incident_acknowledged",db)
@router.post('/emergencies/{incident_id}/resolve')
def resolve(incident_id:UUID,db:Session=Depends(get_db)):return transition(incident_id,"resolved","incident_resolved",db)
@router.post('/emergencies/{incident_id}/dispatch')
def dispatch(incident_id:UUID,payload:dict,db:Session=Depends(get_db)):
 x=db.get(EmergencyIncident,incident_id); resource=db.get(EmergencyResource,UUID(payload.get("resourceId","00000000-0000-0000-0000-000000000000"))) if payload.get("resourceId") else None
 if not x or not resource:raise HTTPException(404,"Emergency or resource not found")
 if resource.status!="available":raise HTTPException(409,"Resource is unavailable")
 resource.status="assigned";x.status="response_dispatched";x.updated_at=datetime.now(timezone.utc);db.add(EmergencyAssignment(incident_id=x.id,resource_id=resource.id,assigned_at=x.updated_at,status="assigned",notes="Operator must validate dispatch.",**prov()));event(db,x,"dispatch_created","system",f"Resource {resource.catalog_id} assigned.");db.commit();return emergency(x.id,db)
@router.get('/emergency-resources')
def resources(db:Session=Depends(get_db)):
 rows=db.execute(select(EmergencyResource,func.ST_Y(EmergencyResource.position),func.ST_X(EmergencyResource.position))).all();return {"items":[{"id":x.catalog_id,"name":x.name,"type":x.resource_type,"status":x.status,"position":{"lat":float(a),"lon":float(b)} if a is not None else None,"capacity":x.capacity,"capabilities":x.capabilities,"provenance":{"source":x.source,"sourceType":x.source_type,"dataStatus":x.data_status}} for x,a,b in rows]}
@router.post('/emergency-routes/calculate')
def emergency_route(payload:dict,db:Session=Depends(get_db)):
 if not payload.get("incidentId") or not payload.get("origin") or not payload.get("destination"):raise HTTPException(422,"incidentId, origin, and destination are required")
 incident=db.get(EmergencyIncident,UUID(payload["incidentId"]));
 if not incident:raise HTTPException(404,"Emergency not found")
 a,b=payload["origin"],payload["destination"]; dlat=radians(b["lat"]-a["lat"]);dlon=radians(b["lon"]-a["lon"]); km=6371*2*asin(sqrt(sin(dlat/2)**2+cos(radians(a["lat"]))*cos(radians(b["lat"]))*sin(dlon/2)**2)); now=datetime.now(timezone.utc); route=Route(catalog_id=f"emergency-{incident.id.hex[:12]}",name="Emergency candidate route (synthetic)",objective="balanced",distance_km=round(km,3),estimated_time_hours=None,fuel_liters=None,iceberg_exposure="unavailable",sea_ice_exposure="unavailable",recommendation_context="Candidate only; operator validation required.",has_conflict=False,geometry=WKTElement(f"LINESTRING({a['lon']} {a['lat']},{b['lon']} {b['lat']})",srid=4326),created_at=now,**prov());db.add(route);db.flush();db.add_all([RouteWaypoint(route_id=route.id,sequence_number=i,position=point(q["lat"],q["lon"]),label=label) for i,(q,label) in enumerate(((a,"origin"),(b,"incident")))]);event(db,incident,"candidate_route_created","system","A provisional geometric candidate route was generated.");db.commit();return {"routeId":route.catalog_id,"status":"provisional","waypoints":[a,b],"distanceKm":round(km,3),"estimatedTimeMinutes":None,"constraints":[],"hazardsEncountered":[],"limitations":["Live hazard feeds may be unavailable.","Candidate route requires operator validation."],"assumptions":["No response ETA is calculated without validated resource speed."],"dataStatus":"demo"}
@router.get('/assets')
def assets(db:Session=Depends(get_db),asset_type:str|None=None,status:str|None=None):
 f=[]
 if asset_type:f.append(Asset.asset_type==asset_type)
 if status:f.append(Asset.status==status)
 xs=db.scalars(select(Asset).where(*f).order_by(Asset.catalog_id)).all();return {"items":[{"id":x.catalog_id,"name":x.name,"assetType":x.asset_type,"category":x.category,"status":x.status,"owner":x.owner,"description":x.description,"provenance":{"source":x.source,"sourceType":x.source_type,"dataStatus":x.data_status}} for x in xs]}
@router.get('/fleet/summary')
def fleet(db:Session=Depends(get_db)):
 total=db.scalar(select(func.count()).select_from(Vessel)) or 0;ahead=db.scalar(select(func.count()).select_from(Vessel).where(Vessel.is_ahead.is_(True))) or 0;return {"total":total,"active":total,"ahead":ahead,"indianFlagged":0,"dataStatus":"demo","provenance":{"source":"polar-dss-emergency-demo","sourceType":"synthetic_demo","dataStatus":"demo"}}
