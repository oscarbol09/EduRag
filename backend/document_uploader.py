"""
Document uploader — handles file uploads to Azure Blob Storage and
text extraction from PDF, DOCX, Markdown, and plain-text files.
"""

import json
from azure.storage.blob import BlobServiceClient
from azure.storage.queue import QueueClient
from settings import settings


async def upload_file_to_blob(content: bytes, blob_path: str, content_type: str) -> str:
    blob_service = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    container_client = blob_service.get_container_client(settings.AZURE_STORAGE_CONTAINER_NAME)
    blob_client = container_client.get_blob_client(blob_path)
    
    blob_client.upload_blob(
        content,
        overwrite=True,
        content_settings=type("ContentSettings", (), {"content_type": content_type})()
    )
    
    return f"{container_client.url}/{blob_path}"


def publish_to_queue(message: dict):
    queue_client = QueueClient.from_connection_string(
        settings.AZURE_QUEUE_CONNECTION_STRING,
        settings.AZURE_QUEUE_NAME
    )
    queue_client.send_message(json.dumps(message))
    print(f"Published to queue: {message.get('document_id')}")


def download_from_blob(blob_path: str) -> bytes:
    blob_service = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    container_name = settings.AZURE_STORAGE_CONTAINER_NAME
    blob_name = blob_path.split(f"{container_name}/")[-1] if container_name in blob_path else blob_path
    
    blob_client = blob_service.get_blob_client(container_name, blob_name)
    return blob_client.download_blob().readall()


def extract_text_from_file(content: bytes, filename: str, content_type: str | None) -> str:
    """
    Extract plain text from uploaded files.
    Supports: PDF, DOCX, Markdown (.md), plain text (.txt).
    """
    lower_name = filename.lower()

    # Markdown or plain text
    if lower_name.endswith((".md", ".txt")) or content_type in ("text/markdown", "text/plain"):
        return content.decode("utf-8", errors="replace")

    # PDF
    if lower_name.endswith(".pdf") or content_type == "application/pdf":
        return _extract_pdf(content)

    # DOCX
    if lower_name.endswith(".docx") or content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return _extract_docx(content)

    # Fallback: try as text
    return content.decode("utf-8", errors="replace")


def _extract_pdf(content: bytes) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    import fitz  # PyMuPDF
    import io

    text_parts = []
    with fitz.open(stream=io.BytesIO(content), filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n\n".join(text_parts)


def _extract_docx(content: bytes) -> str:
    """Extract text from a DOCX file using python-docx."""
    from docx import Document
    import io

    doc = Document(io.BytesIO(content))
    return "\n\n".join(para.text for para in doc.paragraphs if para.text.strip())
