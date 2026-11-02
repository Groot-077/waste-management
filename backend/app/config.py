import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Smart Waste Management"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    
    # YOLO26 AI inference
    YOLO_API_URL: str = ""
    YOLO_API_KEY: str = ""
    YOLO_MODEL_PATH: str = ""
    
    # Database
    DATABASE_URL: str = "sqlite:///./waste_management.db"
    
    # JWT
    JWT_SECRET: str = "smart-waste-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    
    # SMTP
    SMTP_SERVER: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@smartwaste.org"
    SMTP_USE_TLS: bool = True
    
    # Storage
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()

# Ensure uploads folder exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
