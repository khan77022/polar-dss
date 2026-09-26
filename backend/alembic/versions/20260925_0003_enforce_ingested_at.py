"""enforce iceberg ingest timestamps

Revision ID: 20260925_0003
Revises: 20260925_0002
Create Date: 2026-09-25 00:10:00
"""

from alembic import op
import sqlalchemy as sa

revision = "20260925_0003"
down_revision = "20260925_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("icebergs", "ingested_at", existing_type=sa.DateTime(timezone=True), nullable=False)


def downgrade() -> None:
    op.alter_column("icebergs", "ingested_at", existing_type=sa.DateTime(timezone=True), nullable=True)
