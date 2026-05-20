"""
Document content store — stores and retrieves document text from Cosmos DB.

Replaces the previous ChromaDB-based vector_store.py. Instead of using
embeddings and vector search, document content is stored as plain text
in the 'document_contents' container in Cosmos DB and passed directly
to the LLM's context window.
"""

from typing import List, Optional


def _get_container():
    from azure_cosmos_db import get_container
    return get_container("document_contents")


async def store_document_content(
    document_id: str,
    chatbot_id: str,
    filename: str,
    content: str,
) -> dict:
    """Store extracted document text in Cosmos DB."""
    container = _get_container()
    item = {
        "id": document_id,
        "chatbot_id": chatbot_id,
        "filename": filename,
        "content": content,
    }
    container.upsert_item(item, partition_key=chatbot_id)
    return item


async def get_document_content(document_id: str, chatbot_id: str) -> Optional[dict]:
    """Retrieve a single document's content."""
    container = _get_container()
    try:
        return container.read_item(document_id, partition_key=chatbot_id)
    except Exception:
        return None


async def get_all_contents_for_chatbot(chatbot_id: str) -> List[dict]:
    """Retrieve all document contents for a chatbot."""
    container = _get_container()
    query = "SELECT c.id, c.filename, c.content FROM c WHERE c.chatbot_id = @chatbot_id"
    parameters = [{"name": "@chatbot_id", "value": chatbot_id}]
    return list(
        container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True,
        )
    )


async def delete_document_content(document_id: str, chatbot_id: str) -> bool:
    """Delete a document's content."""
    container = _get_container()
    try:
        container.delete_item(document_id, partition_key=chatbot_id)
        return True
    except Exception:
        return False


async def delete_all_contents_for_chatbot(chatbot_id: str) -> None:
    """Delete all document contents for a chatbot."""
    items = await get_all_contents_for_chatbot(chatbot_id)
    container = _get_container()
    for item in items:
        try:
            container.delete_item(item["id"], partition_key=chatbot_id)
        except Exception:
            pass
