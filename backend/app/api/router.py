from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.icebergs import router as icebergs_router
from app.api.v1.operations import router as operations_router
from app.api.v1.navigation import router as navigation_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.application import router as application_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.environment import router as environment_router
from app.api.v1.external_ml import router as external_ml_router
from app.api.v1.emergency import router as emergency_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(icebergs_router, tags=["icebergs"])
api_router.include_router(operations_router, tags=["operations"])
api_router.include_router(navigation_router, tags=["navigation"])
api_router.include_router(intelligence_router, tags=["iceberg intelligence"])
api_router.include_router(application_router, tags=["dss application"])
api_router.include_router(ingestion_router, tags=["ingestion"])
api_router.include_router(environment_router, tags=["environment"])
api_router.include_router(external_ml_router, tags=["external ML integration"])
api_router.include_router(emergency_router, tags=["emergency decision support"])
