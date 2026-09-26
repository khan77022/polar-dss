"""Explicit synthetic navigation records; no operational recommendation is implied."""
import argparse
from datetime import datetime,timezone
from uuid import UUID
from geoalchemy2.elements import WKTElement
from sqlalchemy import delete
from app.core.database import SessionLocal
from app.models.navigation import Alert,Route,RouteWaypoint
S='polar-dss-milestone-b-demo';P=dict(source=S,source_type='synthetic_demo',processing_version='milestone-b-demo-v1',data_status='demo',metadata_json={'disclaimer':'Synthetic demo only; not navigation guidance.'})
def pt(lon,lat):return WKTElement(f'POINT({lon} {lat})',srid=4326)
def ln():return WKTElement('LINESTRING(74.2 -68.85,71.8 -68.65)',srid=4326)
def reset(s):
 s.execute(delete(Alert).where(Alert.source==S));s.execute(delete(RouteWaypoint).where(RouteWaypoint.route_id==UUID('b0000000-0000-0000-0000-000000000001')));s.execute(delete(Route).where(Route.source==S));s.flush()
def seed(s):
 reset(s);t=datetime(2026,9,18,14,30,tzinfo=timezone.utc);r=Route(id=UUID('b0000000-0000-0000-0000-000000000001'),catalog_id='DEMO-ROUTE-1',name='Synthetic route example',objective='balanced',distance_km=100,estimated_time_hours=None,fuel_liters=None,iceberg_exposure='unknown',sea_ice_exposure='unknown',recommendation_context='Synthetic geometry fixture; not an optimized or recommended route.',has_conflict=False,geometry=ln(),created_at=t,observed_at=t,**P);s.add(r);s.flush();s.add_all([RouteWaypoint(id=UUID('b1000000-0000-0000-0000-000000000001'),route_id=r.id,sequence_number=0,position=pt(74.2,-68.85),label='synthetic origin'),RouteWaypoint(id=UUID('b1000000-0000-0000-0000-000000000002'),route_id=r.id,sequence_number=1,position=pt(71.8,-68.65),label='synthetic destination')]);s.add(Alert(id=UUID('b2000000-0000-0000-0000-000000000001'),catalog_id='DEMO-ALERT-1',category='data_readiness',severity='info',title='Synthetic data notice',message='This alert exists solely to demonstrate acknowledgement.',related_entity_type='route',related_entity_id='DEMO-ROUTE-1',trigger_context={'rule':'explicit synthetic seed rule','condition':'demo dataset loaded'},created_at=t,acknowledged=False,observed_at=t,**P));s.flush();return {'routes':1,'waypoints':2,'alerts':1}
def main():
 p=argparse.ArgumentParser();p.add_argument('--reset',action='store_true');a=p.parse_args()
 with SessionLocal.begin() as s:print('Reset' if a.reset else 'Seeded',{} if a.reset else seed(s));reset(s) if a.reset else None
if __name__=='__main__':main()
