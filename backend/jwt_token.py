import jwt
import uuid
from datetime import datetime, timedelta
from typing import Optional
from settings import settings


JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRATION_HOURS = 24
REFRESH_TOKEN_EXPIRATION_DAYS = 7


def _make_payload(user_id: str, email: str, role: str, expires_delta: timedelta) -> dict:
    """Crea el payload base con jti único para revocación."""
    return {
        "sub": user_id,
        "email": email,
        "role": role,
        "jti": str(uuid.uuid4()),
        "exp": datetime.utcnow() + expires_delta,
        "iat": datetime.utcnow(),
        "iss": "edubot",
        "aud": "edubot-api",
    }


def create_jwt_token(user_id: str, email: str, role: str) -> str:
    """Crea un access JWT token con expiración de 24h."""
    payload = _make_payload(user_id, email, role, timedelta(hours=ACCESS_TOKEN_EXPIRATION_HOURS))
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, email: str, role: str) -> tuple[str, str, datetime]:
    """Crea un refresh token con expiración de 7 días.
    Retorna (token, jti, expires_at) para persistir el jti en la blacklist al hacer logout.
    """
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRATION_DAYS)
    payload = _make_payload(user_id, email, role, timedelta(days=REFRESH_TOKEN_EXPIRATION_DAYS))
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, payload["jti"], expires_at


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
            "role": payload.get("role", "teacher"),
            "jti": payload.get("jti"),
            "token_type": payload.get("token_type", "access"),
        }
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
