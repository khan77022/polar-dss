from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.operations import OceanRecord, SeaIceRecord, SeaIceRegion, Station, Vessel, WeatherRecord
from app.schemas.iceberg import DataStatus, LatLon, Provenance
from app.schemas.operations import EnvironmentResponse, Page, SeaIceRegionResponse, SeaIceResponse, StationResponse, VesselResponse

router = APIRouter()
Limit = Annotated[int, Query(ge=1, le=250)]
Offset = Annotated[int, Query(ge=0)]


def n(value): return float(value) if value is not None else None
def p(lat, lon): return LatLon(lat=float(lat), lon=float(lon))
def provenance(row): return Provenance(source=row.source, sourceId=row.source_id, sourceType=row.source_type, observedAt=row.observed_at, ingestedAt=row.ingested_at, processingVersion=row.processing_version, dataStatus=DataStatus(row.data_status), confidence=n(row.confidence))
def point_query(model): return select(model, func.ST_Y(model.position).label("lat"), func.ST_X(model.position).label("lon"))


@router.get("/vessels/current", response_model=VesselResponse, summary="Get current primary vessel")
def current_vessel(db: Annotated[Session, Depends(get_db)]):
    row = db.execute(point_query(Vessel).where(Vessel.is_current.is_(True)).order_by(Vessel.observed_at.desc().nullslast())).first()
    if not row: raise HTTPException(404, "Current vessel not found")
    v = row[0]; return VesselResponse(id=v.catalog_id, databaseId=v.id, name=v.name, callSign=v.call_sign, polarClass=v.polar_class, role=v.role, currentPos=p(row.lat, row.lon), speedKts=n(v.speed_kts), headingDeg=n(v.heading_deg), destination=v.destination, eta=v.eta, provenance=provenance(v))


@router.get("/vessels/ahead", response_model=Page, summary="List ahead-vessel reports")
def ahead_vessels(db: Annotated[Session, Depends(get_db)], min_lat: float | None = Query(None, ge=-90, le=90), max_lat: float | None = Query(None, ge=-90, le=90), min_lon: float | None = Query(None, ge=-180, le=180), max_lon: float | None = Query(None, ge=-180, le=180), limit: Limit = 100, offset: Offset = 0):
    filters=[Vessel.is_ahead.is_(True)]
    for value, clause in ((min_lat, func.ST_Y(Vessel.position)>=min_lat if min_lat is not None else None),(max_lat, func.ST_Y(Vessel.position)<=max_lat if max_lat is not None else None),(min_lon, func.ST_X(Vessel.position)>=min_lon if min_lon is not None else None),(max_lon, func.ST_X(Vessel.position)<=max_lon if max_lon is not None else None)):
        if value is not None: filters.append(clause)
    if min_lat is not None and max_lat is not None and min_lat > max_lat: raise HTTPException(422, "min_lat must not exceed max_lat")
    total=db.scalar(select(func.count()).select_from(Vessel).where(*filters)) or 0; rows=db.execute(point_query(Vessel).where(*filters).order_by(Vessel.catalog_id).limit(limit).offset(offset)).all()
    return Page(items=[VesselResponse(id=v.catalog_id,databaseId=v.id,name=v.name,callSign=v.call_sign,polarClass=v.polar_class,role=v.role,currentPos=p(lat,lon),speedKts=n(v.speed_kts),headingDeg=n(v.heading_deg),destination=v.destination,eta=v.eta,aheadReport=v.ahead_report_json,provenance=provenance(v)) for v,lat,lon in rows], limit=limit, offset=offset, total=total)


@router.get("/stations", response_model=Page, summary="List stations")
def stations(db: Annotated[Session, Depends(get_db)], limit: Limit = 100, offset: Offset = 0):
    total=db.scalar(select(func.count()).select_from(Station)) or 0; rows=db.execute(point_query(Station).order_by(Station.catalog_id).limit(limit).offset(offset)).all()
    return Page(items=[StationResponse(id=s.catalog_id,databaseId=s.id,name=s.name,country=s.country,position=p(lat,lon),crew=s.crew,scienceFocus=s.science_focus,status=s.operational_status,provenance=provenance(s)) for s,lat,lon in rows],limit=limit,offset=offset,total=total)


@router.get("/stations/{station_id}", response_model=StationResponse, summary="Get a station")
def station(station_id: Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{1,128}$")], db: Annotated[Session, Depends(get_db)]):
    r=db.execute(point_query(Station).where(Station.catalog_id==station_id)).first()
    if not r: raise HTTPException(404,"Station not found")
    s=r[0]; return StationResponse(id=s.catalog_id,databaseId=s.id,name=s.name,country=s.country,position=p(r.lat,r.lon),crew=s.crew,scienceFocus=s.science_focus,status=s.operational_status,provenance=provenance(s))


def sea_ice_list(db, kind, valid_from, valid_to, limit, offset):
    f=[SeaIceRecord.record_type==kind]
    if valid_from: f.append(SeaIceRecord.valid_at>=valid_from)
    if valid_to: f.append(SeaIceRecord.valid_at<=valid_to)
    total=db.scalar(select(func.count()).select_from(SeaIceRecord).where(*f)) or 0
    rows=db.scalars(select(SeaIceRecord).where(*f).order_by(SeaIceRecord.valid_at.desc()).limit(limit).offset(offset)).all()
    return Page(items=[SeaIceResponse(id=x.id,regionId=str(x.region_id) if x.region_id else None,recordType=x.record_type,validAt=x.valid_at,concentrationPercent=n(x.concentration_percent),thicknessM=n(x.thickness_m),provenance=provenance(x)) for x in rows],limit=limit,offset=offset,total=total)

@router.get("/sea-ice/current", response_model=Page, summary="List current sea-ice records")
def sea_ice_current(db: Annotated[Session, Depends(get_db)], valid_from: datetime|None=None, valid_to: datetime|None=None, limit: Limit=100, offset: Offset=0): return sea_ice_list(db,"current",valid_from,valid_to,limit,offset)
@router.get("/sea-ice/forecast", response_model=Page, summary="List sea-ice forecast records")
def sea_ice_forecast(db: Annotated[Session, Depends(get_db)], valid_from: datetime|None=None, valid_to: datetime|None=None, limit: Limit=100, offset: Offset=0): return sea_ice_list(db,"forecast",valid_from,valid_to,limit,offset)
@router.get("/sea-ice/regions", response_model=Page, summary="List sea-ice regions")
def sea_ice_regions(db: Annotated[Session, Depends(get_db)], limit: Limit=100, offset: Offset=0):
    total=db.scalar(select(func.count()).select_from(SeaIceRegion)) or 0; rows=db.scalars(select(SeaIceRegion).order_by(SeaIceRegion.catalog_id).limit(limit).offset(offset)).all(); return Page(items=[SeaIceRegionResponse(id=x.catalog_id,databaseId=x.id,name=x.name,provenance=provenance(x)) for x in rows],limit=limit,offset=offset,total=total)


def environment_list(db, model, kind, valid_from, valid_to, limit, offset, fields):
    f=[model.record_type==kind]
    if valid_from: f.append(model.valid_at>=valid_from)
    if valid_to: f.append(model.valid_at<=valid_to)
    total=db.scalar(select(func.count()).select_from(model).where(*f)) or 0; rows=db.execute(point_query(model).where(*f).order_by(model.valid_at.desc()).limit(limit).offset(offset)).all()
    return Page(items=[EnvironmentResponse(id=x.id,recordType=x.record_type,validAt=x.valid_at,position=p(lat,lon),values={k:n(getattr(x,k)) if not isinstance(getattr(x,k),str) else getattr(x,k) for k in fields},provenance=provenance(x)) for x,lat,lon in rows],limit=limit,offset=offset,total=total)

@router.get("/weather/current",response_model=Page,summary="List current weather records")
def weather_current(db:Annotated[Session,Depends(get_db)],valid_from:datetime|None=None,valid_to:datetime|None=None,limit:Limit=100,offset:Offset=0): return environment_list(db,WeatherRecord,"current",valid_from,valid_to,limit,offset,["air_temperature_c","wind_speed_kts","wind_direction_deg","pressure_hpa","visibility_km","wave_height_m","wave_period_s","freezing_spray_risk"])
@router.get("/weather/forecast",response_model=Page,summary="List weather forecast records")
def weather_forecast(db:Annotated[Session,Depends(get_db)],valid_from:datetime|None=None,valid_to:datetime|None=None,limit:Limit=100,offset:Offset=0): return environment_list(db,WeatherRecord,"forecast",valid_from,valid_to,limit,offset,["air_temperature_c","wind_speed_kts","wind_direction_deg","pressure_hpa","visibility_km","wave_height_m","wave_period_s","freezing_spray_risk"])
@router.get("/ocean/current",response_model=Page,summary="List current ocean records")
def ocean_current(db:Annotated[Session,Depends(get_db)],valid_from:datetime|None=None,valid_to:datetime|None=None,limit:Limit=100,offset:Offset=0): return environment_list(db,OceanRecord,"current",valid_from,valid_to,limit,offset,["sea_surface_temperature_c","current_speed_ms","current_direction_deg","wave_height_m","wave_period_s"])
@router.get("/ocean/forecast",response_model=Page,summary="List ocean forecast records")
def ocean_forecast(db:Annotated[Session,Depends(get_db)],valid_from:datetime|None=None,valid_to:datetime|None=None,limit:Limit=100,offset:Offset=0): return environment_list(db,OceanRecord,"forecast",valid_from,valid_to,limit,offset,["sea_surface_temperature_c","current_speed_ms","current_direction_deg","wave_height_m","wave_period_s"])
