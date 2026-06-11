"""
Document content store — stores and retrieves document text from Supabase (PostgreSQL).

Instead of using embeddings and vector search, document content is stored as plain text
in the 'document_contents' table and passed directly to the LLM's context window.
"""

import logging
from typing import List, Optional
from supabase_db import get_client

logger = logging.getLogger(__name__)


def _safe_data(response) -> Optional[dict]:
    """Extract .data from a supabase-py response, tolerating None or missing attribute.

    Workaround: with supabase-py 2.x, ``.maybe_single().execute()`` can occasionally
    return a response object whose ``.data`` attribute is ``None`` (no row matched)
    or whose top-level object itself is ``None`` on certain transport errors.
    Treating both cases as "no row" lets the upload flow continue without crashing.
    """
    if response is None:
        return None
    return getattr(response, "data", None)


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
    try:
        response = (
            get_client()
            .table("document_contents")
            .select("id, chatbot_id, filename, content_hash")
            .eq("chatbot_id", chatbot_id)
            .eq("content_hash", content_hash)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        logger.warning("get_document_content_by_hash: supabase error %s", e)
        return None
    return _safe_data(response)


async def get_document_content(document_id: str, chatbot_id: str) -> Optional[dict]:
    """Retrieve a single document's content."""
    try:
        response = (
            get_client()
            .table("document_contents")
            .select("*")
            .eq("id", document_id)
            .eq("chatbot_id", chatbot_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        logger.warning("get_document_content: supabase error %s", e)
        return None
    return _safe_data(response)


async def get_all_contents_for_chatbot(chatbot_id: str) -> List[dict]:
    """Retrieve all document contents for a chatbot."""
    response = (
        get_client()
        .table("document_contents")
        .select("id, filename, content")
        .eq("chatbot_id", chatbot_id)
        .execute()
    )
    if response is None:
        return []
    data = getattr(response, "data", None)
    return data if isinstance(data, list) else []


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
