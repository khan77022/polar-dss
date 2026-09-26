"""Persistence boundary for external ML outputs; deliberately contains no ML logic."""
from datetime import datetime, timezone
from uuid import uuid4
from geoalchemy2 import WKTElement
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.iceberg import Iceberg, Trajectory, TrajectoryPoint
from app.models.ingestion import IngestionLineage, IngestionRecord, IngestionSource
from app.models.intelligence import BehaviorProfile
from app.services.ingestion import IngestionService

def source_for(db: Session, p):
    x=db.scalar(select(IngestionSource).where(IngestionSource.name==p.source,IngestionSource.source_type==p.sourceType,IngestionSource.product_id==p.sourceProductId,IngestionSource.version==p.processingVersion))
    if x:return x
    x=IngestionSource(name=p.source,source_type=p.sourceType,product_id=p.sourceProductId,version=p.processingVersion,description="External ML output provider; processing success is not scientific validation.",metadata_json={"externalMl":True});db.add(x);db.flush();return x

def iceberg_for(db, catalog):
    return db.scalar(select(Iceberg).where(Iceberg.catalog_id==catalog))

def persist_trajectory(db, iceberg, payload):
    source=source_for(db,payload.provenance); run=IngestionService(db).start_run(source,processing_version=payload.provenance.processingVersion,configuration={"externalMl":True,"output":"trajectory"})
    exists=db.scalar(select(IngestionLineage).where(IngestionLineage.source_id==source.id,IngestionLineage.source_product_id==payload.provenance.sourceProductId,IngestionLineage.source_record_id==payload.provenance.sourceRecordId,IngestionLineage.domain_type=="predicted_trajectory"))
    if exists: raise ValueError("duplicate external trajectory output")
    t=Trajectory(id=uuid4(),iceberg_id=iceberg.id,trajectory_type="predicted",reference_time=payload.generatedAt,valid_from=payload.validFrom,valid_to=payload.validTo,generated_at=payload.generatedAt,source=payload.provenance.source,source_id=payload.provenance.sourceRecordId,source_type=payload.provenance.sourceType,processing_version=payload.provenance.processingVersion,data_status="predicted",confidence=payload.confidence,model_name=payload.modelName,model_version=payload.modelVersion,metadata_json={"limitations":payload.limitations,"externalMl":True});db.add(t);db.flush()
    for seq,x in enumerate(payload.points): db.add(TrajectoryPoint(trajectory_id=t.id,sequence_number=seq,timestamp=x.timestamp,position=WKTElement(f"POINT({x.position.lon} {x.position.lat})",srid=4326),uncertainty_radius_km=x.uncertaintyRadiusKm,source=payload.provenance.source,source_id=payload.provenance.sourceRecordId,source_type=payload.provenance.sourceType,observed_at=payload.generatedAt,processing_version=payload.provenance.processingVersion,data_status="predicted",confidence=payload.confidence))
    db.add(IngestionLineage(source_id=source.id,ingestion_run_id=run.id,source_product_id=payload.provenance.sourceProductId,source_record_id=payload.provenance.sourceRecordId,domain_type="predicted_trajectory",domain_record_id=t.id,observed_at=payload.generatedAt,processing_version=payload.provenance.processingVersion,data_status="predicted",metadata_json={"modelName":payload.modelName,"modelVersion":payload.modelVersion,"limitations":payload.limitations}))
    db.add(IngestionRecord(ingestion_run_id=run.id,source_id=source.id,source_product_id=payload.provenance.sourceProductId,source_record_id=payload.provenance.sourceRecordId,domain_type="predicted_trajectory",outcome="accepted",observed_at=payload.generatedAt,processing_version=payload.provenance.processingVersion));run.records_discovered=run.records_accepted=1;run.status="completed";run.completed_at=datetime.now(timezone.utc);db.commit();db.refresh(t);return t,run

def persist_behavior(db, iceberg, payload):
    source=source_for(db,payload.provenance);run=IngestionService(db).start_run(source,processing_version=payload.provenance.processingVersion,configuration={"externalMl":True,"output":"behavior"})
    exists=db.scalar(select(IngestionLineage).where(IngestionLineage.source_id==source.id,IngestionLineage.source_product_id==payload.provenance.sourceProductId,IngestionLineage.source_record_id==payload.provenance.sourceRecordId,IngestionLineage.domain_type=="predicted_behavior"))
    if exists: raise ValueError("duplicate external behavior output")
    features=[{"name":k,"value":v.value,"availability":"available" if v.availability else "unavailable","note":v.explanation or "No explanation supplied by external model." ,"unit":v.unit} for k,v in payload.features.items()]
    b=BehaviorProfile(id=uuid4(),iceberg_id=iceberg.id,profile_version=f"{payload.modelName}:{payload.modelVersion}",method=payload.modelName,behavior_class=payload.behaviorClass,features_json={"features":features},limitations=payload.limitations,created_at=payload.generatedAt,source=payload.provenance.source,source_id=payload.provenance.sourceRecordId,source_type=payload.provenance.sourceType,observed_at=payload.generatedAt,processing_version=payload.provenance.processingVersion,data_status="predicted",confidence=payload.confidence,metadata_json={"externalMl":True,"modelVersion":payload.modelVersion});db.add(b);db.flush()
    db.add(IngestionLineage(source_id=source.id,ingestion_run_id=run.id,source_product_id=payload.provenance.sourceProductId,source_record_id=payload.provenance.sourceRecordId,domain_type="predicted_behavior",domain_record_id=b.id,observed_at=payload.generatedAt,processing_version=payload.provenance.processingVersion,data_status="predicted",metadata_json={"modelName":payload.modelName,"limitations":payload.limitations}));db.add(IngestionRecord(ingestion_run_id=run.id,source_id=source.id,source_product_id=payload.provenance.sourceProductId,source_record_id=payload.provenance.sourceRecordId,domain_type="predicted_behavior",outcome="accepted",observed_at=payload.generatedAt,processing_version=payload.provenance.processingVersion));run.records_discovered=run.records_accepted=1;run.status="completed";run.completed_at=datetime.now(timezone.utc);db.commit();db.refresh(b);return b,run
