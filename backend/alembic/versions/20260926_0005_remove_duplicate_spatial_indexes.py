"""remove duplicate GeoAlchemy spatial indexes

Revision ID: 20260926_0005
Revises: fbb535968e86
Create Date: 2026-09-26 00:30:00
"""
from alembic import op

revision="20260926_0005"
down_revision="fbb535968e86"
branch_labels=None
depends_on=None

_INDEXES=(
    ("idx_ocean_records_position","ocean_records"),("idx_sea_ice_records_geometry","sea_ice_records"),
    ("idx_sea_ice_regions_geometry","sea_ice_regions"),("idx_stations_position","stations"),
    ("idx_vessels_position","vessels"),("idx_weather_records_position","weather_records"),
)
def upgrade():
    for name,table in _INDEXES: op.drop_index(name,table_name=table)
def downgrade():
    for name,table in _INDEXES:
        column="geometry" if "sea_ice" in table else "position"
        op.create_index(name,table,[column],postgresql_using="gist")
