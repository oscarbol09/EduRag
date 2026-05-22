"""
Document uploader — handles file uploads to Azure Blob Storage and
text extraction from Markdown and plain-text files.
"""

import json
from azure.storage.blob import BlobServiceClient, ContentSettings
from azure.storage.queue import QueueClient
from settings import settings


async def upload_file_to_blob(content: bytes, blob_path: str, content_type: str) -> str:
    blob_service = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
    container_client = blob_service.get_container_client(settings.AZURE_STORAGE_CONTAINER_NAME)

    # Ensure the container exists (create if missing)
    try:
        container_client.get_container_properties()
    except Exception:
        container_client.create_container()

    blob_client = container_client.get_blob_client(blob_path)

    blob_client.upload_blob(
        content,
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
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
    Supports: Markdown (.md) and plain text (.txt).
    """
    lower_name = filename.lower()

    if lower_name.endswith((".md", ".txt")) or content_type in ("text/markdown", "text/plain"):
        return content.decode("utf-8", errors="replace")

    # Fallback: try as UTF-8 text anyway
    return content.decode("utf-8", errors="replace")
