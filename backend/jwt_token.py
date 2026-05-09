import jwt
from datetime import datetime, timedelta
from typing import Optional
from settings import settings


JWT_SECRET = settings.JWT_SECRET or "edu-rag-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


def create_jwt_token(user_id: str, email: str, role: str) -> str:
    """Crea un JWT token con expiración."""
    expires_at = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expires_at,
        "iat": datetime.utcnow(),
        "iss": "edubot",
        "aud": "edubot-api"
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_jwt_token(token: str) -> Optional[dict]:
    """Verifica y decodifica un JWT token. Devuelve None si es inválido o expiró."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            audience="edubot-api",
            issuer="edubot"
        )
        return {
            "sub": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role", "teacher")
        }
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
