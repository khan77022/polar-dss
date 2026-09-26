"""add confidence bounds

Revision ID: 20260925_0002
Revises: 20260925_0001
Create Date: 2026-09-25 00:05:00
"""

from alembic import op

revision = "20260925_0002"
down_revision = "20260925_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_icebergs_confidence", "icebergs", "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)")
    op.create_check_constraint("ck_trajectories_confidence", "trajectories", "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)")
    op.create_check_constraint("ck_trajectory_points_confidence", "trajectory_points", "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)")


def downgrade() -> None:
    op.drop_constraint("ck_trajectory_points_confidence", "trajectory_points", type_="check")
    op.drop_constraint("ck_trajectories_confidence", "trajectories", type_="check")
    op.drop_constraint("ck_icebergs_confidence", "icebergs", type_="check")
