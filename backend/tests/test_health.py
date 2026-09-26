from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_service_identity() -> None:
    response = TestClient(app).get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "polar-dss-backend",
        "version": "1.0.0",
    }
    assert response.headers["x-request-id"]
