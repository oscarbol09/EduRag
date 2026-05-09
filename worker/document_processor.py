import asyncio
import json
import io
from datetime import datetime
from azure.storage.blob import BlobServiceClient
from settings import settings
from azure_cosmos_db import update_document
from vector_store import add_documents
import google.generativeai as genai


async def _download_from_blob(blob_url: str) -> bytes:
    blob_service = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    container_name = settings.AZURE_STORAGE_CONTAINER_NAME
    blob_name = blob_url.split(f"{container_name}/")[-1] if container_name in blob_url else blob_url

    blob_client = blob_service.get_blob_client(container_name, blob_name)
    return blob_client.download_blob().readall()


async def extract_text_from_pdf(blob_url: str) -> str:
    try:
        import fitz
        blob_data = await _download_from_blob(blob_url)
        doc = fitz.open(stream=blob_data, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        raise Exception(f"PDF extraction error: {str(e)}")


async def extract_text_from_docx(blob_url: str) -> str:
    from docx import Document
    blob_data = await _download_from_blob(blob_url)
    doc = Document(io.BytesIO(blob_data))
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text


async def extract_text(blob_url: str, mime_type: str, filename: str) -> str:
    if mime_type == "application/pdf" or filename.endswith(".pdf"):
        return await extract_text_from_pdf(blob_url)
    elif mime_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
    ] or filename.endswith(".docx"):
        return await extract_text_from_docx(blob_url)
    else:
        raise ValueError(f"Unsupported file type: {mime_type}")


def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len
        )
        return splitter.split_text(text)
    except Exception:
        lines = text.split("\n")
        chunks = []
        current = ""
        for line in lines:
            if len(current) + len(line) > chunk_size:
                if current:
                    chunks.append(current)
                current = line
            else:
                current += "\n" + line if current else line
        if current:
            chunks.append(current)
        return chunks


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    embeddings = []

    for text in texts:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        embeddings.append(result["embedding"])

    return embeddings


async def process_document(
    document_id: str,
    chatbot_id: str,
    blob_url: str,
    filename: str,
    mime_type: str
) -> dict:
    await update_document(document_id, {"status": "processing"}, chatbot_id)

    try:
        text = await extract_text(blob_url, mime_type, filename)

        if not text.strip():
            raise Exception("No text extracted from document")

        chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        print(f"Extracted {len(chunks)} chunks from document")

        embeddings = await generate_embeddings(chunks)

        add_documents(
            chatbot_id=chatbot_id,
            chunks=chunks,
            embeddings=embeddings,
            document_id=document_id
        )

        await update_document(
            document_id,
            {
                "status": "indexed",
                "chunk_count": len(chunks),
                "processed_at": datetime.utcnow().isoformat()
            },
            chatbot_id
        )

        return {"document_id": document_id, "chunk_count": len(chunks), "status": "indexed"}

    except Exception as e:
        await update_document(
            document_id,
            {"status": "error", "error_message": str(e)},
            chatbot_id
        )
        raise