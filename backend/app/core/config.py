from __future__ import annotations

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = 'development'
    allowed_origins: list[str] = Field(default_factory=lambda: ['http://localhost:5173'])
    gemini_api_key: str | None = None
    firebase_project_id: str | None = None
    firebase_storage_bucket: str | None = None
    firebase_private_key: str | None = None
    firebase_client_email: str | None = None
    log_level: str = 'INFO'
    max_upload_size_mb: int = 20

    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(',') if item.strip()]
        return value

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def firebase_configured(self) -> bool:
        return bool(self.firebase_project_id and self.firebase_private_key and self.firebase_client_email)

    @property
    def firebase_storage_configured(self) -> bool:
        return self.firebase_configured and bool(self.firebase_storage_bucket)


settings = Settings()
