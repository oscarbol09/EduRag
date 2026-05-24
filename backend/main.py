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
        "formal": "Responde de manera formal y académica.",
        "friendly": "Responde de manera amigable y accesible.",
        "technical": "Responde de manera técnica y precisa."
    }
    restriction_instruction = {
        "strict": "Responde ÚNICAMENTE usando la información del contexto proporcionado.",
        "guided": "Usa principalmente la información del contexto proporcionado.",
        "open": "Puedes usar el contexto como base, pero siente libertad de expandir."
    }
    return f"""Eres un asistente educativo especializado en ayudar a estudiantes.
{tone_instruction.get(tone, tone_instruction["friendly"])}
{restriction_instruction.get(restriction_level, restriction_instruction["guided"])}
Siempre cita las fuentes cuando sea posible."""


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
    return safe_user


@app.put("/auth/me/profile")
async def update_my_profile(body: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("sub")
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    # Serializar la institución con los campos de perfil y API keys
    # Formato: FirstName LastName | Institution | OpenRouterKey | ModelId
    combined_inst = f"{body.firstName.strip()} {body.lastName.strip()} | {body.institution.strip()}"
    
    openrouter_key = body.openrouterApiKey.strip() if body.openrouterApiKey else ""
    openrouter_model = body.openrouterModel.strip() if body.openrouterModel else ""
    
    combined_inst = f"{combined_inst} | {openrouter_key} | {openrouter_model}"
    
    updates = {
        "institution": combined_inst,
        "country": body.country.strip() if body.country else None
    }
    
    from supabase_db import update_user
    await update_user(user_id, updates)
    
    # Obtener el usuario actualizado
    updated_user = await get_user(user_id)
    safe_user = {k: v for k, v in updated_user.items() if k != "password"}
    return safe_user


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
    return {"token": token, "user": safe_user}


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
            return {"token": token, "user": safe_user}
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
    return {"token": token, "user": safe_user}


@app.get("/chatbots")
async def get_chatbots(request: Request, owner_id: Optional[str] = None, published_only: bool = False):
    if not owner_id:
        user = await get_current_user_optional(request)
        owner_id = user.get("sub") if user.get("sub") else None
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

    # Only accept .md and .txt — browsers may send these as application/octet-stream,
    # so we validate by extension rather than content-type alone.
    filename = file.filename or ""
    is_md = filename.lower().endswith(".md")
    is_txt = filename.lower().endswith(".txt")

    if not is_md and not is_txt:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo se aceptan archivos .md y .txt.")

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
            inst_field = owner.get("institution", "")
            if inst_field and " | " in inst_field:
                parts = inst_field.split(" | ")
                # Formato: "Nombre Apellido | Institución | OpenRouterKey | ModelId"
                if len(parts) >= 3:
                    custom_api_key = parts[2].strip() or None
                if len(parts) >= 4:
                    custom_model = parts[3].strip() or None
            
            # Si no hay API Key configurada, validar si es una cuenta de testeo autorizada
            if not custom_api_key:
                owner_email = owner.get("email", "")
                is_test_account = owner_email.endswith("@edurag.com")
                if not is_test_account:
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

    conversation_id = body.conversation_id or str(uuid.uuid4())
    conversation = {
        "id": conversation_id,
        "chatbot_id": chatbot_id,
        "student_id": None,
        "messages": [
            {"role": "user", "content": body.message, "timestamp": datetime.utcnow().isoformat()},
            {"role": "assistant", "content": response_text, "timestamp": datetime.utcnow().isoformat()}
        ]
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
    
    # Serializar nombre, apellido e institución en el mismo campo
    # Formato: "Nombre Apellido | Institución | OpenRouterKey | ModelId"
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
    await create_user(teacher)
    
    safe_user = {k: v for k, v in teacher.items() if k != "password"}
    return safe_user


@app.get("/admin/teachers")
async def list_teachers(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden listar docentes")
    teachers = await list_users(role="teacher")
    return teachers


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
    
    # Si se actualiza el nombre/apellido o institución, re-serializar el campo institution
    has_name_update = data.firstName is not None or data.lastName is not None or data.institution is not None
    if has_name_update:
        # Parsear el campo actual para preservar los campos no actualizados
        current_inst = teacher.get("institution", "") or ""
        if " | " in current_inst:
            parts = current_inst.split(" | ")
            current_full_name = parts[0].strip()
            current_name_parts = current_full_name.split(" ", 1)
            current_first = current_name_parts[0] if current_name_parts else ""
            current_last = current_name_parts[1] if len(current_name_parts) > 1 else ""
            current_institution = parts[1].strip() if len(parts) > 1 else ""
            current_or_key = parts[2].strip() if len(parts) > 2 else ""
            current_or_model = parts[3].strip() if len(parts) > 3 else ""
        else:
            current_first = ""
            current_last = ""
            current_institution = current_inst
            current_or_key = ""
            current_or_model = ""
        
        new_first = data.firstName.strip() if data.firstName is not None else current_first
        new_last = data.lastName.strip() if data.lastName is not None else current_last
        new_inst = data.institution.strip() if data.institution is not None else current_institution
        full_name = f"{new_first} {new_last}".strip()
        updates["institution"] = f"{full_name} | {new_inst} | {current_or_key} | {current_or_model}"
        
    if data.country is not None:
        updates["country"] = data.country
        
    if updates:
        from supabase_db import update_user
        await update_user(teacher_id, updates)
        
    updated_teacher = await get_user(teacher_id)
    safe_user = {k: v for k, v in updated_teacher.items() if k != "password"}
    return safe_user


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


if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
