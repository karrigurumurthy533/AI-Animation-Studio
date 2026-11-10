from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Animation Studio API"
    app_env: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "ai_animation_studio"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: SecretStr = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_minutes: int = Field(default=15, ge=5, le=60)
    refresh_token_days: int = Field(default=30, ge=1, le=90)
    password_reset_minutes: int = Field(default=30, ge=5, le=120)
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    meshy_api_key: SecretStr | None = None
    tripo_api_key: SecretStr | None = None
    rodin_api_key: SecretStr | None = None
    model_provider_order: str = "meshy,tripo,rodin"
    rodin_tier: str = "Gen-2.5-Low"
    run_worker_in_api: bool | None = None
    smtp_host: str | None = None
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_from_email: str = "no-reply@aianimation.local"
    smtp_use_tls: bool = False

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if "*" in origins:
            raise ValueError("CORS origins must be explicit when credentials are enabled")
        return ",".join(origins)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin for origin in self.cors_origins.split(",") if origin]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.app_env == "production" and not settings.auth_cookie_secure:
        raise ValueError("AUTH_COOKIE_SECURE must be true in production")
    return settings


settings = get_settings()
