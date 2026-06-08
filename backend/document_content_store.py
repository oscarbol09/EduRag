"""
Document content store — stores and retrieves document text from Supabase (PostgreSQL).

Instead of using embeddings and vector search, document content is stored as plain text
in the 'document_contents' table and passed directly to the LLM's context window.
"""

from typing import List, Optional
from supabase_db import get_client


async def store_document_content(
    document_id: str,
    chatbot_id: str,
    filename: str,
    content: str,
    content_hash: str | None = None,
) -> dict:
    """Store extracted document text in Supabase."""
    item = {
        "id": document_id,
        "chatbot_id": chatbot_id,
        "filename": filename,
        "content": content,
        "content_hash": content_hash,
    }
    get_client().table("document_contents").upsert(item).execute()
    return item


async def get_document_content_by_hash(chatbot_id: str, content_hash: str) -> Optional[dict]:
    """Return an existing document for this chatbot with the same extracted text hash."""
    if not content_hash:
        return None
    r = (
        get_client()
        .table("document_contents")
        .select("id, chatbot_id, filename, content_hash")
        .eq("chatbot_id", chatbot_id)
        .eq("content_hash", content_hash)
        .maybe_single()
        .execute()
    )
    return r.data


async def get_document_content(document_id: str, chatbot_id: str) -> Optional[dict]:
    """Retrieve a single document's content."""
    r = (
        get_client()
        .table("document_contents")
        .select("*")
        .eq("id", document_id)
        .eq("chatbot_id", chatbot_id)
        .maybe_single()
        .execute()
    )
    return r.data


async def get_all_contents_for_chatbot(chatbot_id: str) -> List[dict]:
    """Retrieve all document contents for a chatbot."""
    return (
        get_client()
        .table("document_contents")
        .select("id, filename, content")
        .eq("chatbot_id", chatbot_id)
        .execute()
        .data
    )


async def delete_document_content(document_id: str, chatbot_id: str) -> bool:
    """Delete a document's content."""
    try:
        get_client().table("document_contents").delete().eq("id", document_id).eq("chatbot_id", chatbot_id).execute()
        return True
    except Exception:
        return False


async def delete_all_contents_for_chatbot(chatbot_id: str) -> None:
    """Delete all document contents for a chatbot."""
    get_client().table("document_contents").delete().eq("chatbot_id", chatbot_id).execute()
