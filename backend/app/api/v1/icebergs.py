from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.iceberg import DataStatus, IcebergPage, IcebergResponse, ObservationPage, TrajectoryPage, TrajectoryType
from app.services.iceberg_service import get_history, get_iceberg, get_trajectories, list_icebergs

router = APIRouter(prefix="/icebergs")
IcebergId = Annotated[str, Path(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$", description="Stable iceberg catalog identifier, for example A68A.")]
PageLimit = Annotated[int, Query(ge=1, le=250, description="Maximum records returned.")]
PageOffset = Annotated[int, Query(ge=0, description="Number of records to skip.")]


@router.get("", response_model=IcebergPage, summary="List icebergs")
def list_icebergs_endpoint(
    db: Annotated[Session, Depends(get_db)],
    min_lat: float | None = Query(default=None, ge=-90, le=90), max_lat: float | None = Query(default=None, ge=-90, le=90),
    min_lon: float | None = Query(default=None, ge=-180, le=180), max_lon: float | None = Query(default=None, ge=-180, le=180),
    risk_level: str | None = Query(default=None, pattern="^(low|medium|high)$"), data_status: DataStatus | None = None,
    limit: PageLimit = 100, offset: PageOffset = 0,
) -> IcebergPage:
    if (min_lat is not None and max_lat is not None and min_lat > max_lat) or (min_lon is not None and max_lon is not None and min_lon > max_lon):
        raise HTTPException(status_code=422, detail="Minimum geographic bounds must not exceed maximum bounds.")
    return list_icebergs(db, min_lat=min_lat, max_lat=max_lat, min_lon=min_lon, max_lon=max_lon, risk_level=risk_level, data_status=data_status, limit=limit, offset=offset)


@router.get("/{iceberg_id}", response_model=IcebergResponse, summary="Get an iceberg")
def iceberg_detail(iceberg_id: IcebergId, db: Annotated[Session, Depends(get_db)]) -> IcebergResponse:
    iceberg = get_iceberg(db, iceberg_id)
    if iceberg is None:
        raise HTTPException(status_code=404, detail="Iceberg not found")
    return iceberg


@router.get("/{iceberg_id}/history", response_model=ObservationPage, summary="Get iceberg observation history")
def iceberg_history(
    iceberg_id: IcebergId, db: Annotated[Session, Depends(get_db)], observed_from: datetime | None = None, observed_to: datetime | None = None,
    data_status: DataStatus | None = None, limit: PageLimit = 100, offset: PageOffset = 0,
) -> ObservationPage:
    if observed_from and observed_to and observed_from > observed_to:
        raise HTTPException(status_code=422, detail="observed_from must not be after observed_to")
    result = get_history(db, iceberg_id, observed_from=observed_from, observed_to=observed_to, data_status=data_status, limit=limit, offset=offset)
    if result is None:
        raise HTTPException(status_code=404, detail="Iceberg not found")
    return result


@router.get("/{iceberg_id}/trajectory", response_model=TrajectoryPage, summary="Get iceberg trajectories")
def iceberg_trajectory(
    iceberg_id: IcebergId, db: Annotated[Session, Depends(get_db)], trajectory_type: TrajectoryType | None = None,
    reference_from: datetime | None = None, reference_to: datetime | None = None, data_status: DataStatus | None = None,
    limit: PageLimit = 25, offset: PageOffset = 0,
) -> TrajectoryPage:
    if reference_from and reference_to and reference_from > reference_to:
        raise HTTPException(status_code=422, detail="reference_from must not be after reference_to")
    result = get_trajectories(db, iceberg_id, trajectory_type=trajectory_type, reference_from=reference_from, reference_to=reference_to, data_status=data_status, limit=limit, offset=offset)
    if result is None:
        raise HTTPException(status_code=404, detail="Iceberg not found")
    return result
