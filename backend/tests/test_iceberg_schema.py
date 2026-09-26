import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import engine


@pytest.fixture(scope="module")
def database_connection():
    try:
        with engine.connect() as connection:
            yield connection
    except SQLAlchemyError as exc:
        pytest.skip(f"PostGIS integration database is unavailable: {exc}")


def test_phase_2_tables_and_postgis_extension_exist(database_connection) -> None:
    inspector = inspect(database_connection)
    assert {"icebergs", "iceberg_observations", "trajectories", "trajectory_points"} <= set(inspector.get_table_names())
    assert database_connection.execute(text("SELECT postgis_version()")).scalar_one()


def test_phase_2_spatial_indexes_exist(database_connection) -> None:
    index_names = database_connection.execute(
        text(
            "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' "
            "AND indexname IN ('ix_icebergs_current_position_gist', 'ix_iceberg_observations_position_gist', "
            "'ix_trajectories_geometry_gist', 'ix_trajectory_points_position_gist')"
        )
    ).scalars().all()
    assert len(index_names) == 4


def test_phase_2_constraints_reject_invalid_status(database_connection) -> None:
    with pytest.raises(Exception):
        with database_connection.begin_nested():
            database_connection.execute(
                text(
                    "INSERT INTO icebergs (catalog_id, name, data_status) "
                    "VALUES ('schema-constraint-test', 'constraint test', 'fabricated')"
                )
            )
