"""create extensible iceberg foundation

Revision ID: 20260925_0001
Revises:
Create Date: 2026-09-25 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

revision = "20260925_0001"
down_revision = None
branch_labels = None
depends_on = None

DATA_STATUS = "'observed', 'forecast', 'predicted', 'simulated', 'demo', 'provisional', 'invalid'"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    uuid = postgresql.UUID(as_uuid=True)
    jsonb = postgresql.JSONB(astext_type=sa.Text())

    op.create_table(
        "icebergs",
        sa.Column("id", uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("catalog_id", sa.String(128), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("classification", sa.String(255)),
        sa.Column("current_position", Geometry("POINT", srid=4326)),
        sa.Column("length_km", sa.Numeric(10, 3)), sa.Column("width_km", sa.Numeric(10, 3)),
        sa.Column("height_above_water_m", sa.Numeric(10, 3)), sa.Column("area_sq_km", sa.Numeric(12, 3)),
        sa.Column("drift_speed_kts", sa.Numeric(8, 3)), sa.Column("drift_direction_deg", sa.Numeric(6, 2)),
        sa.Column("risk_level", sa.String(32)), sa.Column("origin", sa.String(255)), sa.Column("calve_year", sa.Integer()),
        sa.Column("image_url", sa.Text()), sa.Column("image_caption", sa.Text()),
        sa.Column("source", sa.String(255)), sa.Column("source_id", sa.String(255)), sa.Column("source_type", sa.String(64)),
        sa.Column("observed_at", sa.DateTime(timezone=True)), sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("processing_version", sa.String(128)), sa.Column("data_status", sa.String(32), nullable=False, server_default="provisional"),
        sa.Column("confidence", sa.Numeric(5, 4)), sa.Column("metadata_json", jsonb),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("catalog_id", name="uq_icebergs_catalog_id"),
        sa.CheckConstraint(f"data_status IN ({DATA_STATUS})", name="ck_icebergs_data_status"),
        sa.CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name="ck_icebergs_confidence"),
    )
    op.create_index("ix_icebergs_current_position_gist", "icebergs", ["current_position"], postgresql_using="gist")
    op.create_index("ix_icebergs_observed_at", "icebergs", ["observed_at"])

    op.create_table(
        "iceberg_observations",
        sa.Column("id", uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("iceberg_id", uuid, sa.ForeignKey("icebergs.id", ondelete="SET NULL")),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False), sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("position", Geometry("GEOMETRY", srid=4326), nullable=False), sa.Column("centroid", Geometry("POINT", srid=4326)), sa.Column("footprint", Geometry("MULTIPOLYGON", srid=4326)),
        sa.Column("length_km", sa.Numeric(10, 3)), sa.Column("width_km", sa.Numeric(10, 3)), sa.Column("area_sq_km", sa.Numeric(12, 3)), sa.Column("orientation_deg", sa.Numeric(6, 2)),
        sa.Column("speed_kts", sa.Numeric(8, 3)), sa.Column("direction_deg", sa.Numeric(6, 2)),
        sa.Column("source", sa.String(255), nullable=False), sa.Column("source_id", sa.String(255)), sa.Column("source_type", sa.String(64), nullable=False),
        sa.Column("processing_version", sa.String(128)), sa.Column("data_status", sa.String(32), nullable=False), sa.Column("confidence", sa.Numeric(5, 4)), sa.Column("observation_type", sa.String(64), nullable=False),
        sa.Column("shape_metadata", jsonb), sa.Column("metadata_json", jsonb), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(f"data_status IN ({DATA_STATUS})", name="ck_iceberg_observations_data_status"),
        sa.CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name="ck_iceberg_observations_confidence"),
    )
    op.create_index("ix_iceberg_observations_position_gist", "iceberg_observations", ["position"], postgresql_using="gist")
    op.create_index("ix_iceberg_observations_centroid_gist", "iceberg_observations", ["centroid"], postgresql_using="gist")
    op.create_index("ix_iceberg_observations_footprint_gist", "iceberg_observations", ["footprint"], postgresql_using="gist")
    op.create_index("ix_iceberg_observations_iceberg_observed_at", "iceberg_observations", ["iceberg_id", "observed_at"])
    op.create_index("ix_iceberg_observations_observed_at", "iceberg_observations", ["observed_at"])

    op.create_table(
        "trajectories",
        sa.Column("id", uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")), sa.Column("iceberg_id", uuid, sa.ForeignKey("icebergs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trajectory_type", sa.String(32), nullable=False), sa.Column("reference_time", sa.DateTime(timezone=True)), sa.Column("valid_from", sa.DateTime(timezone=True)), sa.Column("valid_to", sa.DateTime(timezone=True)), sa.Column("generated_at", sa.DateTime(timezone=True)),
        sa.Column("geometry", Geometry("LINESTRING", srid=4326)), sa.Column("source", sa.String(255)), sa.Column("source_id", sa.String(255)), sa.Column("source_type", sa.String(64)), sa.Column("processing_version", sa.String(128)),
        sa.Column("data_status", sa.String(32), nullable=False), sa.Column("confidence", sa.Numeric(5, 4)), sa.Column("model_name", sa.String(255)), sa.Column("model_version", sa.String(128)), sa.Column("metadata_json", jsonb),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("trajectory_type IN ('observed', 'forecast', 'predicted')", name="ck_trajectories_type"), sa.CheckConstraint(f"data_status IN ({DATA_STATUS})", name="ck_trajectories_data_status"), sa.CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name="ck_trajectories_confidence"),
    )
    op.create_index("ix_trajectories_geometry_gist", "trajectories", ["geometry"], postgresql_using="gist")
    op.create_index("ix_trajectories_iceberg_type_reference", "trajectories", ["iceberg_id", "trajectory_type", "reference_time"])
    op.create_index("ix_trajectories_valid_range", "trajectories", ["valid_from", "valid_to"])

    op.create_table(
        "trajectory_points",
        sa.Column("id", uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")), sa.Column("trajectory_id", uuid, sa.ForeignKey("trajectories.id", ondelete="CASCADE"), nullable=False), sa.Column("sequence_number", sa.Integer(), nullable=False), sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("position", Geometry("POINT", srid=4326), nullable=False), sa.Column("speed_kts", sa.Numeric(8, 3)), sa.Column("direction_deg", sa.Numeric(6, 2)), sa.Column("uncertainty_radius_km", sa.Numeric(10, 3)),
        sa.Column("source", sa.String(255)), sa.Column("source_id", sa.String(255)), sa.Column("source_type", sa.String(64)), sa.Column("observed_at", sa.DateTime(timezone=True)), sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("processing_version", sa.String(128)), sa.Column("data_status", sa.String(32), nullable=False), sa.Column("confidence", sa.Numeric(5, 4)), sa.Column("metadata_json", jsonb), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("trajectory_id", "sequence_number", name="uq_trajectory_points_sequence"), sa.CheckConstraint(f"data_status IN ({DATA_STATUS})", name="ck_trajectory_points_data_status"), sa.CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name="ck_trajectory_points_confidence"),
    )
    op.create_index("ix_trajectory_points_position_gist", "trajectory_points", ["position"], postgresql_using="gist")
    op.create_index("ix_trajectory_points_trajectory_timestamp", "trajectory_points", ["trajectory_id", "timestamp"])
    op.create_index("ix_trajectory_points_timestamp", "trajectory_points", ["timestamp"])


def downgrade() -> None:
    op.drop_table("trajectory_points")
    op.drop_table("trajectories")
    op.drop_table("iceberg_observations")
    op.drop_table("icebergs")
