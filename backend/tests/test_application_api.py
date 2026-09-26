from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.main import app
from app.seed.demo_data import reset_demo_data,seed_demo_data
from app.seed.intelligence_demo_data import reset as reset_intelligence,seed as seed_intelligence
def test_dss_application_layer():
 with SessionLocal.begin() as s:seed_intelligence(s)
 try:
  with TestClient(app) as c:
   d=c.get('/api/v1/dashboard/summary');assert d.status_code==200 and any(x['domain']=='icebergs' for x in d.json()['availability'])
   report=c.post('/api/v1/reports/passage-briefing',json={});assert report.status_code==200 and report.json()['provenance']['dataStatus']=='provisional'
   assert c.get('/api/v1/reports/'+report.json()['id']).status_code==200
   assert c.post('/api/v1/chat',json={'message':'what iceberg data is available'}).json()['limitations'].startswith('Deterministic')
   models=c.get('/api/v1/models');assert models.status_code==200 and models.json()['items'][0]['limitations']
   assert c.get('/api/v1/models/not-a-uuid').status_code==422
 finally:
  with SessionLocal.begin() as s:reset_intelligence(s);reset_demo_data(s)
