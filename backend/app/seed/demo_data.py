"""Deterministic synthetic records for exercising the Phase 3 read APIs.

This module never represents its coordinates or tracks as scientific observations.
Every row it creates uses ``data_status='demo'`` and a dedicated synthetic source.
"""

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from geoalchemy2.elements import WKTElement
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.iceberg import Iceberg, IcebergObservation, Trajectory, TrajectoryPoint

DEMO_SOURCE = "polar-dss-phase4-demo"
DEMO_SOURCE_TYPE = "synthetic_demo"
DEMO_PROCESSING_VERSION = "phase4-demo-v1"
DEMO_STATUS = "demo"


class SeedConflictError(RuntimeError):
    """A stable demo catalog ID is already owned by a non-demo record."""


@dataclass(frozen=True)
class DemoIceberg:
    id: UUID
    catalog_id: str
    name: str
    classification: str
    lat: float
    lon: float
    length_km: float
    width_km: float
    height_m: float
    area_sq_km: float
    speed_kts: float
    direction_deg: float
    risk_level: str
    origin: str
    calve_year: int


DEMO_ICEBERGS = (
    DemoIceberg(UUID("10000000-0000-0000-0000-000000000001"), "A68A", "A68A (synthetic demo)", "Demo tabular iceberg", -63.85, -56.20, 82, 28, 35, 2296, 1.4, 325, "high", "Synthetic demonstration origin", 2017),
    DemoIceberg(UUID("10000000-0000-0000-0000-000000000002"), "A76", "A76 (synthetic demo)", "Demo tabular iceberg", -66.10, -50.80, 54, 20, 40, 1080, 0.9, 340, "medium", "Synthetic demonstration origin", 2021),
    DemoIceberg(UUID("10000000-0000-0000-0000-000000000003"), "D28", "D28 (synthetic demo)", "Demo tabular iceberg", -68.35, 72.80, 30, 14, 32, 420, 1.4, 295, "high", "Synthetic demonstration origin", 2019),
)


def _point(lon: float, lat: float) -> WKTElement:
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def _line(points: list[tuple[float, float]]) -> WKTElement:
    return WKTElement("LINESTRING(" + ", ".join(f"{lon} {lat}" for lat, lon in points) + ")", srid=4326)


def _counts(session: Session) -> dict[str, int]:
    return {
        "icebergs": session.query(Iceberg).filter(Iceberg.source == DEMO_SOURCE).count(),
        "iceberg_observations": session.query(IcebergObservation).filter(IcebergObservation.source == DEMO_SOURCE).count(),
        "trajectories": session.query(Trajectory).filter(Trajectory.source == DEMO_SOURCE).count(),
        "trajectory_points": session.query(TrajectoryPoint).filter(TrajectoryPoint.source == DEMO_SOURCE).count(),
    }


def reset_demo_data(session: Session) -> dict[str, int]:
    """Remove only records created by this exact synthetic-data source."""
    trajectory_ids = select(Trajectory.id).where(Trajectory.source == DEMO_SOURCE)
    session.execute(delete(TrajectoryPoint).where(TrajectoryPoint.trajectory_id.in_(trajectory_ids)))
    session.execute(delete(Trajectory).where(Trajectory.source == DEMO_SOURCE))
    session.execute(delete(IcebergObservation).where(IcebergObservation.source == DEMO_SOURCE))
    session.execute(delete(Iceberg).where(Iceberg.source == DEMO_SOURCE))
    session.flush()
    return _counts(session)


def _check_catalog_conflicts(session: Session) -> None:
    existing = session.scalars(select(Iceberg).where(Iceberg.catalog_id.in_([berg.catalog_id for berg in DEMO_ICEBERGS]))).all()
    conflicts = [berg.catalog_id for berg in existing if berg.source != DEMO_SOURCE]
    if conflicts:
        raise SeedConflictError(
            "Refusing to replace non-demo iceberg records with stable demo IDs: " + ", ".join(sorted(conflicts))
        )


def seed_demo_data(session: Session) -> dict[str, int]:
    """Replace this seed's records with a small, deterministic synthetic dataset."""
    _check_catalog_conflicts(session)
    reset_demo_data(session)
    reference_time = datetime(2026, 9, 18, 14, 30, tzinfo=timezone.utc)

    for berg_index, berg in enumerate(DEMO_ICEBERGS, start=1):
        session.add(Iceberg(
            id=berg.id, catalog_id=berg.catalog_id, name=berg.name, classification=berg.classification,
            current_position=_point(berg.lon, berg.lat), length_km=berg.length_km, width_km=berg.width_km,
            height_above_water_m=berg.height_m, area_sq_km=berg.area_sq_km, drift_speed_kts=berg.speed_kts,
            drift_direction_deg=berg.direction_deg, risk_level=berg.risk_level, origin=berg.origin, calve_year=berg.calve_year,
            source=DEMO_SOURCE, source_id=f"phase4-{berg.catalog_id}", source_type=DEMO_SOURCE_TYPE,
            observed_at=reference_time, processing_version=DEMO_PROCESSING_VERSION, data_status=DEMO_STATUS,
            metadata_json={"disclaimer": "Synthetic demo record. Not a satellite observation or scientific measurement."},
        ))
        observation_points = [(berg.lat - 0.55, berg.lon + 0.70), (berg.lat - 0.25, berg.lon + 0.35), (berg.lat, berg.lon)]
        for observation_index, (lat, lon) in enumerate(observation_points):
            session.add(IcebergObservation(
                id=UUID(f"20000000-0000-0000-{berg_index:04d}-{observation_index + 1:012d}"), iceberg_id=berg.id,
                observed_at=reference_time - timedelta(hours=48 - (observation_index * 24)), position=_point(lon, lat), centroid=_point(lon, lat),
                length_km=berg.length_km, width_km=berg.width_km, area_sq_km=berg.area_sq_km, speed_kts=berg.speed_kts,
                direction_deg=berg.direction_deg, source=DEMO_SOURCE, source_id=f"phase4-{berg.catalog_id}-obs-{observation_index}",
                source_type=DEMO_SOURCE_TYPE, processing_version=DEMO_PROCESSING_VERSION, data_status=DEMO_STATUS,
                observation_type="synthetic_demo", metadata_json={"disclaimer": "Synthetic demo observation; not satellite-derived."},
            ))
        for trajectory_index, trajectory_type in enumerate(("observed", "predicted"), start=1):
            trajectory_id = UUID(f"30000000-0000-0000-{berg_index:04d}-{trajectory_index:012d}")
            if trajectory_type == "observed":
                points = observation_points
                timestamps = [reference_time - timedelta(hours=48), reference_time - timedelta(hours=24), reference_time]
            else:
                points = [(berg.lat, berg.lon), (berg.lat + 0.45, berg.lon - 0.9), (berg.lat + 0.85, berg.lon - 1.8)]
                timestamps = [reference_time, reference_time + timedelta(hours=24), reference_time + timedelta(hours=48)]
            session.add(Trajectory(
                id=trajectory_id, iceberg_id=berg.id, trajectory_type=trajectory_type, reference_time=reference_time,
                valid_from=timestamps[0], valid_to=timestamps[-1], generated_at=reference_time, geometry=_line(points),
                source=DEMO_SOURCE, source_id=f"phase4-{berg.catalog_id}-{trajectory_type}", source_type=DEMO_SOURCE_TYPE,
                processing_version=DEMO_PROCESSING_VERSION, data_status=DEMO_STATUS,
                metadata_json={"disclaimer": f"Synthetic demo {trajectory_type} trajectory; not a validated forecast or prediction."},
            ))
            for point_index, ((lat, lon), timestamp) in enumerate(zip(points, timestamps)):
                session.add(TrajectoryPoint(
                    id=UUID(f"40000000-0000-{berg_index:04d}-{trajectory_index:04d}-{point_index + 1:012d}"), trajectory_id=trajectory_id,
                    sequence_number=point_index, timestamp=timestamp, position=_point(lon, lat), speed_kts=berg.speed_kts,
                    direction_deg=berg.direction_deg, uncertainty_radius_km=(point_index + 1) * 3.5 if trajectory_type == "predicted" else 0,
                    source=DEMO_SOURCE, source_id=f"phase4-{berg.catalog_id}-{trajectory_type}-{point_index}", source_type=DEMO_SOURCE_TYPE,
                    observed_at=timestamp if trajectory_type == "observed" else None, processing_version=DEMO_PROCESSING_VERSION,
                    data_status=DEMO_STATUS, metadata_json={"disclaimer": "Synthetic demo trajectory point."},
                ))
    session.flush()
    return _counts(session)


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage the explicitly synthetic Polar DSS demo dataset.")
    parser.add_argument("--reset", action="store_true", help="Remove only records created by this seed source.")
    args = parser.parse_args()
    with SessionLocal.begin() as session:
        counts = reset_demo_data(session) if args.reset else seed_demo_data(session)
    action = "Reset" if args.reset else "Seeded"
    print(f"{action} synthetic/demo records: {counts}")


if __name__ == "__main__":
    main()
