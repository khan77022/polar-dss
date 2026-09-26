from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables and ``.env``."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "polar-dss-backend"
    app_env: Literal["development", "test", "production"] = "development"
    api_prefix: str = "/api/v1"
    version: str = "1.0.0"
    database_url: str = "postgresql+psycopg://polar:polar@localhost:5432/polar_dss"
    cors_origins: list[AnyHttpUrl | str] = Field(default_factory=lambda: ["http://localhost:3000"])
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
