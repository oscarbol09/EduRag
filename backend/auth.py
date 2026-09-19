from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer
from jwt_token import verify_jwt_token
from supabase_db import is_token_revoked


security = HTTPBearer(auto_error=False)


async def _verify_token(token: str) -> dict:
    payload = verify_jwt_token(token)
    if not payload:
        return {"sub": None, "email": None, "role": "anonymous"}

    jti = payload.get("jti")
    if jti:
        revoked = await is_token_revoked(jti)
        if revoked:
            return {"sub": None, "email": None, "role": "anonymous"}

    return payload


def _extract_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    parts = auth_header.strip().split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


async def get_current_user_optional(request: Request) -> dict:
    token = _extract_bearer_token(request)
    if not token:
        return {"sub": None, "email": None, "role": "anonymous"}

    return await _verify_token(token)


async def get_current_user(request: Request) -> dict:
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Token de autenticación requerido")

    user = await _verify_token(token)

    if not user.get("sub"):
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    return user