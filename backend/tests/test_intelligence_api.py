from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.main import app
from app.seed.intelligence_demo_data import reset,seed
def test_intelligence_foundations():
 with SessionLocal.begin() as s:seed(s)
 try:
  with TestClient(app) as c:
   b=c.get('/api/v1/icebergs/A68A/behavior');assert b.status_code==200 and b.json()['behaviorClass']=='unclassified' and b.json()['provenance']['dataStatus']=='demo'
   assert c.get('/api/v1/icebergs/A76/behavior').json()['behaviorClass']=='unclassified'
   x=c.get('/api/v1/icebergs/A68A/interactions');assert x.status_code==200 and x.json()['items'][0]['status']=='candidate' and x.json()['items'][0]['provenance']['dataStatus']=='demo'
   assert c.get('/api/v1/icebergs/nope/interactions').status_code==404
 finally:
  with SessionLocal.begin() as s:reset(s)
