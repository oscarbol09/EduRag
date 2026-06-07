from supabase import create_client, Client
from typing import Optional, List
from datetime import datetime
from settings import settings

import threading

_client: Optional[Client] = None
_client_lock = threading.Lock()


def get_client() -> Client:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                    raise RuntimeError("Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in .env")
                _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _client


# ── Users ────────────────────────────────────────────────────────────

async def create_user(user_data: dict) -> dict:
    get_client().table("users").insert(user_data).execute()
    return user_data


async def get_user(user_id: str) -> Optional[dict]:
    r = get_client().table("users").select("*").eq("id", user_id).maybe_single().execute()
    return r.data if r else None


async def get_user_by_email(email: str) -> Optional[dict]:
    r = get_client().table("users").select("*").eq("email", email).maybe_single().execute()
    return r.data if r else None


async def list_users(role: Optional[str] = None) -> List[dict]:
    q = get_client().table("users").select("*")
    if role:
        q = q.eq("role", role)
    return q.execute().data


async def update_user(user_id: str, updates: dict) -> dict:
    get_client().table("users").update(updates).eq("id", user_id).execute()
    return updates


async def delete_user(user_id: str) -> bool:
    """Elimina un usuario por ID. Usar sólo desde endpoints admin con validación previa."""
    try:
        get_client().table("users").delete().eq("id", user_id).execute()
        return True
    except Exception:
        return False


# ── Chatbots ─────────────────────────────────────────────────────────

async def create_chatbot(chatbot_data: dict) -> dict:
    get_client().table("chatbots").insert(chatbot_data).execute()
    return chatbot_data


async def get_chatbot(chatbot_id: str) -> Optional[dict]:
    r = get_client().table("chatbots").select("*").eq("id", chatbot_id).maybe_single().execute()
    return r.data if r else None


async def get_chatbot_by_id_and_owner(chatbot_id: str, owner_id: str) -> Optional[dict]:
    r = (
        get_client()
        .table("chatbots")
        .select("*")
        .eq("id", chatbot_id)
        .eq("owner_id", owner_id)
        .maybe_single()
        .execute()
    )
    return r.data if r else None


async def update_chatbot(chatbot_id: str, updates: dict, owner_id: str) -> Optional[dict]:
    updates["updated_at"] = datetime.utcnow().isoformat()
    r = (
        get_client()
        .table("chatbots")
        .update(updates)
        .eq("id", chatbot_id)
        .eq("owner_id", owner_id)
        .execute()
    )
    return r.data[0] if r.data else None


async def delete_chatbot(chatbot_id: str, owner_id: str) -> bool:
    try:
        get_client().table("chatbots").delete().eq("id", chatbot_id).eq("owner_id", owner_id).execute()
        return True
    except Exception:
        return False


async def list_chatbots(owner_id: Optional[str] = None, published_only: bool = False) -> List[dict]:
    q = get_client().table("chatbots").select("*")
    if owner_id:
        q = q.eq("owner_id", owner_id)
        if published_only:
            q = q.eq("is_published", True)
    else:
        # Parche de seguridad: Si no hay owner_id, forzar estrictamente que solo retorne publicados
        q = q.eq("is_published", True)
    return q.execute().data


# ── Documents ─────────────────────────────────────────────────────────

async def create_document(document_data: dict) -> dict:
    get_client().table("documents").insert(document_data).execute()
    return document_data


async def get_document(document_id: str) -> Optional[dict]:
    r = get_client().table("documents").select("*").eq("id", document_id).maybe_single().execute()
    return r.data if r else None


async def update_document(document_id: str, updates: dict, chatbot_id: str) -> Optional[dict]:
    r = (
        get_client()
        .table("documents")
        .update(updates)
        .eq("id", document_id)
        .eq("chatbot_id", chatbot_id)
        .execute()
    )
    return r.data[0] if r.data else None


async def list_documents(chatbot_id: str) -> List[dict]:
    return (
        get_client()
        .table("documents")
        .select("*")
        .eq("chatbot_id", chatbot_id)
        .execute()
        .data
    )


async def delete_document(document_id: str, chatbot_id: str) -> bool:
    try:
        get_client().table("documents").delete().eq("id", document_id).eq("chatbot_id", chatbot_id).execute()
        return True
    except Exception:
        return False


# ── Conversations ─────────────────────────────────────────────────────

async def create_conversation(conversation_data: dict) -> dict:
    get_client().table("conversations").insert(conversation_data).execute()
    return conversation_data


async def get_conversation(conversation_id: str) -> Optional[dict]:
    r = (
        get_client()
        .table("conversations")
        .select("*")
        .eq("id", conversation_id)
        .maybe_single()
        .execute()
    )
    return r.data if r else None


async def save_conversation(conversation_data: dict) -> dict:
    conversation_data["updated_at"] = datetime.utcnow().isoformat()
    get_client().table("conversations").upsert(conversation_data).execute()
    return conversation_data


async def list_conversations(chatbot_id: str) -> List[dict]:
    return (
        get_client()
        .table("conversations")
        .select("*")
        .eq("chatbot_id", chatbot_id)
        .execute()
        .data
    )
