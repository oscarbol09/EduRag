from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
import uuid
from datetime import datetime
from typing import Optional
from settings import settings
from models import *
from supabase_db import (
    create_user, get_user, get_user_by_email, list_users,
    create_chatbot, get_chatbot, get_chatbot_by_id_and_owner, update_chatbot, delete_chatbot, list_chatbots,
    create_document, get_document, update_document, list_documents, delete_document,
    create_conversation, get_conversation, save_conversation, list_conversations
)
from vector_store import (
    store_document_content,
    get_all_contents_for_chatbot,
    delete_all_contents_for_chatbot,
    delete_document_content,
)
from llm_client import get_llm_client
from document_uploader import upload_file_to_blob, extract_text_from_file
from auth import get_current_user, get_current_user_optional
from password import hash_password, verify_password
from jwt_token import create_jwt_token

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

response_cache: dict = {}
CACHE_TTL_SECONDS = 300  # Parche de seguridad: caché de 5 minutos de tiempo de vida (TTL)

RESTRICTION_TEMPERATURES = {
    "strict": 0.2,
    "guided": 0.5,
    "open": 0.8
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
2. Si el estudiante te saluda con un 'hola' o similar, dale una cordial y cálida bienvenida en tu primer mensaje. Presenta brevemente el tema en el que te especializas (basándote en el contexto de los documentos) e invítalo de forma amigable a hacer su primera pregunta o plantear sus dudas.
3. Fomenta el autoaprendizaje: utiliza analogías sencillas del día a día, ejemplos claros y, opcionalmente, plantéale pequeñas preguntas de reflexión al final de tus respuestas para estimular su curiosidad.
4. Cita siempre el nombre de los documentos fuente (por ejemplo, "[nombre_archivo.txt]") al utilizar la información de los mismos, integrándolos de manera fluida y elegante en tu explicación."""

def map_user_response(user: dict) -> dict:
    if not user:
        return {}
    
    # Valores por defecto
    first_name = user.get("first_name")
    last_name = user.get("last_name")
    institution_name = user.get("institution_name")
    openrouter_api_key = user.get("openrouter_api_key")
    openrouter_model = user.get("openrouter_model")
    is_test_account = user.get("is_test_account") or False

    # Si los nuevos campos son nulos/vacíos pero existe el campo legacy, parsearlo como fallback
    inst_field = user.get("institution") or ""
    if " | " in inst_field and not (first_name or last_name or institution_name or openrouter_api_key or openrouter_model):
        parts = inst_field.split(" | ")
        if len(parts) >= 1:
            full_name = parts[0].strip()
            name_parts = full_name.split(" ", 1)
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""
        if len(parts) >= 2:
            institution_name = parts[1].strip()
        if len(parts) >= 3:
            openrouter_api_key = parts[2].strip()
        if len(parts) >= 4:
            openrouter_model = parts[3].strip()

    # Si los nuevos campos tienen valor pero el campo legacy está vacío, construirlo
    if not inst_field and (first_name or last_name or institution_name):
        full_name = f"{first_name or ''} {last_name or ''}".strip()
        inst_field = f"{full_name} | {institution_name or ''} | {openrouter_api_key or ''} | {openrouter_model or ''}"

    res = dict(user)
    res["first_name"] = first_name
    res["last_name"] = last_name
    res["institution_name"] = institution_name
    res["openrouter_api_key"] = openrouter_api_key
    res["openrouter_model"] = openrouter_model
    res["is_test_account"] = is_test_account
    
    # Compatibilidad con frontend camelCase
    res["firstName"] = first_name
    res["lastName"] = last_name
    res["institutionName"] = institution_name
    res["openrouterApiKey"] = openrouter_api_key
    res["openrouterModel"] = openrouter_model
    res["institution"] = inst_field
    
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
        from supabase_db import get_client
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
        
    combined_inst = f"{body.firstName.strip()} {body.lastName.strip()} | {body.institution.strip()}"
    openrouter_key = body.openrouterApiKey.strip() if body.openrouterApiKey else ""
    openrouter_model = body.openrouterModel.strip() if body.openrouterModel else ""
    combined_inst = f"{combined_inst} | {openrouter_key} | {openrouter_model}"
    
    updates = {
        "institution": combined_inst,
        "country": body.country.strip() if body.country else None
    }
    
    updates_native = {
        **updates,
        "first_name": body.firstName.strip(),
        "last_name": body.lastName.strip(),
        "institution_name": body.institution.strip(),
        "openrouter_api_key": openrouter_key,
        "openrouter_model": openrouter_model
    }
    
    from supabase_db import update_user
    try:
        await update_user(user_id, updates_native)
    except Exception:
        # Fallback si no se han creado las columnas en Supabase
        await update_user(user_id, updates)
    
    # Obtener el usuario actualizado
    updated_user = await get_user(user_id)
    safe_user = {k: v for k, v in updated_user.items() if k != "password"}
    return map_user_response(safe_user)


@app.post("/auth/login")
async def login(body: LoginRequest):
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
async def register(body: RegisterRequest):
    existing = await get_user_by_email(body.email)
    if existing:
        # Parche de seguridad / Usabilidad: Permitir a docentes precreados reclamar su cuenta
        if existing.get("auth_method") == "pre_created" and not existing.get("password"):
            password_hash = hash_password(body.password)
            
            # Actualizar contraseña y método de autenticación en Supabase
            from supabase_db import get_client
            get_client().table("users").update({
                "password": password_hash,
                "auth_method": "email_password"
            }).eq("id", existing["id"]).execute()
            
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
async def get_chatbots(request: Request, owner_id: Optional[str] = None, published_only: bool = False):
    if not owner_id:
        user = await get_current_user_optional(request)
        if user and user.get("role") == "teacher" and not published_only:
            owner_id = user.get("sub")
        else:
            owner_id = None
    chatbots = await list_chatbots(owner_id=owner_id, published_only=published_only)
    return chatbots


@app.post("/chatbots")
async def create_new_chatbot(data: ChatbotCreate, request: Request):
    user = await get_current_user(request)
    owner_id = user.get("sub")
    if not owner_id:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

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
async def get_chatbot_details(chatbot_id: str):
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot no encontrado")
    return chatbot


@app.put("/chatbots/{chatbot_id}")
async def update_chatbot_details(chatbot_id: str, data: ChatbotCreate, request: Request):
    user = await get_current_user(request)
    owner_id = user.get("sub")
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
    )

    document = {
        "id": document_id,
        "chatbot_id": chatbot_id,
        "filename": filename,
        "mime_type": file.content_type or "text/plain",
        "blob_url": blob_url,
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
async def get_documents(chatbot_id: str, current_user: dict = Depends(get_current_user)):
    # Parche de seguridad: Validar propiedad del chatbot antes de listar documentos
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot or chatbot.get("owner_id") != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="No tienes permisos para este chatbot.")
        
    documents = await list_documents(chatbot_id)
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

    cache_key = f"{chatbot_id}:{body.message[:50]}"
    if cache_key in response_cache:
        cached = response_cache[cache_key]
        # Parche de seguridad: Validar que la caché no haya expirado (TTL de 5 minutos)
        if (datetime.utcnow() - cached["timestamp"]).total_seconds() < CACHE_TTL_SECONDS:
            return ChatResponse(
                response=cached["response"],
                conversation_id=body.conversation_id or str(uuid.uuid4()),
                sources=cached["sources"]
            )
        else:
            response_cache.pop(cache_key, None)

    # Retrieve all document contents for this chatbot from Cosmos DB
    doc_contents = await get_all_contents_for_chatbot(chatbot_id)
    source_names = [d.get("filename", "documento") for d in doc_contents]

    if doc_contents:
        # Build context from all documents
        context_parts = []
        for doc in doc_contents:
            fname = doc.get("filename", "documento")
            text = doc.get("content", "")
            context_parts.append(f"--- Documento: {fname} ---\n{text}")
        context = "\n\n".join(context_parts)
    else:
        context = "No hay documentos cargados para este chatbot."

    system_prompt = chatbot.get("system_prompt_override") or get_default_system_prompt(
        chatbot.get("tone", "friendly"),
        chatbot.get("restriction_level", "guided")
    )

    # Extraer la API Key personalizada del docente (propietario) si existe
    owner_id = chatbot.get("owner_id")
    custom_api_key = None
    custom_model = None
    if owner_id:
        owner = await get_user(owner_id)
        if owner:
            # Primero intentar obtener de las nuevas columnas nativas
            custom_api_key = owner.get("openrouter_api_key") or None
            custom_model = owner.get("openrouter_model") or None
            
            # Fallback si están vacíos al campo legacy
            if not custom_api_key or not custom_model:
                inst_field = owner.get("institution", "")
                if inst_field and " | " in inst_field:
                    parts = inst_field.split(" | ")
                    if len(parts) >= 3 and not custom_api_key:
                        custom_api_key = parts[2].strip() or None
                    if len(parts) >= 4 and not custom_model:
                        custom_model = parts[3].strip() or None
            
            # Si no hay API Key configurada, validar si es una cuenta de testeo autorizada
            if not custom_api_key:
                owner_email = owner.get("email", "")
                is_test_account = owner.get("is_test_account") or False
                
                # Cuentas de testeo autorizadas por whitelist en .env como variable
                import os
                whitelist_env = os.environ.get("TEST_ACCOUNTS_WHITELIST", "")
                whitelist = [e.strip() for e in whitelist_env.split(",") if e.strip()]
                is_in_whitelist = owner_email in whitelist or owner_email.endswith("@edurag.com")
                
                if not (is_test_account or is_in_whitelist):
                    return ChatResponse(
                        response="Lo siento, este chatbot está inactivo temporalmente. El docente propietario debe configurar su propia API Key de OpenRouter en su panel de Configuración para activar las respuestas.",
                        conversation_id=body.conversation_id or str(uuid.uuid4()),
                        sources=source_names
                    )

    llm = get_llm_client()
    temperature = RESTRICTION_TEMPERATURES.get(chatbot.get("restriction_level", "guided"), 0.5)

    is_error = False
    try:
        response_text = llm.generate(system_prompt, context, body.message, temperature, api_key=custom_api_key, model_id=custom_model)
    except Exception as e:
        response_text = f"Lo siento, no pude procesar tu pregunta. Error: {str(e)}"
        is_error = True

    if not is_error:
        if len(response_cache) >= settings.MAX_CACHE_SIZE:
            response_cache.pop(next(iter(response_cache)))
        response_cache[cache_key] = {
            "response": response_text,
            "sources": source_names,
            "timestamp": datetime.utcnow()
        }

    new_messages = [
        {"role": "user", "content": body.message, "timestamp": datetime.utcnow().isoformat()},
        {"role": "assistant", "content": response_text, "timestamp": datetime.utcnow().isoformat()}
    ]

    existing_conv = None
    if body.conversation_id:
        existing_conv = await get_conversation(body.conversation_id)

    if existing_conv:
        messages = existing_conv.get("messages", [])
        if not isinstance(messages, list):
            messages = []
        messages.extend(new_messages)
        existing_conv["messages"] = messages
        await save_conversation(existing_conv)
        conversation_id = existing_conv["id"]
    else:
        conversation_id = body.conversation_id or str(uuid.uuid4())
        conversation = {
            "id": conversation_id,
            "chatbot_id": chatbot_id,
            "student_id": None,
            "messages": new_messages
        }
        await create_conversation(conversation)

    return ChatResponse(
        response=response_text,
        conversation_id=conversation_id,
        sources=source_names
    )


@app.get("/chat/{chatbot_id}/history")
async def get_chat_history(chatbot_id: str, conversation_id: str):
    conversation = await get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    if conversation.get("chatbot_id") != chatbot_id:
        raise HTTPException(status_code=403, detail="No autorizado")
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
    full_name = f"{first} {last}".strip()
    inst = (data.institution or "").strip()
    serialized_inst = f"{full_name} | {inst} |  | " if full_name or inst else None
    
    teacher = {
        "id": teacher_id,
        "email": data.email,
        "password": password_hash,
        "role": "teacher",
        "auth_method": "email_password",
        "institution": serialized_inst,
        "country": data.country,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    
    teacher_native = {
        **teacher,
        "first_name": first,
        "last_name": last,
        "institution_name": inst,
        "openrouter_api_key": "",
        "openrouter_model": "",
        "is_test_account": False
    }
    
    from supabase_db import create_user
    try:
        await create_user(teacher_native)
    except Exception:
        # Fallback si las nuevas columnas no existen todavía
        await create_user(teacher)
    
    safe_user = {k: v for k, v in teacher.items() if k != "password"}
    return map_user_response(safe_user)


@app.get("/admin/teachers")
async def list_teachers(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden listar docentes")
    teachers = await list_users(role="teacher")
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
    
    has_name_update = data.firstName is not None or data.lastName is not None or data.institution is not None
    updates_native = dict(updates)
    
    if has_name_update:
        # Parsear el campo actual para preservar los campos no actualizados
        current_inst = teacher.get("institution", "") or ""
        current_first = teacher.get("first_name") or ""
        current_last = teacher.get("last_name") or ""
        current_institution = teacher.get("institution_name") or ""
        current_or_key = teacher.get("openrouter_api_key") or ""
        current_or_model = teacher.get("openrouter_model") or ""

        if not (current_first or current_last or current_institution or current_or_key or current_or_model) and " | " in current_inst:
            parts = current_inst.split(" | ")
            current_full_name = parts[0].strip()
            current_name_parts = current_full_name.split(" ", 1)
            current_first = current_name_parts[0] if current_name_parts else ""
            current_last = current_name_parts[1] if len(current_name_parts) > 1 else ""
            current_institution = parts[1].strip() if len(parts) > 1 else ""
            current_or_key = parts[2].strip() if len(parts) > 2 else ""
            current_or_model = parts[3].strip() if len(parts) > 3 else ""
        
        new_first = data.firstName.strip() if data.firstName is not None else current_first
        new_last = data.lastName.strip() if data.lastName is not None else current_last
        new_inst = data.institution.strip() if data.institution is not None else current_institution
        full_name = f"{new_first} {new_last}".strip()
        
        updates["institution"] = f"{full_name} | {new_inst} | {current_or_key} | {current_or_model}"
        
        updates_native = {
            **updates_native,
            "institution": updates["institution"],
            "first_name": new_first,
            "last_name": new_last,
            "institution_name": new_inst
        }
        
    if data.country is not None:
        updates["country"] = data.country
        updates_native["country"] = data.country
        
    if updates:
        from supabase_db import update_user
        try:
            await update_user(teacher_id, updates_native)
        except Exception:
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
        
    from supabase_db import get_client
    get_client().table("users").delete().eq("id", teacher_id).execute()
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
    
    # 2. Obtener total de documentos indexados de todos sus chatbots
    total_documents = 0
    for cb in chatbots:
        docs = await list_documents(cb.get("id"))
        total_documents += len([d for d in docs if d.get("status") == "indexed"])
        
    # 3. Obtener conversaciones semanales
    from datetime import datetime, timedelta
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    
    weekly_conversations_count = 0
    for cb in chatbots:
        conversations = await list_conversations(cb.get("id"))
        for conv in conversations:
            updated_at_str = conv.get("updated_at") or conv.get("created_at")
            if updated_at_str:
                try:
                    # Permitir parsear tanto formatos con Z como con +00:00
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


if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
