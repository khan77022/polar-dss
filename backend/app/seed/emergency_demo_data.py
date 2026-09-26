"""One deterministic synthetic emergency scenario for integration demos."""
from datetime import datetime, timezone
from uuid import UUID
from geoalchemy2.elements import WKTElement
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from app.models.emergency import Asset, EmergencyAssignment, EmergencyEvent, EmergencyIncident, EmergencyResource, VesselPosition
from app.models.operations import Station, Vessel
SOURCE="polar-dss-emergency-demo"; TYPE="synthetic_demo"; VERSION="emergency-demo-v1"
def p(lat,lon):return WKTElement(f"POINT({lon} {lat})",srid=4326)
def q():return dict(source=SOURCE,source_type=TYPE,processing_version=VERSION,data_status="demo",metadata_json={"disclaimer":"Synthetic emergency integration demo; not a real incident or rescue dispatch."})
def reset(s:Session):
 for m in (EmergencyAssignment,EmergencyEvent,EmergencyIncident,EmergencyResource,Asset,VesselPosition):s.execute(delete(m).where(m.source==SOURCE))
def seed(s:Session):
 reset(s);t=datetime(2026,9,18,14,30,tzinfo=timezone.utc);v=s.scalar(select(Vessel).where(Vessel.catalog_id=="DEMO-CURRENT"));station=s.scalar(select(Station).where(Station.catalog_id=="DEMO-STATION"));
 if not v or not station:raise RuntimeError("Seed operational demo data before emergency data")
 incident=EmergencyIncident(id=UUID("e1000000-0000-0000-0000-000000000001"),incident_type="equipment_failure",severity="medium",status="reported",title="Synthetic propulsion advisory",description="Synthetic integration scenario only. Operator assessment required.",reported_at=t,updated_at=t,position=p(-68.85,74.2),affected_vessel_id=v.id,affected_station_id=station.id,people_affected=None,**q());resource=EmergencyResource(id=UUID("e2000000-0000-0000-0000-000000000001"),catalog_id="DEMO-RESOURCE-1",name="Synthetic station response team",resource_type="rescue_team",status="available",position=p(-69.407,76.187),capacity=0,capabilities={"limitations":"Synthetic resource; availability is not operational."},**q());asset=Asset(id=UUID("e3000000-0000-0000-0000-000000000001"),catalog_id="DEMO-ASSET-1",name="Synthetic emergency communications kit",asset_type="communications",category="communications",status="demo",owner="Polar-DSS demo",description="Synthetic asset record; no telemetry.",station_id=station.id,vessel_id=None,last_inspection=None,next_inspection=None,**q());s.add_all([incident,resource,asset,VesselPosition(id=UUID("e4000000-0000-0000-0000-000000000001"),vessel_id=v.id,timestamp=t,position=p(-68.85,74.2),speed_kts=12.5,heading_deg=268,**q())]);s.flush();s.add(EmergencyEvent(id=UUID("e5000000-0000-0000-0000-000000000001"),incident_id=incident.id,event_type="incident_created",actor="demo-operator",description="Synthetic demo incident created.",occurred_at=t,**q()));s.flush()
