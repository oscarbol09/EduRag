from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class UserBase(BaseModel):
    email: str
    role: Literal["teacher", "student", "admin"]
    auth_method: Literal["pre_created", "email_password", "google", "microsoft"]
    institution: Optional[str] = None
    country: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    institution_name: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    openrouter_model: Optional[str] = None
    is_test_account: Optional[bool] = False


class UserCreate(UserBase):
    password: Optional[str] = None


class User(UserBase):
    id: str
    created_at: datetime
    is_active: bool = True

    class Config:
        from_attributes = True


class TeacherCreate(BaseModel):
    email: str
    password: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    institution: Optional[str] = None
    country: Optional[str] = None


class TeacherUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    institution: Optional[str] = None
    country: Optional[str] = None


class ChatbotBase(BaseModel):
    name: str
    subject_area: str
    education_level: Literal["secondary", "university"]
    tone: Literal["formal", "friendly", "technical"] = "friendly"
    welcome_message: Optional[str] = None
    system_prompt_override: Optional[str] = None
    restriction_level: Literal["strict", "guided", "open"] = "guided"
    llm_provider: str = "openrouter"


class ChatbotCreate(ChatbotBase):
    pass


class Chatbot(ChatbotBase):
    id: str
    owner_id: str
    public_url: Optional[str] = None
    embed_code: Optional[str] = None
    is_published: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentBase(BaseModel):
    filename: str
    mime_type: str


class DocumentCreate(DocumentBase):
    chatbot_id: str
    blob_url: str


class Document(DocumentBase):
    id: str
    chatbot_id: str
    blob_url: str
    status: Literal["queued", "processing", "indexed", "error"] = "queued"
    chunk_count: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime


class ConversationBase(BaseModel):
    chatbot_id: str
    student_id: Optional[str] = None


class ConversationCreate(ConversationBase):
    pass


class Conversation(ConversationBase):
    id: str
    messages: list[Message] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "student"  # Mantenido por compatibilidad con el frontend, ignorado por seguridad en el endpoint.


class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: list[str] = []


class ProfileUpdateRequest(BaseModel):
    firstName: str
    lastName: str
    institution: str
    country: Optional[str] = None
    openrouterApiKey: Optional[str] = None
    openrouterModel: Optional[str] = None
