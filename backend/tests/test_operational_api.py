from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.main import app
from app.seed.operational_demo_data import reset, seed

def test_operational_seed_and_read_apis():
    with SessionLocal.begin() as s: first=seed(s)
    try:
      with SessionLocal.begin() as s: assert seed(s)==first=={"vessels":2,"stations":1,"sea_ice_regions":1,"sea_ice_records":2,"weather_records":2,"ocean_records":2}
      with TestClient(app) as c:
       assert c.get('/api/v1/vessels/current').json()['provenance']['dataStatus']=='demo'
       assert c.get('/api/v1/vessels/ahead').json()['total']==1
       assert c.get('/api/v1/stations/DEMO-STATION').status_code==200
       assert c.get('/api/v1/stations/nope').status_code==404
       assert c.get('/api/v1/sea-ice/forecast').json()['items'][0]['provenance']['dataStatus']=='demo'
       assert c.get('/api/v1/weather/current').status_code==200
       assert c.get('/api/v1/ocean/forecast').status_code==200
    finally:
      with SessionLocal.begin() as s: reset(s)
