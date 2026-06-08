from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Supabase Settings — requeridos; sin default para detectar misconfiguración en startup
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # JWT Settings (Obligatorio - Lanza error en startup si está vacío)
    JWT_SECRET: str

    # Cifrado de API keys de docentes. (Obligatorio)
    # Generar con `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
    ENCRYPTION_KEY: str

    # OpenRouter (fallback para cuentas @edurag.com)
    OPENROUTER_API_KEY: str = ""

    # Cuentas de testeo autorizadas a usar la API key del sistema (comma-separated)
    TEST_ACCOUNTS_WHITELIST: str = ""

    @property
    def test_accounts_list(self) -> List[str]:
        """Devuelve la lista de emails autorizados para usar la API key del sistema."""
        return [e.strip() for e in self.TEST_ACCOUNTS_WHITELIST.split(",") if e.strip()]

    # LLM por defecto (usado si el docente no tiene modelo configurado)
    DEFAULT_LLM_MODEL: str = "google/gemma-3-27b-it:free"

    # App Settings
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,https://tu-proyecto.vercel.app"

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
    MAX_EXTRACTED_TEXT_CHARS: int = 1_000_000
    ALLOWED_MIME_TYPES: list = [
        "text/markdown",
        "text/plain",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    # Cache
    MAX_CACHE_SIZE: int = 1000

    # Límite de longitud del system_prompt_override (chars)
    MAX_SYSTEM_PROMPT_LENGTH: int = 2000

    # TTL
    TTL_CONVERSATIONS_DAYS: int = 90

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
