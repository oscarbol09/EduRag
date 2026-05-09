import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import Optional
import os
from settings import settings

_client: Optional[chromadb.PersistentClient] = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=settings.CHROMA_DB_PATH,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
    return _client


def get_collection(chatbot_id: str) -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=f"chatbot_{chatbot_id}",
        metadata={"chatbot_id": chatbot_id}
    )


def add_documents(chatbot_id: str, chunks: list[str], embeddings: list[list[float]], document_id: str):
    collection = get_collection(chatbot_id)
    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=[{"document_id": document_id, "chunk_index": i} for i in range(len(chunks))]
    )