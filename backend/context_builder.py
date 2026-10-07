"""
Construcción del contexto del LLM con placeholders para Vector Embeddings.

Implementa un chunking semántico basado en bloques estructurales (párrafos)
en lugar de slicing arbitrario, y utiliza placeholders para búsqueda vectorial
(pgvector) en reemplazo del intersection léxico ingenuo.
"""

from __future__ import annotations
from typing import Iterable

# Presupuesto total de caracteres del contexto que se envía al LLM.
# ~60k chars ≈ 15k tokens — deja margen para system prompt + respuesta.
MAX_CONTEXT_CHARS = 60_000


def _chunk_text(text: str) -> list[str]:
    """
    Semantic chunking mechanism using block-based extraction (e.g., double newlines).
    Avoids arbitrary string slicing that cuts words in half.
    """
    if not text:
        return []
    
    blocks = text.split('\\n\\n')
    chunks = []
    current_chunk = []
    current_length = 0
    target_size = 1500
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        
        if current_length + len(block) > target_size and current_chunk:
            chunks.append("\\n\\n".join(current_chunk))
            current_chunk = [block]
            current_length = len(block)
        else:
            current_chunk.append(block)
            current_length += len(block) + 2 # +2 para el separador
            
    if current_chunk:
        chunks.append("\\n\\n".join(current_chunk))
        
    return chunks


def build_context(
    docs: Iterable[dict],
    user_message: str,
    max_chars: int = MAX_CONTEXT_CHARS,
) -> str:
    """
    Construye el contexto para el LLM.
    
    TODO: Integrate with pgvector or a dedicated Vector DB for semantic retrieval.
    Currently acts as a placeholder that preserves the structural chunks
    without relying on naive word intersection.
    """
    docs_list = [d for d in docs if d and d.get("content")]
    if not docs_list:
        return "No hay documentos cargados para este chatbot."

    all_chunks: list[tuple[str, str]] = []
    for d in docs_list:
        fname = d.get("filename", "documento")
        for ch in _chunk_text(d.get("content", "")):
            all_chunks.append((fname, ch))

    if not all_chunks:
        return "No hay documentos cargados para este chatbot."

    # PLACEHOLDER: Vector Embeddings Semantic Retrieval
    # In a full implementation:
    # 1. embed_query(user_message)
    # 2. pgvector_search(query_embedding, chatbot_id) -> ranked chunks
    # For now, we simulate by returning the available chunks directly
    ranked = all_chunks

    selected: list[tuple[str, str]] = []
    used = 0
    for fname, ch in ranked:
        header = f"--- Documento: {fname} ---\\n"
        cost = len(header) + len(ch) + 2
        if used + cost > max_chars:
            remaining = max_chars - used - len(header) - 2
            if remaining > 200:
                selected.append((fname, ch[:remaining]))
            break
        selected.append((fname, ch))
        used += cost

    if not selected:
        return "No hay documentos cargados para este chatbot."

    return "\\n\\n".join(f"--- Documento: {fname} ---\\n{ch}" for fname, ch in selected)
