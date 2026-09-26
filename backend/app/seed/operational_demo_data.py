"""Opt-in, deterministic synthetic records for the operational read APIs."""
import argparse
from datetime import datetime, timezone
from uuid import UUID

from geoalchemy2.elements import WKTElement
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.operations import OceanRecord, SeaIceRecord, SeaIceRegion, Station, Vessel, WeatherRecord

SOURCE="polar-dss-milestone-a-demo"; TYPE="synthetic_demo"; VERSION="milestone-a-demo-v1"; STATUS="demo"
def point(lon,lat): return WKTElement(f"POINT({lon} {lat})",srid=4326)
def polygon(lon,lat): return WKTElement(f"MULTIPOLYGON((({lon} {lat},{lon+.4} {lat},{lon+.4} {lat+.3},{lon} {lat+.3},{lon} {lat})))",srid=4326)
def counts(s): return {"vessels":s.query(Vessel).filter_by(source=SOURCE).count(),"stations":s.query(Station).filter_by(source=SOURCE).count(),"sea_ice_regions":s.query(SeaIceRegion).filter_by(source=SOURCE).count(),"sea_ice_records":s.query(SeaIceRecord).filter_by(source=SOURCE).count(),"weather_records":s.query(WeatherRecord).filter_by(source=SOURCE).count(),"ocean_records":s.query(OceanRecord).filter_by(source=SOURCE).count()}
def reset(s:Session):
    for model in (SeaIceRecord,SeaIceRegion,WeatherRecord,OceanRecord,Vessel,Station): s.execute(delete(model).where(model.source==SOURCE))
    s.flush(); return counts(s)
def prov(): return dict(source=SOURCE,source_type=TYPE,processing_version=VERSION,data_status=STATUS,metadata_json={"disclaimer":"Synthetic demo data only; not operational telemetry or a scientific measurement."})
def seed(s:Session):
    reset(s); t=datetime(2026,9,18,14,30,tzinfo=timezone.utc); q=prov()
    s.add_all([
      Vessel(id=UUID("50000000-0000-0000-0000-000000000001"),catalog_id="DEMO-CURRENT",name="Demo Research Vessel",call_sign="DEMO-01",polar_class="Demo PC3",position=point(74.2,-68.85),speed_kts=12.5,heading_deg=268,destination="Synthetic destination",eta="demo",is_current=True,is_ahead=False,observed_at=t,**q),
      Vessel(id=UUID("50000000-0000-0000-0000-000000000002"),catalog_id="DEMO-AHEAD",name="Demo Ahead Vessel",call_sign="DEMO-02",polar_class="Demo PC2",role="Synthetic reconnaissance",position=point(71.8,-68.65),speed_kts=11.2,heading_deg=268,is_current=False,is_ahead=True,observed_at=t,ahead_report_json={"distanceAheadKm":48,"leadCondition":"synthetic demo","vPirepNotes":"Synthetic only; not an operational report."},**q),
      Station(id=UUID("60000000-0000-0000-0000-000000000001"),catalog_id="DEMO-STATION",name="Demo Polar Station",country="Synthetic",position=point(76.187,-69.407),crew=0,science_focus="Synthetic API fixture",operational_status="demo",observed_at=t,**q),
    ])
    region=SeaIceRegion(id=UUID("70000000-0000-0000-0000-000000000001"),catalog_id="DEMO-SEA-ICE",name="Synthetic sea-ice region",geometry=polygon(72.5,-68.5),observed_at=t,**q);s.add(region);s.flush()
    for typ,uid in (("current","80000000-0000-0000-0000-000000000001"),("forecast","80000000-0000-0000-0000-000000000002")):
      s.add(SeaIceRecord(id=UUID(uid),region_id=region.id,record_type=typ,valid_at=t,geometry=polygon(72.5,-68.5),concentration_percent=42,thickness_m=.95,observed_at=t if typ=="current" else None,**q))
    for cls,base,fields in ((WeatherRecord,"90000000-0000-0000-0000-00000000000",dict(air_temperature_c=-12,wind_speed_kts=15.1,wind_direction_deg=315,pressure_hpa=988,visibility_km=10,wave_height_m=2.1,wave_period_s=7.5,freezing_spray_risk="synthetic demo")),(OceanRecord,"a0000000-0000-0000-0000-00000000000",dict(sea_surface_temperature_c=-1.4,current_speed_ms=.6,current_direction_deg=40,wave_height_m=2.1,wave_period_s=7.5))):
      for i,typ in enumerate(("current","forecast"),1): s.add(cls(id=UUID(base+str(i)),record_type=typ,valid_at=t,position=point(74.2,-68.85),observed_at=t if typ=="current" else None,**fields,**q))
    s.flush();return counts(s)
def main():
 p=argparse.ArgumentParser();p.add_argument("--reset",action="store_true");a=p.parse_args()
 with SessionLocal.begin() as s: print(("Reset" if a.reset else "Seeded"),"synthetic operational records:",reset(s) if a.reset else seed(s))
if __name__=="__main__":main()
