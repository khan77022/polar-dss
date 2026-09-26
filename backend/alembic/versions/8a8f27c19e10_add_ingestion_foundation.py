"""add provider-neutral ingestion foundation

Revision ID: 8a8f27c19e10
Revises: 32e527e342d4
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "8a8f27c19e10"
down_revision = "32e527e342d4"
branch_labels = None
depends_on = None

STATUS = "'observed', 'forecast', 'predicted', 'simulated', 'demo', 'provisional', 'invalid'"

def upgrade() -> None:
    op.create_table("ingestion_sources",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("name", sa.String(255), nullable=False), sa.Column("source_type", sa.String(64), nullable=False), sa.Column("product_id", sa.String(255)), sa.Column("description", sa.Text()), sa.Column("provider_identifier", sa.String(255)), sa.Column("version", sa.String(128)), sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False), sa.Column("metadata_json", postgresql.JSONB()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("name", "source_type", "product_id", "version", name="uq_ingestion_source_product_version"))
    op.create_index("ix_ingestion_sources_active_type", "ingestion_sources", ["active", "source_type"])
    op.create_table("ingestion_runs",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("source_id", sa.UUID(), nullable=False), sa.Column("dataset_product_id", sa.String(255)), sa.Column("status", sa.String(32), server_default="running", nullable=False), sa.Column("dry_run", sa.Boolean(), server_default=sa.text("false"), nullable=False), sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.Column("completed_at", sa.DateTime(timezone=True)), sa.Column("records_discovered", sa.Integer(), server_default="0", nullable=False), sa.Column("records_accepted", sa.Integer(), server_default="0", nullable=False), sa.Column("records_rejected", sa.Integer(), server_default="0", nullable=False), sa.Column("records_skipped_duplicate", sa.Integer(), server_default="0", nullable=False), sa.Column("error_summary", sa.Text()), sa.Column("processing_version", sa.String(128)), sa.Column("configuration_json", postgresql.JSONB()), sa.Column("metadata_json", postgresql.JSONB()),
        sa.CheckConstraint("status IN ('running', 'completed', 'completed_with_errors', 'failed')", name="ck_ingestion_runs_status"), sa.CheckConstraint("records_discovered >= 0 AND records_accepted >= 0 AND records_rejected >= 0 AND records_skipped_duplicate >= 0", name="ck_ingestion_runs_nonnegative_counts"), sa.ForeignKeyConstraint(["source_id"], ["ingestion_sources.id"], ondelete="RESTRICT"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_ingestion_runs_source_started", "ingestion_runs", ["source_id", "started_at"])
    op.create_index("ix_ingestion_runs_status_started", "ingestion_runs", ["status", "started_at"])
    op.create_table("ingestion_lineage",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("source_id", sa.UUID(), nullable=False), sa.Column("ingestion_run_id", sa.UUID(), nullable=False), sa.Column("source_product_id", sa.String(255), nullable=False), sa.Column("source_record_id", sa.String(255), nullable=False), sa.Column("domain_type", sa.String(64), nullable=False), sa.Column("domain_record_id", sa.UUID()), sa.Column("observed_at", sa.DateTime(timezone=True)), sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.Column("processing_version", sa.String(128)), sa.Column("data_status", sa.String(32), nullable=False), sa.Column("metadata_json", postgresql.JSONB()),
        sa.CheckConstraint(f"data_status IN ({STATUS})", name="ck_ingestion_lineage_status"), sa.ForeignKeyConstraint(["source_id"], ["ingestion_sources.id"], ondelete="RESTRICT"), sa.ForeignKeyConstraint(["ingestion_run_id"], ["ingestion_runs.id"], ondelete="RESTRICT"), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("source_id", "source_product_id", "source_record_id", "domain_type", name="uq_ingestion_lineage_source_record"))
    op.create_index("ix_ingestion_lineage_domain_record", "ingestion_lineage", ["domain_type", "domain_record_id"])
    op.create_index("ix_ingestion_lineage_observed_at", "ingestion_lineage", ["observed_at"])
    op.create_table("ingestion_records",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("ingestion_run_id", sa.UUID(), nullable=False), sa.Column("source_id", sa.UUID(), nullable=False), sa.Column("source_product_id", sa.String(255)), sa.Column("source_record_id", sa.String(255)), sa.Column("domain_type", sa.String(64), nullable=False), sa.Column("outcome", sa.String(32), nullable=False), sa.Column("observed_at", sa.DateTime(timezone=True)), sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False), sa.Column("processing_version", sa.String(128)), sa.Column("validation_errors", postgresql.JSONB()), sa.Column("metadata_json", postgresql.JSONB()),
        sa.CheckConstraint("outcome IN ('accepted', 'duplicate', 'rejected', 'failed', 'dry_run')", name="ck_ingestion_records_outcome"), sa.ForeignKeyConstraint(["ingestion_run_id"], ["ingestion_runs.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["source_id"], ["ingestion_sources.id"], ondelete="RESTRICT"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_ingestion_records_run_outcome", "ingestion_records", ["ingestion_run_id", "outcome"])
    op.create_index("ix_ingestion_records_source_identity", "ingestion_records", ["source_id", "source_product_id", "source_record_id"])

def downgrade() -> None:
    op.drop_index("ix_ingestion_records_source_identity", table_name="ingestion_records"); op.drop_index("ix_ingestion_records_run_outcome", table_name="ingestion_records"); op.drop_table("ingestion_records")
    op.drop_index("ix_ingestion_lineage_observed_at", table_name="ingestion_lineage"); op.drop_index("ix_ingestion_lineage_domain_record", table_name="ingestion_lineage"); op.drop_table("ingestion_lineage")
    op.drop_index("ix_ingestion_runs_status_started", table_name="ingestion_runs"); op.drop_index("ix_ingestion_runs_source_started", table_name="ingestion_runs"); op.drop_table("ingestion_runs")
    op.drop_index("ix_ingestion_sources_active_type", table_name="ingestion_sources"); op.drop_table("ingestion_sources")
