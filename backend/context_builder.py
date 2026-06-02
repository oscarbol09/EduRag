"""
Construcción del contexto del LLM con chunking léxico por relevancia.

Sin embeddings ni búsqueda vectorial: parte cada documento en bloques,
puntúa cada bloque por coincidencia de términos (stems simples) con la
pregunta del estudiante y selecciona los más relevantes hasta llenar
el presupuesto de caracteres.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Iterable

# Presupuesto total de caracteres del contexto que se envía al LLM.
# ~60k chars ≈ 15k tokens — deja margen para system prompt + respuesta.
MAX_CONTEXT_CHARS = 60_000

# Tamaño objetivo de cada chunk en caracteres.
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 200

# Stopwords mínimas en español para que el scoring sea útil.
_STOPWORDS = {
    "a", "al", "algo", "algun", "alguna", "algunas", "alguno", "algunos",
    "ante", "antes", "como", "con", "contra", "cual", "cuales", "cuando",
    "de", "del", "desde", "donde", "durante", "el", "ella", "ellas", "ellos",
    "en", "entre", "era", "eran", "es", "esa", "esas", "ese", "eso", "esos",
    "esta", "estaba", "estamos", "estan", "estar", "estas", "este", "esto",
    "estos", "fue", "fueron", "ha", "han", "hasta", "hay", "la", "las",
    "le", "les", "lo", "los", "mas", "me", "mi", "mis", "muy", "ni", "no",
    "nos", "nuestra", "nuestro", "o", "para", "pero", "poco", "por", "porque",
    "que", "qué", "quien", "quién", "quienes", "se", "ser", "si", "sin",
    "sobre", "solo", "son", "su", "sus", "te", "ti", "tiene", "tienen",
    "tu", "tus", "un", "una", "uno", "unos", "y", "ya", "yo", "of", "the",
    "and", "or", "to", "for", "in", "on", "at", "is", "are", "was", "were",
    "be", "been", "what", "which", "how", "who",
}

_WORD_RE = re.compile(r"[a-z0-9]+", flags=re.IGNORECASE)


def _normalize(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _tokens(text: str) -> set[str]:
    norm = _normalize(text)
    return {t for t in _WORD_RE.findall(norm) if t not in _STOPWORDS and len(t) > 2}


def _chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]
    chunks: list[str] = []
    step = chunk_size - overlap
    for start in range(0, len(text), step):
        end = start + chunk_size
        chunks.append(text[start:end])
        if end >= len(text):
            break
    return chunks


def build_context(
    docs: Iterable[dict],
    user_message: str,
    max_chars: int = MAX_CONTEXT_CHARS,
) -> str:
    """
    Construye el contexto para el LLM seleccionando los chunks más
    relevantes a la pregunta del usuario.

    Args:
        docs: Iterable de dicts con keys {"filename", "content"}.
        user_message: Mensaje del estudiante.
        max_chars: Presupuesto máximo de caracteres del contexto.

    Returns:
        String con los chunks seleccionados, anotados con su filename.
        Si el mensaje no tiene términos relevantes, retorna los primeros
        chunks de cada documento hasta llenar el presupuesto.
    """
    docs_list = [d for d in docs if d and d.get("content")]
    if not docs_list:
        return "No hay documentos cargados para este chatbot."

    query_terms = _tokens(user_message)

    # Generar todos los chunks anotados con su filename.
    all_chunks: list[tuple[str, str]] = []  # (filename, chunk_text)
    for d in docs_list:
        fname = d.get("filename", "documento")
        for ch in _chunk_text(d.get("content", "")):
            all_chunks.append((fname, ch))

    if not all_chunks:
        return "No hay documentos cargados para este chatbot."

    # Puntuar cada chunk por overlap con la query. Sin términos útiles
    # caemos en orden natural (primeros chunks de cada doc).
    if query_terms:
        scored: list[tuple[int, int, str, str]] = []
        for idx, (fname, ch) in enumerate(all_chunks):
            chunk_terms = _tokens(ch)
            score = len(query_terms & chunk_terms)
            scored.append((score, -idx, fname, ch))  # -idx para estable
        scored.sort(reverse=True)
        ranked = [(fname, ch) for _, _, fname, ch in scored]
    else:
        ranked = all_chunks

    # Llenar el presupuesto respetando max_chars.
    selected: list[tuple[str, str]] = []
    used = 0
    for fname, ch in ranked:
        header = f"--- Documento: {fname} ---\n"
        cost = len(header) + len(ch) + 2  # +2 por el "\n\n" separador
        if used + cost > max_chars:
            # Si no entra ni un fragmento, truncamos el último para que entre algo útil.
            remaining = max_chars - used - len(header) - 2
            if remaining > 200:
                selected.append((fname, ch[:remaining]))
            break
        selected.append((fname, ch))
        used += cost

    if not selected:
        return "No hay documentos cargados para este chatbot."

    return "\n\n".join(f"--- Documento: {fname} ---\n{ch}" for fname, ch in selected)
