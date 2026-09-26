"""Synthetic, unclassified profiles and candidate-only interactions for API tests."""
from datetime import datetime,timezone
from uuid import UUID
from sqlalchemy import delete,select
from app.core.database import SessionLocal
from app.models.iceberg import Iceberg
from app.models.intelligence import BehaviorProfile,IcebergInteraction,TrajectoryModelMetadata
from app.seed.demo_data import seed_demo_data
S='polar-dss-milestone-c-demo';P=dict(source=S,source_type='synthetic_demo',processing_version='milestone-c-demo-v1',data_status='demo',metadata_json={'disclaimer':'Synthetic architecture fixture; not a scientific inference.'})
def reset(s):
 for m in (IcebergInteraction,BehaviorProfile,TrajectoryModelMetadata):s.execute(delete(m).where(m.source==S))
 s.flush()
def seed(s):
 seed_demo_data(s);reset(s);t=datetime(2026,9,18,14,30,tzinfo=timezone.utc);ids=dict(s.execute(select(Iceberg.catalog_id,Iceberg.id).where(Iceberg.catalog_id.in_(['A68A','A76']))).all());features=[{'name':x,'value':None,'availability':'unavailable','note':'Synthetic fixture does not establish this scientific feature.'} for x in ['rotation','melt_rate','ocean_relationship','wind_relationship']]
 s.add(BehaviorProfile(id=UUID('c0000000-0000-0000-0000-000000000001'),iceberg_id=ids['A68A'],profile_version='demo-v1',method='profile-schema-fixture',behavior_class='unclassified',features_json={'features':features},limitations='Unclassified: synthetic records are not evidence for scientific behavior classification.',created_at=t,observed_at=t,**P))
 s.add(TrajectoryModelMetadata(id=UUID('c1000000-0000-0000-0000-000000000001'),model_name='trajectory-interface-placeholder',model_version='v1',interface_type='abstract-contract',input_contract={'inputs':['trajectory history','geometry','sea ice','weather','ocean']},output_contract={'outputs':['trajectory points','uncertainty','provenance']},limitations='Metadata only; no executable or validated model.',created_at=t,observed_at=t,**P))
 s.add(IcebergInteraction(id=UUID('c2000000-0000-0000-0000-000000000001'),iceberg_a_id=ids['A68A'],iceberg_b_id=ids['A76'],interaction_status='candidate',analysis_at=t,closest_approach_km=None,relative_velocity_kts=None,relative_heading_deg=None,interaction_score=None,method='schema-fixture',limitations='Candidate-only synthetic fixture; no SAR geometry or physical interaction determination.',created_at=t,observed_at=t,**P));s.flush()
def main():
 with SessionLocal.begin() as s:seed(s);print('Seeded synthetic intelligence fixtures')
if __name__=='__main__':main()
