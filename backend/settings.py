from pydantic_settings import BaseSettings
from typing import Optional
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

    # ChromaDB — /home is the only writable persistent volume in Azure App Service
    CHROMA_DB_PATH: str = "/home/chroma_data"

    # App Settings
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8080

    # CORS — override via CORS_ORIGINS env var (comma-separated) in Azure App Settings
    # e.g. CORS_ORIGINS=https://edurag-frontend.azurewebsites.net,http://localhost:3000
    CORS_ORIGINS: list = [
        "https://edurag-frontend.azurewebsites.net",
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_MIME_TYPES: list = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]

    # RAG Settings
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    RETRIEVAL_TOP_K: int = 5

    # Cache
    MAX_CACHE_SIZE: int = 1000

    # TTL
    TTL_CONVERSATIONS_DAYS: int = 90

    class Config:
        env_file = ".env"
        extra = "allow"

    def model_post_init(self, __context):
        # Allow overriding CORS_ORIGINS via a single comma-separated env var
        raw = os.environ.get("CORS_ORIGINS", "")
        if raw:
            self.CORS_ORIGINS = [o.strip() for o in raw.split(",") if o.strip()]


settings = Settings()
