from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt_token import verify_jwt_token
from settings import settings


security = HTTPBearer(auto_error=False)


async def get_current_user_optional(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"sub": None, "email": None, "role": "anonymous"}

    token = auth_header.replace("Bearer ", "")
    return await _verify_token(token)


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticación requerido")

    token = auth_header.replace("Bearer ", "")
    user = await _verify_token(token)

    if not user.get("sub"):
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    return user


async def _verify_token(token: str) -> dict:
    payload = verify_jwt_token(token)
    if payload:
        return payload
    return {"sub": None, "email": None, "role": "anonymous"}