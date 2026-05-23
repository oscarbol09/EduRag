from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # JWT Settings (Obligatorio - Lanza error en startup si está vacío)
    JWT_SECRET: str

    # Google Gemini
    GOOGLE_API_KEY: str = ""

    # App Settings
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # CORS
    CORS_ORIGINS: str = "https://edurag-frontend.azurewebsites.net,http://localhost:3000,https://delightful-sea-04066b61e.7.azurestaticapps.net"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS env var — accepts comma-separated or JSON array."""
        raw = self.CORS_ORIGINS.strip()
        if not raw:
            return ["*"]
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                return [o.strip() for o in parsed if o.strip()]
            except Exception:
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]

    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_MIME_TYPES: list = [
        "text/markdown",
        "text/plain",
    ]

    # Cache
    MAX_CACHE_SIZE: int = 1000

    # TTL
    TTL_CONVERSATIONS_DAYS: int = 90

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
