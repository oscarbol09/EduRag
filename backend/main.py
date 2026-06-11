from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import hashlib
import json
import logging
import os
import re
import threading
import unicodedata
import uvicorn
import uuid
from datetime import datetime, timedelta
from typing import Optional
from settings import settings
from models import *
from supabase_db import (
    create_user, get_user, get_user_by_email, list_users, update_user, update_user_auth_claim, delete_user,
    create_chatbot, get_chatbot, get_chatbot_by_id_and_owner, update_chatbot, delete_chatbot, list_chatbots,
    create_document, get_document, update_document, list_documents, list_documents_for_chatbots, delete_document,
    create_conversation, get_conversation, save_conversation, list_conversations, list_conversations_for_chatbots,
    create_messages_batch, list_messages_for_conversation,
    get_client
)
from document_content_store import (
    store_document_content,
    get_document_content_by_hash,
    get_all_contents_for_chatbot,
    delete_all_contents_for_chatbot,
    delete_document_content,
)
from llm_client import get_llm_client
from context_builder import build_context
from document_uploader import upload_file_to_blob, extract_text_from_file
from auth import get_current_user, get_current_user_optional
from password import hash_password, verify_password
from jwt_token import create_jwt_token
from security_utils import encrypt_api_key, decrypt_api_key

logger = logging.getLogger(__name__)

app = FastAPI(title="EduRAG API", version="0.2.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    import warnings
    if not settings.JWT_SECRET or len(settings.JWT_SECRET) < 32:
        warnings.warn(
            "JWT_SECRET no está configurado o tiene menos de 32 caracteres. "
            "Esto representa un riesgo de seguridad en producción.",
            UserWarning
        )



@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

response_cache: dict = {}
response_cache_lock = threading.RLock()
# Caché TTL de 5 minutos. NOTA: este caché es en memoria y local al worker.
# En deploys multi-worker (Gunicorn con varios procesos) cada worker tiene su propio caché.
# La migraçión a Redis (Upstash Free) requeriría una variable de entorno REDIS_URL
# y el paquete `redis`. Postergada hasta que el tráfico justifique el costo operativo.
CACHE_TTL_SECONDS = 300  # 5 minutos

RESTRICTION_TEMPERATURES = {
    "strict": 0.2,
    "guided": 0.5,
    "open": 0.8
}


def _get_cached_response(cache_key: str) -> Optional[dict]:
    """Return a fresh cached response, deleting stale entries under a lock."""
    with response_cache_lock:
        cached = response_cache.get(cache_key)
        if not cached:
            return None
        if (datetime.utcnow() - cached["timestamp"]).total_seconds() < CACHE_TTL_SECONDS:
            return dict(cached)
        response_cache.pop(cache_key, None)
        return None


def _set_cached_response(cache_key: str, response_text: str, sources: list[str]) -> None:
    """Store a chat response without racing concurrent requests in the same worker."""
    with response_cache_lock:
        if len(response_cache) >= settings.MAX_CACHE_SIZE:
            oldest_key = min(
                response_cache,
                key=lambda key: response_cache[key].get("timestamp", datetime.min),
            )
            response_cache.pop(oldest_key, None)
        response_cache[cache_key] = {
            "response": response_text,
            "sources": sources,
            "timestamp": datetime.utcnow(),
        }

def get_default_system_prompt(tone: str, restriction_level: str) -> str:
    tone_instruction = {
        "formal": "Adopta un tono formal, estructurado y de alto rigor académico.",
        "friendly": "Adopta un tono amigable, empático, cercano y muy motivador.",
        "technical": "Adopta un tono técnico, preciso y centrado en la exactitud de los conceptos."
    }
    restriction_instruction = {
        "strict": "Cíñete ESTRICTAMENTE a la información del contexto proporcionado. Si algo no está allí, indícalo con amabilidad sin inventar ni usar conocimiento externo.",
        "guided": "Usa el contexto proporcionado como tu fuente principal de respuestas, complementando con explicaciones didácticas si es necesario para facilitar la comprensión.",
        "open": "Usa el contexto como punto de partida y base fundamental, pero siéntete libre de expandir y enriquecer la explicación con ejemplos y analogías externas útiles."
    }
    return f"""Eres un docente virtual y tutor educativo de primer nivel. Tu objetivo es explicar conceptos complejos de manera sumamente clara, interactiva y didáctica.

**Pautas de Rol y Tono:**
- {tone_instruction.get(tone, tone_instruction["friendly"])}
- {restriction_instruction.get(restriction_level, restriction_instruction["guided"])}

**Reglas Críticas de Comportamiento:**
1. Actúa como un tutor humano real: sé empático, paciente y alentador. NUNCA menciones frases robóticas ni metasistemas del prompt (como "respondo según el contexto provisto", "según las instrucciones del sistema" o "siempre de manera formal"). Habla de forma natural y directa al estudiante.
2. Solo saluda y da la bienvenida en el primer mensaje de la conversación. En las respuestas de seguimiento, NO repitas saludos como "¡Hola!", "Bienvenido/a", "Me alegra que quieras adentrarte..." o frases introductorias redundantes; responde directamente a la pregunta de forma fluida y natural.
3. Fomenta el autoaprendizaje: utiliza analogías sencillas del día a día, ejemplos claros y, opcionalmente, plantéale pequeñas preguntas de reflexión al final de tus respuestas para estimular su curiosidad.
4. Cita siempre el nombre de los documentos fuente (por ejemplo, "[nombre_archivo.txt]") al utilizar la información de los mismos, integrándolos de manera fluida y elegante en tu explicación."""

def map_user_response(user: dict) -> dict:
    """Mapea un registro de usuario a la estructura de respuesta del API.
    Lee exclusivamente las columnas nativas (first_name, last_name, institution_name,
    openrouter_api_key, openrouter_model). Migración legacy completada.
    """
    if not user:
        return {}
    first_name = user.get("first_name") or ""
    last_name = user.get("last_name") or ""
    institution_name = user.get("institution_name") or ""
    openrouter_api_key = decrypt_api_key(user.get("openrouter_api_key"))
    openrouter_model = user.get("openrouter_model") or ""
    is_test_account = user.get("is_test_account") or False

    res = dict(user)
    # Columnas nativas snake_case
    res["first_name"] = first_name
    res["last_name"] = last_name
    res["institution_name"] = institution_name
    res["openrouter_api_key"] = openrouter_api_key
    res["openrouter_model"] = openrouter_model
    res["is_test_account"] = is_test_account
    # Alias camelCase para el frontend
    res["firstName"] = first_name
    res["lastName"] = last_name
    res["institutionName"] = institution_name
    res["openrouterApiKey"] = openrouter_api_key
    res["openrouterModel"] = openrouter_model
    # Eliminar campos legacy que ya no existen en el schema
    res.pop("institution", None)
    res.pop("name", None)

    return res


@app.get("/")
async def root():
    return {"name": "EduRAG API", "version": "0.2.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/ready")
async def readiness_check():
    try:
        get_client()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/auth/me")
async def get_current_user_endpoint(request: Request):
    user_token = await get_current_user_optional(request)
    if not user_token or user_token.get("role") == "anonymous":
        return {"role": "anonymous"}
    
    # Cargar el registro de usuario completo desde la base de datos
    user = await get_user(user_token.get("sub"))
    if not user:
        return {"role": "anonymous"}
        
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return map_user_response(safe_user)


@app.put("/auth/me/profile")
async def update_my_profile(body: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    openrouter_key = body.openrouterApiKey.strip() if body.openrouterApiKey else ""
    encrypted_key = encrypt_api_key(openrouter_key)
    openrouter_model = body.openrouterModel.strip() if body.openrouterModel else ""
    
    updates_native = {
        "first_name": body.firstName.strip(),
        "last_name": body.lastName.strip(),
        "institution_name": body.institution.strip(),
        "openrouter_api_key": encrypted_key,
        "openrouter_model": openrouter_model,
        "country": body.country.strip() if body.country else None,
    }

    await update_user(user_id, updates_native)
    
    # Obtener el usuario actualizado
    updated_user = await get_user(user_id)
    safe_user = {k: v for k, v in updated_user.items() if k != "password"}
    return map_user_response(safe_user)


@app.post("/auth/login")
@limiter.limit("10/minute")  # Previene brute-force de contraseñas
async def login(request: Request, body: LoginRequest):
    user = await get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    password_hash = user.get("password")
    if not password_hash or not verify_password(body.password, password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_jwt_token(
        user_id=user.get("id"),
        email=user.get("email"),
        role=user.get("role", "teacher")
    )
    # Parche de seguridad: Eliminar hash del password de la respuesta
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {"token": token, "user": map_user_response(safe_user)}


@app.post("/auth/register")
@limiter.limit("5/minute")  # Previene registro masivo automatizado
async def register(request: Request, body: RegisterRequest):
    existing = await get_user_by_email(body.email)
    if existing:
        # Parche de seguridad / Usabilidad: Permitir a docentes precreados reclamar su cuenta
        if existing.get("auth_method") == "pre_created" and not existing.get("password"):
            password_hash = hash_password(body.password)
            
            # Actualizar contraseña y método de autenticación en Supabase
            await update_user_auth_claim(existing["id"], password_hash)
            
            # Recargar usuario para tener datos actualizados
            updated_user = await get_user_by_email(body.email)
            token = create_jwt_token(
                user_id=updated_user["id"],
                email=updated_user["email"],
                role=updated_user["role"]
            )
            safe_user = {k: v for k, v in updated_user.items() if k != "password"}
            return {"token": token, "user": map_user_response(safe_user)}
        else:
            raise HTTPException(status_code=400, detail="El email ya está registrado")
            
    user_id = str(uuid.uuid4())
    password_hash = hash_password(body.password)
    
    # Parche de seguridad: Forzar rol 'student' en auto-registro público
    user = {
        "id": user_id,
        "email": body.email,
        "password": password_hash,
        "role": "student",
        "auth_method": "email_password",
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    await create_user(user)
    token = create_jwt_token(
        user_id=user_id,
        email=body.email,
        role="student"
    )
    # Parche de seguridad: Eliminar hash del password de la respuesta
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {"token": token, "user": map_user_response(safe_user)}


@app.get("/chatbots")
async def get_chatbots(
    request: Request,
    owner_id: Optional[str] = None,
    published_only: bool = False,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
):
    if not owner_id:
        user = await get_current_user_optional(request)
        if user and user.get("role") == "teacher" and not published_only:
            owner_id = user.get("sub")
        else:
            owner_id = None
    chatbots = await list_chatbots(
        owner_id=owner_id,
        published_only=published_only,
        limit=limit,
        offset=offset,
    )
    return chatbots


@app.post("/chatbots")
async def create_new_chatbot(data: ChatbotCreate, request: Request):
    user = await get_current_user(request)
    owner_id = user.get("sub")
    if not owner_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    # Validar longitud del system_prompt_override
    if data.system_prompt_override and len(data.system_prompt_override) > settings.MAX_SYSTEM_PROMPT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"El system prompt personalizado no puede superar {settings.MAX_SYSTEM_PROMPT_LENGTH} caracteres."
        )

    chatbot_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    chatbot = {
        "id": chatbot_id,
        "owner_id": owner_id,
        **data.model_dump(),
        "public_url": f"/chat/{chatbot_id}",
        "embed_code": f'<iframe src="/chat/{chatbot_id}" width="100%" height="600"></iframe>',
        "is_published": False,
        "created_at": now,
        "updated_at": now
    }
    await create_chatbot(chatbot)
    return chatbot


@app.get("/chatbots/{chatbot_id}")
async def get_chatbot_details(chatbot_id: str, request: Request):
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot no encontrado")
        
    # Cargar opcionalmente al usuario logueado actual para validar propiedad
    current_user = None
    try:
        current_user = await get_current_user(request)
    except Exception:
        pass
        
    is_owner = current_user and current_user.get("sub") == chatbot.get("owner_id")
    
    if not chatbot.get("is_published", False) and not is_owner:
        raise HTTPException(status_code=403, detail="No autorizado para acceder a este chatbot no publicado")
        
    # Por seguridad y privacidad del docente, ocultar el prompt de sistema personalizado a terceros
    if not is_owner:
        res = dict(chatbot)
        res.pop("system_prompt_override", None)
        return res
        
    return chatbot


@app.put("/chatbots/{chatbot_id}")
async def update_chatbot_details(chatbot_id: str, data: ChatbotCreate, request: Request):
    user = await get_current_user(request)
    owner_id = user.get("sub")

    # Validar longitud del system_prompt_override
    if data.system_prompt_override and len(data.system_prompt_override) > settings.MAX_SYSTEM_PROMPT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"El system prompt personalizado no puede superar {settings.MAX_SYSTEM_PROMPT_LENGTH} caracteres."
        )

    chatbot = await update_chatbot(chatbot_id, data.model_dump(), owner_id=owner_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot no encontrado")
    return chatbot


@app.delete("/chatbots/{chatbot_id}")
async def delete_chatbot_endpoint(chatbot_id: str, request: Request):
    user = await get_current_user(request)
    owner_id = user.get("sub")
    await delete_chatbot(chatbot_id, owner_id=owner_id)
    await delete_all_contents_for_chatbot(chatbot_id)
    return {"message": "Chatbot eliminado"}


@app.post("/chatbots/{chatbot_id}/publish")
async def publish_chatbot(chatbot_id: str, request: Request):
    user = await get_current_user(request)
    owner_id = user.get("sub")
    updates = {"is_published": True, "updated_at": datetime.utcnow().isoformat()}
    chatbot = await update_chatbot(chatbot_id, updates, owner_id=owner_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot no encontrado")
    return chatbot


@app.get("/chatbots/{chatbot_id}/embed")
async def get_chatbot_embed(chatbot_id: str):
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot no encontrado")
    return {"embed_code": chatbot.get("embed_code"), "public_url": chatbot.get("public_url")}


def sanitize_filename(filename: str) -> str:
    import unicodedata
    import re
    # Separate extension
    name_parts = filename.rsplit(".", 1)
    name = name_parts[0]
    ext = name_parts[1] if len(name_parts) > 1 else ""
    
    # Normalize unicode to separate characters from their accents (NFKD form)
    normalized = unicodedata.normalize('NFKD', name)
    # Filter out diacritics / non-ASCII
    ascii_name = normalized.encode('ascii', 'ignore').decode('ascii')
    
    # Replace spaces and other unsafe characters with underscores
    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', ascii_name)
    # Collapse multiple underscores
    safe_name = re.sub(r'_+', '_', safe_name).strip("_")
    
    # If the safe name became completely empty, use a fallback
    if not safe_name:
        safe_name = "document"
        
    return f"{safe_name}.{ext}" if ext else safe_name


@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    chatbot_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    # Parche de seguridad: Validar propiedad del chatbot antes de subir documentos
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot or chatbot.get("owner_id") != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="No tienes permisos para este chatbot.")

    if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Archivo demasiado grande (máx {settings.MAX_FILE_SIZE_MB}MB)")

    filename = file.filename or ""
    is_md = filename.lower().endswith(".md")
    is_txt = filename.lower().endswith(".txt")
    is_pdf = filename.lower().endswith(".pdf")
    is_docx = filename.lower().endswith(".docx")

    if not (is_md or is_txt or is_pdf or is_docx):
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo se aceptan archivos .md, .txt, .pdf y .docx.")

    document_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    content_bytes = await file.read()

    # Extract text from the uploaded file
    text_content = extract_text_from_file(content_bytes, filename, file.content_type)

    if not text_content or not text_content.strip():
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del archivo.")

    if len(text_content) > settings.MAX_EXTRACTED_TEXT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=(
                "El texto extraído supera el límite permitido "
                f"({settings.MAX_EXTRACTED_TEXT_CHARS} caracteres). "
                "Divide el documento en archivos más pequeños."
            ),
        )

    content_hash = hashlib.sha256(text_content.encode("utf-8")).hexdigest()
    duplicate = await get_document_content_by_hash(chatbot_id, content_hash)
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"Este contenido ya fue subido como {duplicate.get('filename', 'otro documento')}.",
        )

    # Sanitize filename for safe Supabase Storage key path
    safe_filename = sanitize_filename(filename)

    # Upload original file to blob storage using the safe filename
    blob_path = f"documents/{chatbot_id}/{document_id}/{safe_filename}"
    blob_url = await upload_file_to_blob(content_bytes, blob_path, file.content_type or "application/octet-stream")

    # Store extracted text in Cosmos DB
    await store_document_content(
        document_id=document_id,
        chatbot_id=chatbot_id,
        filename=filename,
        content=text_content,
        content_hash=content_hash,
    )

    document = {
        "id": document_id,
        "chatbot_id": chatbot_id,
        "filename": filename,
        "mime_type": file.content_type or "text/plain",
        "blob_url": blob_url,
        "content_hash": content_hash,
        "status": "indexed",
        "chunk_count": 1,
        "created_at": now,
        "processed_at": now,
    }
    await create_document(document)

    return document


@app.get("/documents/{document_id}")
async def get_document_details(document_id: str, current_user: dict = Depends(get_current_user)):
    document = await get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Parche de seguridad: Validar propiedad del chatbot asociado
    chatbot = await get_chatbot(document.get("chatbot_id"))
    if not chatbot or chatbot.get("owner_id") != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="No tienes permisos para este documento.")
        
    return document


@app.get("/documents")
async def get_documents(
    chatbot_id: str,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    # Parche de seguridad: Validar propiedad del chatbot antes de listar documentos
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot or chatbot.get("owner_id") != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="No tienes permisos para este chatbot.")
        
    documents = await list_documents(chatbot_id, limit=limit, offset=offset)
    return documents


@app.delete("/documents/{document_id}")
async def delete_document_endpoint(document_id: str, chatbot_id: str, current_user: dict = Depends(get_current_user)):
    # Parche de seguridad: Validar propiedad del chatbot antes de eliminar documentos
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot or chatbot.get("owner_id") != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="No tienes permisos para este chatbot.")
        
    await delete_document(document_id, chatbot_id)
    await delete_document_content(document_id, chatbot_id)
    return {"message": "Documento eliminado"}


@app.post("/chat/{chatbot_id}")
@limiter.limit("100/minute")
async def chat_endpoint(request: Request, chatbot_id: str, body: ChatMessage):
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot no encontrado")

    current_user = await get_current_user_optional(request)
    student_id = current_user.get("sub") if current_user and current_user.get("role") != "anonymous" else None

    msg_hash = hashlib.sha256(body.message.encode("utf-8")).hexdigest()
    cache_key = f"{chatbot_id}:{msg_hash}"
    cached = _get_cached_response(cache_key)
    if cached:
        conversation_id = await _persist_chat_turn(
            chatbot_id,
            body.conversation_id,
            body.message,
            cached["response"],
            student_id=student_id,
        )
        return ChatResponse(
            response=cached["response"],
            conversation_id=conversation_id,
            sources=cached["sources"],
        )

    prep = await _prepare_chat_generation(chatbot, chatbot_id, body.message, body.conversation_id)
    if prep.get("early_response") is not None:
        conversation_id = await _persist_chat_turn(
            chatbot_id,
            body.conversation_id,
            body.message,
            prep["early_response"],
            student_id=student_id,
        )
        return ChatResponse(
            response=prep["early_response"],
            conversation_id=conversation_id,
            sources=prep["source_names"],
        )

    llm = get_llm_client()
    is_error = False
    try:
        response_text = await llm.generate(
            prep["system_prompt"],
            prep["context"],
            body.message,
            prep["temperature"],
            api_key=prep["custom_api_key"],
            model_id=prep["custom_model"],
            history_messages=prep["history_messages"],
        )
    except Exception as e:
        response_text = f"Lo siento, no pude procesar tu pregunta. Error: {str(e)}"
        is_error = True

    if not is_error:
        _set_cached_response(cache_key, response_text, prep["source_names"])

    conversation_id = await _persist_chat_turn(
        chatbot_id,
        body.conversation_id,
        body.message,
        response_text,
        student_id=student_id,
    )

    return ChatResponse(
        response=response_text,
        conversation_id=conversation_id,
        sources=prep["source_names"],
    )

@app.post("/chat/{chatbot_id}/stream")
@limiter.limit("100/minute")
async def chat_stream_endpoint(request: Request, chatbot_id: str, body: ChatMessage):
    """
    Variante streaming del endpoint de chat. Devuelve Server-Sent Events
    con la respuesta incremental del LLM y un evento final con metadata
    (conversation_id, sources). Mantiene la conexion activa enviando
    bytes constantemente para evitar timeouts de proxies intermedios.
    """
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot no encontrado")

    current_user = await get_current_user_optional(request)
    student_id = current_user.get("sub") if current_user and current_user.get("role") != "anonymous" else None

    msg_hash = hashlib.sha256(body.message.encode("utf-8")).hexdigest()
    cache_key = f"{chatbot_id}:{msg_hash}"
    cached_payload = _get_cached_response(cache_key)

    prep = await _prepare_chat_generation(chatbot, chatbot_id, body.message, body.conversation_id)
    source_names = prep["source_names"]

    async def event_stream():
        if cached_payload is not None:
            conv_id = await _persist_chat_turn(
                chatbot_id,
                body.conversation_id,
                body.message,
                cached_payload["response"],
                student_id=student_id,
            )
            yield _sse("token", {"content": cached_payload["response"]})
            yield _sse("done", {
                "conversation_id": conv_id,
                "sources": cached_payload["sources"],
                "cached": True,
            })
            return

        if prep.get("early_response") is not None:
            conv_id = await _persist_chat_turn(
                chatbot_id,
                body.conversation_id,
                body.message,
                prep["early_response"],
                student_id=student_id,
            )
            yield _sse("token", {"content": prep["early_response"]})
            yield _sse("done", {
                "conversation_id": conv_id,
                "sources": source_names,
                "cached": False,
            })
            return

        llm = get_llm_client()
        collected: list[str] = []
        is_error = False
        try:
            async for piece in llm.generate_stream(
                prep["system_prompt"],
                prep["context"],
                body.message,
                prep["temperature"],
                api_key=prep["custom_api_key"],
                model_id=prep["custom_model"],
                history_messages=prep["history_messages"],
            ):
                collected.append(piece)
                yield _sse("token", {"content": piece})
        except Exception as e:
            is_error = True
            err_msg = f"Lo siento, no pude procesar tu pregunta. Error: {str(e)}"
            collected = [err_msg]
            yield _sse("error", {"message": err_msg})

        full_response = "".join(collected)

        if not is_error and full_response:
            _set_cached_response(cache_key, full_response, source_names)

        conv_id = await _persist_chat_turn(
            chatbot_id,
            body.conversation_id,
            body.message,
            full_response,
            student_id=student_id,
        )
        yield _sse("done", {
            "conversation_id": conv_id,
            "sources": source_names,
            "cached": False,
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _prepare_chat_generation(
    chatbot: dict, chatbot_id: str, user_message: str, conversation_id: Optional[str] = None
) -> dict:
    """
    Prepara todo el material necesario para generar una respuesta:
    contexto truncado, system prompt, credenciales del docente, temperature, historial de conversación.

    Retorna un dict con:
      - context, system_prompt, temperature, source_names
      - custom_api_key, custom_model
      - early_response: si no se debe llamar al LLM (mensaje pre-construido).
      - history_messages: historial de mensajes previos para memoria conversacional.
    """
    doc_contents = await get_all_contents_for_chatbot(chatbot_id)
    source_names = [d.get("filename", "documento") for d in doc_contents]

    context = build_context(doc_contents, user_message)

    system_prompt = chatbot.get("system_prompt_override") or get_default_system_prompt(
        chatbot.get("tone", "friendly"),
        chatbot.get("restriction_level", "guided")
    )

    history_messages = []
    if conversation_id:
        # Leer el historial desde la tabla normalizada messages
        raw_messages = await list_messages_for_conversation(conversation_id, limit=20)
        if raw_messages:
            # Verificar que la conversación pertenece a este chatbot
            existing_conv = await get_conversation(conversation_id)
            if existing_conv and existing_conv.get("chatbot_id") == chatbot_id:
                history_messages = [
                    {"role": m["role"], "content": m["content"]}
                    for m in raw_messages
                ]
        else:
            # Fallback: intentar leer del campo JSONB legacy (conversaciones antiguas)
            existing_conv = await get_conversation(conversation_id)
            if existing_conv and existing_conv.get("chatbot_id") == chatbot_id:
                raw_history = existing_conv.get("messages", [])
                if isinstance(raw_history, list):
                    # Mantener los últimos 20 mensajes para no desbordar el contexto
                    history_messages = raw_history[-20:]

    owner_id = chatbot.get("owner_id")
    custom_api_key = None
    custom_model = None
    early_response = None

    if owner_id:
        owner = await get_user(owner_id)
        if owner:
            # Columnas nativas son autoritativas. Si están vacías, no hay key configurada.
            encrypted_key = owner.get("openrouter_api_key")
            custom_api_key = decrypt_api_key(encrypted_key) or None
            custom_model = owner.get("openrouter_model") or None

            # Si no hay API Key configurada, validar si es una cuenta de testeo autorizada
            if not custom_api_key:
                owner_email = owner.get("email", "") or ""
                is_test_account = owner.get("is_test_account") or False

                # Usar la lista centralizada de settings (gestionada vía TEST_ACCOUNTS_WHITELIST)
                is_in_whitelist = owner_email in settings.test_accounts_list

                if not (is_test_account or is_in_whitelist):
                    early_response = (
                        "Lo siento, este chatbot está inactivo temporalmente. "
                        "El docente propietario debe configurar su propia API Key de OpenRouter "
                        "en su panel de Configuración para activar las respuestas."
                    )

    temperature = RESTRICTION_TEMPERATURES.get(chatbot.get("restriction_level", "guided"), 0.5)

    return {
        "context": context,
        "system_prompt": system_prompt,
        "temperature": temperature,
        "source_names": source_names,
        "custom_api_key": custom_api_key,
        "custom_model": custom_model,
        "early_response": early_response,
        "history_messages": history_messages,
    }


async def _persist_chat_turn(
    chatbot_id: str,
    conversation_id_in: Optional[str],
    user_message: str,
    assistant_response: str,
    student_id: Optional[str] = None,
) -> str:
    """Guarda el turno de chat en Supabase (tabla messages normalizada) y retorna el conversation_id final."""
    now = datetime.utcnow().isoformat()

    existing_conv = None
    if conversation_id_in:
        existing_conv = await get_conversation(conversation_id_in)
        if existing_conv and existing_conv.get("chatbot_id") != chatbot_id:
            raise HTTPException(status_code=403, detail="Conversation ID no autorizado para este chatbot")

    if existing_conv:
        existing_student_id = existing_conv.get("student_id")
        if existing_student_id and student_id and existing_student_id != student_id:
            raise HTTPException(status_code=403, detail="Conversation ID no autorizado para este usuario")

        conversation_id = existing_conv["id"]
        # Actualizar metadatos de la conversación (updated_at)
        if student_id and not existing_student_id:
            existing_conv["student_id"] = student_id
        await save_conversation(existing_conv)
    else:
        conversation_id = str(uuid.uuid4())
        conversation = {
            "id": conversation_id,
            "chatbot_id": chatbot_id,
            "student_id": student_id,
        }
        await create_conversation(conversation)

    # Persistir los dos mensajes del turno en la tabla normalizada
    assistant_ts = datetime.utcnow().isoformat()
    new_messages = [
        {"conversation_id": conversation_id, "role": "user", "content": user_message, "created_at": now},
        {"conversation_id": conversation_id, "role": "assistant", "content": assistant_response, "created_at": assistant_ts},
    ]
    await create_messages_batch(new_messages)

    return conversation_id

@app.get("/chat/{chatbot_id}/history")
async def get_chat_history(chatbot_id: str, conversation_id: str, request: Request):
    """
    Devuelve el historial de una conversación.
    Solo el dueño del chatbot o el mismo usuario que inició la conversación puede acceder.
    Requiere autenticación para proteger la privacidad de los estudiantes.
    """
    current_user = await get_current_user_optional(request)
    if not current_user or current_user.get("role") == "anonymous":
        raise HTTPException(
            status_code=401,
            detail="Se requiere autenticación para acceder al historial de conversaciones."
        )

    conversation = await get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    if conversation.get("chatbot_id") != chatbot_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Validar que quien consulta es el dueño del chatbot
    chatbot = await get_chatbot(chatbot_id)
    is_owner = chatbot and chatbot.get("owner_id") == current_user.get("sub")
    is_admin = current_user.get("role") == "admin"
    is_student = conversation.get("student_id") and conversation.get("student_id") == current_user.get("sub")

    if not (is_owner or is_admin or is_student):
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos para ver este historial de conversación."
        )

    # Obtener mensajes desde la tabla normalizada
    messages = await list_messages_for_conversation(conversation_id)
    if messages:
        return {
            **conversation,
            "messages": messages,
        }
    # Fallback para conversaciones antiguas con JSONB
    return conversation


@app.post("/admin/teachers")
async def create_teacher(data: TeacherCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden crear docentes")

    existing = await get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")

    teacher_id = str(uuid.uuid4())
    password_hash = hash_password(data.password)

    first = (data.firstName or "").strip()
    last = (data.lastName or "").strip()
    inst = (data.institution or "").strip()

    teacher_data = {
        "id": teacher_id,
        "email": data.email,
        "password": password_hash,
        "role": "teacher",
        "auth_method": "email_password",
        "country": data.country,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
        "first_name": first,
        "last_name": last,
        "institution_name": inst,
        "openrouter_api_key": "",
        "openrouter_model": "",
        "is_test_account": False,
    }

    await create_user(teacher_data)

    safe_user = {k: v for k, v in teacher_data.items() if k != "password"}
    return map_user_response(safe_user)


@app.get("/admin/teachers")
async def list_teachers(
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden listar docentes")
    teachers = await list_users(role="teacher", limit=limit, offset=offset)
    return [map_user_response({k: v for k, v in t.items() if k != "password"}) for t in teachers]


@app.put("/admin/teachers/{teacher_id}")
async def update_teacher(teacher_id: str, data: TeacherUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden actualizar docentes")
    
    teacher = await get_user(teacher_id)
    if not teacher or teacher.get("role") != "teacher":
        raise HTTPException(status_code=404, detail="Docente no encontrado")
        
    updates = {}
    if data.email is not None:
        if data.email != teacher.get("email"):
            existing = await get_user_by_email(data.email)
            if existing:
                raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
        updates["email"] = data.email

    if data.password is not None and data.password.strip() != "":
        updates["password"] = hash_password(data.password)
        updates["auth_method"] = "email_password"

    if data.firstName is not None or data.lastName is not None or data.institution is not None:
        # Leer valores actuales desde columnas nativas
        new_first = data.firstName.strip() if data.firstName is not None else (teacher.get("first_name") or "")
        new_last = data.lastName.strip() if data.lastName is not None else (teacher.get("last_name") or "")
        new_inst = data.institution.strip() if data.institution is not None else (teacher.get("institution_name") or "")
        updates["first_name"] = new_first
        updates["last_name"] = new_last
        updates["institution_name"] = new_inst

    if data.country is not None:
        updates["country"] = data.country

    if updates:
        await update_user(teacher_id, updates)

    updated_teacher = await get_user(teacher_id)
    safe_user = {k: v for k, v in updated_teacher.items() if k != "password"}
    return map_user_response(safe_user)


@app.delete("/admin/teachers/{teacher_id}")
async def delete_teacher(teacher_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden eliminar docentes")

    teacher = await get_user(teacher_id)
    if not teacher or teacher.get("role") != "teacher":
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    # Usar la abstracción de supabase_db en lugar de acceder a get_client() directamente
    deleted = await delete_user(teacher_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Error al eliminar el docente")
    return {"detail": "Docente eliminado exitosamente"}


@app.get("/teacher/metrics")
async def get_teacher_metrics(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Solo docentes pueden ver sus métricas")
    
    owner_id = current_user.get("sub")
    
    # 1. Obtener chatbots de este docente
    chatbots = await list_chatbots(owner_id=owner_id)
    total_chatbots = len(chatbots)
    published_chatbots = len([cb for cb in chatbots if cb.get("is_published")])
    
    # 2. Obtener total de documentos indexados de todos sus chatbots en una sola query
    total_documents = 0
    weekly_conversations_count = 0
    
    chatbot_ids = [cb.get("id") for cb in chatbots]
    if chatbot_ids:
        documents = await list_documents_for_chatbots(chatbot_ids)
        total_documents = len([d for d in documents if d.get("status") == "indexed"])

        # 3. Obtener conversaciones semanales a la vez
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        conversations = await list_conversations_for_chatbots(chatbot_ids)
        for conv in conversations:
            updated_at_str = conv.get("updated_at") or conv.get("created_at")
            if updated_at_str:
                try:
                    updated_at_str_clean = updated_at_str.replace("Z", "+00:00")
                    updated_at = datetime.fromisoformat(updated_at_str_clean)
                    updated_at_naive = updated_at.replace(tzinfo=None)
                    if updated_at_naive >= one_week_ago:
                        weekly_conversations_count += 1
                except Exception:
                    weekly_conversations_count += 1
            else:
                weekly_conversations_count += 1
                
    return {
        "totalChatbots": total_chatbots,
        "publishedChatbots": published_chatbots,
        "totalDocuments": total_documents,
        "weeklyConversations": weekly_conversations_count,
        "channelStatus": "100% Activo"
    }


@app.get("/platform/stats")
async def get_platform_stats():
    """
    Estadísticas públicas de la plataforma para la landing page.
    No requiere autenticación — solo retorna conteos agregados.
    """
    try:
        client = get_client()
        chatbots_resp = client.table("chatbots").select("id", count="exact").eq("is_published", True).execute()
        teachers_resp = client.table("users").select("id", count="exact").eq("role", "teacher").eq("is_active", True).execute()
        # Contar mensajes desde la tabla normalizada (no desde el JSONB legacy)
        messages_resp = client.table("messages").select("id", count="exact").execute()

        return {
            "totalChatbots": chatbots_resp.count or 0,
            "totalTeachers": teachers_resp.count or 0,
            "totalMessages": messages_resp.count or 0,
        }
    except Exception as e:
        logger.warning(f"platform/stats error: {e}")
        raise HTTPException(status_code=503, detail="Estadísticas no disponibles temporalmente")


if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
