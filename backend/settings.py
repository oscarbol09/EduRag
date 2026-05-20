from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List
import os


class Settings(BaseSettings):
    # Azure Cosmos DB
    COSMOS_DB_ENDPOINT: str = ""
    COSMOS_DB_KEY: str = ""
    COSMOS_DB_DATABASE: str = "edubot"

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER_NAME: str = "documents"

    # Azure Queue
    AZURE_QUEUE_CONNECTION_STRING: str = ""
    AZURE_QUEUE_NAME: str = "document-processing"

    # Microsoft Entra ID
    ENTRA_TENANT_ID: str = ""
    ENTRA_CLIENT_ID: str = ""
    ENTRA_CLIENT_SECRET: str = ""
    ENTRA_AUTHORITY: str = ""
    JWT_AUDIENCE: str = ""
    JWT_ISSUER: str = ""

    # JWT Settings
    JWT_SECRET: str = ""

    # Google Gemini
    GOOGLE_API_KEY: str = ""

    # App Settings
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # CORS — stored as raw string, parsed to list via property
    # Accepts comma-separated string in Azure App Settings:
    #   e.g. CORS_ORIGINS=https://example.com,http://localhost:3000
    # OR a JSON array string: ["https://example.com","http://localhost:3000"]
    CORS_ORIGINS: str = "https://edurag-frontend.azurewebsites.net,http://localhost:3000,https://delightful-sea-04066b61e.7.azurestaticapps.net"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS env var — accepts comma-separated or JSON array."""
        raw = self.CORS_ORIGINS.strip()
        if not raw:
            return ["*"]
        # If it looks like a JSON array, parse it
        if raw.startswith("["):
            import json
            try:
                parsed = json.loads(raw)
                return [o.strip() for o in parsed if o.strip()]
            except Exception:
                pass
        # Otherwise split by comma
        return [o.strip() for o in raw.split(",") if o.strip()]

    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_MIME_TYPES: list = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
