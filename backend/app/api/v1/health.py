from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter(prefix="/health")


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get("", response_model=HealthResponse, summary="Service health")
def health_check() -> HealthResponse:
    """Return process health without claiming database readiness."""
    settings = get_settings()
    return HealthResponse(status="ok", service=settings.app_name, version=settings.version)
