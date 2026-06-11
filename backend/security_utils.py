import os
import base64
import hashlib
import logging
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


def get_encryption_key() -> bytes:
    from settings import settings
    key_env = settings.ENCRYPTION_KEY
    if not key_env:
        raise ValueError("La variable de entorno ENCRYPTION_KEY no está configurada.")
    try:
        # Verificar si ya es una clave Fernet válida (44 bytes base64url)
        Fernet(key_env.encode())
        return key_env.encode()
    except Exception:
        # Si es un string arbitrario, derivarla de forma segura con SHA-256
        logger.warning(
            "ENCRYPTION_KEY no es una clave Fernet válida. "
            "Derivando clave con SHA-256 — reemplázala con `Fernet.generate_key()` "
            "para mayor seguridad."
        )
        derived = hashlib.sha256(key_env.encode()).digest()
        return base64.urlsafe_b64encode(derived)


def encrypt_api_key(api_key: str) -> str:
    """Cifra una API key con Fernet. Lanza excepción si falla — no hay fallback a texto plano."""
    if not api_key:
        return ""
    # Sin try/except: si el cifrado falla, debe ser ruidoso para evitar almacenar en texto plano.
    f = Fernet(get_encryption_key())
    return f.encrypt(api_key.encode("utf-8")).decode("utf-8")


def decrypt_api_key(encrypted_key: str) -> str:
    """Descifra una API key. Si falla (clave legada en texto plano), devuelve el valor crudo
    con un warning para facilitar la migración gradual de datos legados."""
    if not encrypted_key:
        return ""
    try:
        f = Fernet(get_encryption_key())
        return f.decrypt(encrypted_key.encode("utf-8")).decode("utf-8")
    except Exception:
        # Clave legada almacenada en texto plano — registrar para auditoría y migracion.
        logger.warning(
            "decrypt_api_key: no se pudo descifrar con Fernet. "
            "La clave puede estar almacenada en texto plano (dato legado). "
            "Se recomienda que el docente actualice su API Key desde Configuración."
        )
        return encrypted_key

