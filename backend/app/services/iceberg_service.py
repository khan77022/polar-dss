from collections import defaultdict
from datetime import datetime

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.iceberg import Iceberg, IcebergObservation, Trajectory, TrajectoryPoint
from app.schemas.iceberg import (
    DataStatus,
    DimensionsKm,
    IcebergPage,
    IcebergResponse,
    LatLon,
    ObservationPage,
    ObservationResponse,
    Provenance,
    TrajectoryPage,
    TrajectoryPointResponse,
    TrajectoryResponse,
    TrajectoryType,
)


def _number(value):
    return float(value) if value is not None else None


def _position(lat, lon) -> LatLon | None:
    return LatLon(lat=float(lat), lon=float(lon)) if lat is not None and lon is not None else None


def _provenance(record) -> Provenance:
    return Provenance(
        source=record.source,
        sourceId=record.source_id,
        sourceType=record.source_type,
        observedAt=getattr(record, "observed_at", None),
        ingestedAt=getattr(record, "ingested_at", None),
        processingVersion=record.processing_version,
        dataStatus=DataStatus(record.data_status),
        confidence=_number(record.confidence),
    )


def _iceberg_response(iceberg: Iceberg, lat, lon) -> IcebergResponse:
    return IcebergResponse(
        id=iceberg.catalog_id,
        databaseId=iceberg.id,
        name=iceberg.name,
        classification=iceberg.classification,
        currentPos=_position(lat, lon),
        dimensionsKm=DimensionsKm(
            length=_number(iceberg.length_km),
            width=_number(iceberg.width_km),
            heightAboveWaterM=_number(iceberg.height_above_water_m),
        ),
        areaSqKm=_number(iceberg.area_sq_km),
        driftSpeedKts=_number(iceberg.drift_speed_kts),
        driftDirectionDeg=_number(iceberg.drift_direction_deg),
        riskLevel=iceberg.risk_level,
        origin=iceberg.origin,
        calveYear=iceberg.calve_year,
        imageUrl=iceberg.image_url,
        imageCaption=iceberg.image_caption,
        provenance=_provenance(iceberg),
        createdAt=iceberg.created_at,
        updatedAt=iceberg.updated_at,
    )


def _iceberg_query() -> Select:
    return select(
        Iceberg,
        func.ST_Y(Iceberg.current_position).label("lat"),
        func.ST_X(Iceberg.current_position).label("lon"),
    )


def list_icebergs(
    db: Session,
    *,
    min_lat: float | None,
    max_lat: float | None,
    min_lon: float | None,
    max_lon: float | None,
    risk_level: str | None,
    data_status: DataStatus | None,
    limit: int,
    offset: int,
) -> IcebergPage:
    query = _iceberg_query()
    count_query = select(func.count()).select_from(Iceberg)
    filters = []
    if min_lat is not None:
        filters.append(func.ST_Y(Iceberg.current_position) >= min_lat)
    if max_lat is not None:
        filters.append(func.ST_Y(Iceberg.current_position) <= max_lat)
    if min_lon is not None:
        filters.append(func.ST_X(Iceberg.current_position) >= min_lon)
    if max_lon is not None:
        filters.append(func.ST_X(Iceberg.current_position) <= max_lon)
    if risk_level:
        filters.append(Iceberg.risk_level == risk_level)
    if data_status:
        filters.append(Iceberg.data_status == data_status.value)
    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)
    total = db.scalar(count_query) or 0
    rows = db.execute(query.order_by(Iceberg.catalog_id).limit(limit).offset(offset)).all()
    return IcebergPage(items=[_iceberg_response(row[0], row.lat, row.lon) for row in rows], limit=limit, offset=offset, total=total)


def get_iceberg(db: Session, catalog_id: str) -> IcebergResponse | None:
    row = db.execute(_iceberg_query().where(Iceberg.catalog_id == catalog_id)).first()
    return _iceberg_response(row[0], row.lat, row.lon) if row else None


def get_history(
    db: Session,
    catalog_id: str,
    *,
    observed_from: datetime | None,
    observed_to: datetime | None,
    data_status: DataStatus | None,
    limit: int,
    offset: int,
) -> ObservationPage | None:
    iceberg_id = db.scalar(select(Iceberg.id).where(Iceberg.catalog_id == catalog_id))
    if iceberg_id is None:
        return None
    filters = [IcebergObservation.iceberg_id == iceberg_id]
    if observed_from:
        filters.append(IcebergObservation.observed_at >= observed_from)
    if observed_to:
        filters.append(IcebergObservation.observed_at <= observed_to)
    if data_status:
        filters.append(IcebergObservation.data_status == data_status.value)
    total = db.scalar(select(func.count()).select_from(IcebergObservation).where(*filters)) or 0
    rows = db.execute(
        select(
            IcebergObservation,
            func.ST_Y(func.ST_Centroid(IcebergObservation.position)).label("position_lat"),
            func.ST_X(func.ST_Centroid(IcebergObservation.position)).label("position_lon"),
            func.ST_Y(IcebergObservation.centroid).label("centroid_lat"),
            func.ST_X(IcebergObservation.centroid).label("centroid_lon"),
            func.ST_IsEmpty(IcebergObservation.footprint).label("footprint_empty"),
        )
        .where(*filters)
        .order_by(IcebergObservation.observed_at.desc(), IcebergObservation.id)
        .limit(limit)
        .offset(offset)
    ).all()
    items = []
    for row in rows:
        observation = row[0]
        items.append(ObservationResponse(
            id=observation.id, icebergId=catalog_id, observedAt=observation.observed_at,
            position=_position(row.position_lat, row.position_lon), centroid=_position(row.centroid_lat, row.centroid_lon),
            lengthKm=_number(observation.length_km), widthKm=_number(observation.width_km), areaSqKm=_number(observation.area_sq_km),
            orientationDeg=_number(observation.orientation_deg), speedKts=_number(observation.speed_kts), directionDeg=_number(observation.direction_deg),
            observationType=observation.observation_type, provenance=_provenance(observation), hasFootprint=row.footprint_empty is False,
        ))
    return ObservationPage(items=items, limit=limit, offset=offset, total=total)


def get_trajectories(
    db: Session,
    catalog_id: str,
    *,
    trajectory_type: TrajectoryType | None,
    reference_from: datetime | None,
    reference_to: datetime | None,
    data_status: DataStatus | None,
    limit: int,
    offset: int,
) -> TrajectoryPage | None:
    iceberg_id = db.scalar(select(Iceberg.id).where(Iceberg.catalog_id == catalog_id))
    if iceberg_id is None:
        return None
    filters = [Trajectory.iceberg_id == iceberg_id]
    if trajectory_type:
        filters.append(Trajectory.trajectory_type == trajectory_type.value)
    if reference_from:
        filters.append(Trajectory.reference_time >= reference_from)
    if reference_to:
        filters.append(Trajectory.reference_time <= reference_to)
    if data_status:
        filters.append(Trajectory.data_status == data_status.value)
    total = db.scalar(select(func.count()).select_from(Trajectory).where(*filters)) or 0
    trajectories = db.scalars(
        select(Trajectory).where(*filters).order_by(Trajectory.reference_time.desc().nullslast(), Trajectory.created_at.desc()).limit(limit).offset(offset)
    ).all()
    trajectory_ids = [trajectory.id for trajectory in trajectories]
    point_rows = db.execute(
        select(TrajectoryPoint, func.ST_Y(TrajectoryPoint.position).label("lat"), func.ST_X(TrajectoryPoint.position).label("lon"))
        .where(TrajectoryPoint.trajectory_id.in_(trajectory_ids))
        .order_by(TrajectoryPoint.trajectory_id, TrajectoryPoint.sequence_number)
    ).all() if trajectory_ids else []
    points_by_trajectory = defaultdict(list)
    for row in point_rows:
        point = row[0]
        points_by_trajectory[point.trajectory_id].append(TrajectoryPointResponse(
            sequenceNumber=point.sequence_number, timestamp=point.timestamp, position=_position(row.lat, row.lon), speedKts=_number(point.speed_kts),
            directionDeg=_number(point.direction_deg), uncertaintyRadiusKm=_number(point.uncertainty_radius_km), provenance=_provenance(point),
        ))
    items = [TrajectoryResponse(
        id=trajectory.id, icebergId=catalog_id, trajectoryType=TrajectoryType(trajectory.trajectory_type), referenceTime=trajectory.reference_time,
        validFrom=trajectory.valid_from, validTo=trajectory.valid_to, generatedAt=trajectory.generated_at, provenance=_provenance(trajectory),
        modelName=trajectory.model_name, modelVersion=trajectory.model_version, points=points_by_trajectory[trajectory.id],
    ) for trajectory in trajectories]
    return TrajectoryPage(items=items, limit=limit, offset=offset, total=total)
