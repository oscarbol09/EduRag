import os
import base64
import hashlib
from cryptography.fernet import Fernet

def get_encryption_key() -> bytes:
    key_env = os.environ.get("ENCRYPTION_KEY")
    if key_env:
        try:
            # Verificar si ya es una clave Fernet valida
            Fernet(key_env.encode())
            return key_env.encode()
        except Exception:
            # Si es un string normal, derivarla de forma segura
            derived = hashlib.sha256(key_env.encode()).digest()
            return base64.urlsafe_b64encode(derived)
    
    # Fallback seguro a JWT_SECRET para evitar caidas si ENCRYPTION_KEY no esta configurado
    jwt_secret = os.environ.get("JWT_SECRET", "default_safe_secret_key_at_least_32_chars")
    derived = hashlib.sha256(jwt_secret.encode()).digest()
    return base64.urlsafe_b64encode(derived)

def encrypt_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    try:
        f = Fernet(get_encryption_key())
        return f.encrypt(api_key.encode("utf-8")).decode("utf-8")
    except Exception:
        # Si falla el cifrado, retornar la clave original para evitar bloqueos
        return api_key

def decrypt_api_key(encrypted_key: str) -> str:
    if not encrypted_key:
        return ""
    try:
        f = Fernet(get_encryption_key())
        return f.decrypt(encrypted_key.encode("utf-8")).decode("utf-8")
    except Exception:
        # Si falla el descifrado (ej. es una clave legada plana), retornar el valor crudo
        return encrypted_key
