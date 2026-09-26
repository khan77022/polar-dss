from datetime import datetime, timedelta, timezone
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from app.core.database import SessionLocal
from app.main import app
from app.models.iceberg import Iceberg, Trajectory, TrajectoryPoint
from app.models.ingestion import IngestionLineage, IngestionRecord, IngestionRun, IngestionSource
from app.models.intelligence import BehaviorProfile

def test_external_ml_outputs_are_predicted_audited_and_retrievable():
 key=uuid4().hex;now=datetime.now(timezone.utc)-timedelta(hours=1)
 with SessionLocal.begin() as db:
  iceberg=Iceberg(catalog_id=f'ML-{key}',name='External ML integration test',source='test',source_type='test',data_status='demo');db.add(iceberg)
 try:
  provenance={'source':'external-ml-test','sourceRecordId':'trajectory-1','sourceProductId':'model-output-v1','sourceType':'external_ml','processingVersion':'adapter-v1'}
  trajectory={'modelName':'external-trajectory-model','modelVersion':'v1','generatedAt':now.isoformat(),'validFrom':now.isoformat(),'validTo':(now+timedelta(hours=2)).isoformat(),'points':[{'timestamp':now.isoformat(),'position':{'lat':-70,'lon':15},'uncertaintyRadiusKm':2}], 'limitations':'External output; no independent validation.', 'provenance':provenance,'dataStatus':'predicted'}
  behavior={'modelName':'external-behavior-model','modelVersion':'v1','generatedAt':now.isoformat(),'behaviorClass':'provider-declared-class','features':{'drift_velocity':{'value':0.4,'availability':True,'unit':'m/s','explanation':'Provider-supplied feature.'}},'limitations':'External output; no independent validation.','provenance':{**provenance,'sourceRecordId':'behavior-1'},'dataStatus':'predicted'}
  with TestClient(app) as c:
   t=c.post(f'/api/v1/icebergs/ML-{key}/external-ml/trajectory',json=trajectory);assert t.status_code==200 and t.json()['dataStatus']=='predicted'
   assert c.post(f'/api/v1/icebergs/ML-{key}/external-ml/trajectory',json=trajectory).status_code==409
   b=c.post(f'/api/v1/icebergs/ML-{key}/external-ml/behavior',json=behavior);assert b.status_code==200
   assert c.get(f'/api/v1/icebergs/ML-{key}/behavior').json()['provenance']['dataStatus']=='predicted'
   assert c.get(f'/api/v1/icebergs/ML-{key}/trajectory?trajectory_type=predicted').json()['items'][0]['provenance']['dataStatus']=='predicted'
   invalid={**trajectory,'dataStatus':'observed','provenance':{**provenance,'sourceRecordId':'invalid'}};assert c.post(f'/api/v1/icebergs/ML-{key}/external-ml/trajectory',json=invalid).status_code==422
 finally:
  with SessionLocal.begin() as db:
   ids=db.scalars(select(IngestionSource.id).where(IngestionSource.name=='external-ml-test')).all();db.execute(delete(IngestionRecord).where(IngestionRecord.source_id.in_(ids)));db.execute(delete(IngestionLineage).where(IngestionLineage.source_id.in_(ids)));db.execute(delete(IngestionRun).where(IngestionRun.source_id.in_(ids)));db.execute(delete(TrajectoryPoint).where(TrajectoryPoint.source=='external-ml-test'));db.execute(delete(Trajectory).where(Trajectory.source=='external-ml-test'));db.execute(delete(BehaviorProfile).where(BehaviorProfile.source=='external-ml-test'));db.execute(delete(IngestionSource).where(IngestionSource.id.in_(ids)));db.execute(delete(Iceberg).where(Iceberg.catalog_id==f'ML-{key}'))
