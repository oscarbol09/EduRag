"""
Document uploader — handles file uploads to Supabase Storage and
text extraction from Markdown and plain-text files.
"""

from supabase_db import get_client


async def upload_file_to_blob(content: bytes, blob_path: str, content_type: str) -> str:
    client = get_client()
    bucket = "documents"

    # Ensure bucket exists (create if missing)
    try:
        client.storage.get_bucket(bucket)
    except Exception:
        # Create a private bucket
        client.storage.create_bucket(bucket, options={"public": False})

    # Upload file
    client.storage.from_(bucket).upload(
        path=blob_path,
        file=content,
        file_options={"content-type": content_type, "upsert": "true"},
    )

    # Return public URL or direct reference
    # Supabase public bucket has a public URL, but since it is private, get_public_url works if it's permitted,
    # or we can construct/use the storage API URL. Let's return the public URL representation.
    return client.storage.from_(bucket).get_public_url(blob_path)


def download_from_blob(blob_path: str) -> bytes:
    client = get_client()
    bucket = "documents"
    # Extract path inside bucket
    return client.storage.from_(bucket).download(blob_path)


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
