from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.main import app
from app.seed.navigation_demo_data import reset,seed
def test_navigation_risk_alert_apis():
 with SessionLocal.begin() as s:seed(s)
 try:
  with TestClient(app) as c:
   assert c.get('/api/v1/routes').json()['total']>=1
   assert c.get('/api/v1/routes/DEMO-ROUTE-1').json()['provenance']['dataStatus']=='demo'
   assert c.get('/api/v1/routes/nope').status_code==404
   assert c.post('/api/v1/routes/calculate',json={'origin':{'lat':-68,'lon':70},'destination':{'lat':-67,'lon':71},'objective':'balanced'}).json()['provenance']['dataStatus']=='simulated'
   assert c.post('/api/v1/routes/calculate',json={'origin':{'lat':-99,'lon':70},'destination':{'lat':-67,'lon':71}}).status_code==422
   risk=c.post('/api/v1/risk/assess',json={'routeId':'DEMO-ROUTE-1'}).json();assert risk['score'] is None and risk['factors'][0]['status']=='unavailable'
   assert c.get('/api/v1/risk').status_code==200
   assert c.get('/api/v1/alerts',params={'severity':'info'}).json()['total']==1
   assert c.post('/api/v1/alerts/DEMO-ALERT-1/acknowledge').json()['acknowledged'] is True
   assert c.post('/api/v1/alerts/nope/acknowledge').status_code==404
 finally:
  with SessionLocal.begin() as s:reset(s)
