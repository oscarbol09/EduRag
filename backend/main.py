from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
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
from azure_cosmos_db import (
    create_user, get_user, get_user_by_email, list_users,
    create_chatbot, get_chatbot, get_chatbot_by_id_and_owner, update_chatbot, delete_chatbot, list_chatbots,
    create_document, get_document, update_document, list_documents, delete_document,
    create_conversation, get_conversation, save_conversation, list_conversations
)
from vector_store import query_similar, delete_chatbot_vectors
from llm_client import get_llm_client
from document_uploader import upload_file_to_blob, publish_to_queue
from auth import get_current_user, get_current_user_optional
from password import hash_password, verify_password
from jwt_token import create_jwt_token

app = FastAPI(title="EduRAG API", version="0.1.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

response_cache: dict = {}

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
    return {"name": "EduRAG API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/ready")
async def readiness_check():
    try:
        from vector_store import get_chroma_client
        get_chroma_client()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/auth/me")
async def get_current_user_endpoint(request: Request):
    user = await get_current_user_optional(request)
    return {"id": user.get("sub"), "email": user.get("email"), "role": user.get("role", "anonymous")}


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
    return {"token": token, "user": user}


@app.post("/auth/register")
async def register(body: RegisterRequest):
    existing = await get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    user_id = str(uuid.uuid4())
    password_hash = hash_password(body.password)
    user = {
        "id": user_id,
        "email": body.email,
        "password": password_hash,
        "role": body.role,
        "auth_method": "email_password",
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    await create_user(user)
    token = create_jwt_token(
        user_id=user_id,
        email=body.email,
        role=body.role
    )
    return {"token": token, "user": user}


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
    delete_chatbot_vectors(chatbot_id)
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


@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    chatbot_id: str = Form(...)
):
    if file.size and file.size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Archivo demasiado grande (máx {settings.MAX_FILE_SIZE_MB}MB)")
    
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
    
    document_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    blob_path = f"documents/{chatbot_id}/{document_id}/{file.filename}"
    
    content = await file.read()
    blob_url = await upload_file_to_blob(content, blob_path, file.content_type)
    
    document = {
        "id": document_id,
        "chatbot_id": chatbot_id,
        "filename": file.filename,
        "mime_type": file.content_type,
        "blob_url": blob_url,
        "status": "queued",
        "chunk_count": 0,
        "created_at": now
    }
    await create_document(document)
    
    publish_to_queue({
        "document_id": document_id,
        "chatbot_id": chatbot_id,
        "blob_url": blob_url,
        "filename": file.filename,
        "mime_type": file.content_type
    })
    
    return document


@app.get("/documents/{document_id}")
async def get_document_details(document_id: str):
    document = await get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return document


@app.get("/documents")
async def get_documents(chatbot_id: str):
    documents = await list_documents(chatbot_id)
    return documents


@app.delete("/documents/{document_id}")
async def delete_document_endpoint(document_id: str, chatbot_id: str):
    await delete_document(document_id, chatbot_id)
    return {"message": "Documento eliminado"}


@app.post("/chat/{chatbot_id}")
@limiter.limit("100/minute")
async def chat_endpoint(request: Request, chatbot_id: str, body: ChatMessage):
    chatbot = await get_chatbot(chatbot_id)
    if not chatbot:
        raise HTTPException(status_code=404, detail="Chatbot no encontrado")

    cache_key = f"{chatbot_id}:{body.message[:50]}"
    if cache_key in response_cache:
        return ChatResponse(
            response=response_cache[cache_key]["response"],
            conversation_id=body.conversation_id or str(uuid.uuid4()),
            sources=response_cache[cache_key]["sources"]
        )

    sources = []
    try:
        embedding = await generate_embedding(body.message)
        sources = query_similar(chatbot_id, embedding, top_k=settings.RETRIEVAL_TOP_K)
        context = "\n\n".join([s["content"] for s in sources])
    except Exception:
        context = "No hay documentos indexados para este chatbot."

    system_prompt = chatbot.get("system_prompt_override") or get_default_system_prompt(
        chatbot.get("tone", "friendly"),
        chatbot.get("restriction_level", "guided")
    )

    llm = get_llm_client(chatbot.get("llm_provider", "gemini"))
    temperature = RESTRICTION_TEMPERATURES.get(chatbot.get("restriction_level", "guided"), 0.5)

    try:
        response_text = llm.generate(system_prompt, context, body.message, temperature)
    except Exception as e:
        response_text = f"Lo siento, no pude procesar tu pregunta. Error: {str(e)}"

    if len(response_cache) >= settings.MAX_CACHE_SIZE:
        response_cache.pop(next(iter(response_cache)))
    response_cache[cache_key] = {"response": response_text, "sources": [s.get("content", "")[:100] for s in sources]}

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
        sources=[s.get("content", "")[:100] for s in sources]
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
    teacher_id = str(uuid.uuid4())
    teacher = {
        "id": teacher_id,
        "email": data.email,
        "role": "teacher",
        "auth_method": "pre_created",
        "institution": data.institution,
        "country": data.country,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    await create_user(teacher)
    return teacher


@app.get("/admin/teachers")
async def list_teachers(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden listar docentes")
    teachers = await list_users(role="teacher")
    return teachers


async def generate_embedding(text: str) -> list[float]:
    import google.generativeai as genai
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    result = genai.embed_content(model="models/text-embedding-004", content=text, task_type="retrieval_query")
    return result["embedding"]


if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
