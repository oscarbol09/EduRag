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
    Supports: Markdown (.md), plain text (.txt), PDF (.pdf), and Word (.docx).
    """
    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            text = []
            for page in doc:
                t = page.get_text()
                if t:
                    text.append(t)
            return "\n".join(text)
        except Exception as e:
            raise ValueError(f"Error al extraer texto del PDF: {str(e)}")

    elif lower_name.endswith(".docx"):
        try:
            import docx
            import io
            doc = docx.Document(io.BytesIO(content))
            text = []
            
            # Extraer texto de párrafos
            for p in doc.paragraphs:
                if p.text:
                    text.append(p.text)
            
            # Extraer texto de tablas
            for table in doc.tables:
                for row in table.rows:
                    row_text = []
                    seen_cells = set()
                    for cell in row.cells:
                        if cell not in seen_cells:
                            seen_cells.add(cell)
                            val = cell.text.strip()
                            if val:
                                row_text.append(val)
                    if row_text:
                        text.append(" | ".join(row_text))
                        
            return "\n".join(text)
        except Exception as e:
            raise ValueError(f"Error al extraer texto del archivo DOCX: {str(e)}")

    elif lower_name.endswith((".md", ".txt")) or (content_type and content_type in ("text/markdown", "text/plain")):
        return content.decode("utf-8", errors="replace")

    # Fallback: try as UTF-8 text anyway
    return content.decode("utf-8", errors="replace")
