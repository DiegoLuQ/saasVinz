"""
Validación de subidas de archivos (Fase 3.2 del Plan de Remediación, M-3).

No confiar en `file.content_type` ni en `file.filename` del cliente (ambos son
trivialmente falsificables). Se valida por *magic bytes* del contenido real,
con límite de tamaño y de cantidad de archivos.
"""
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile, status

# Límite de tamaño por imagen (8 MB) y cantidad máxima de archivos por solicitud.
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_FILES_PER_SUBMISSION = 8


def detect_image_type(content: bytes) -> Optional[str]:
    """
    Devuelve la extensión (sin punto) según los magic bytes, o None si el
    contenido no corresponde a un formato de imagen permitido.
    """
    if len(content) < 12:
        return None
    if content[:3] == b"\xff\xd8\xff":
        return "jpg"
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if content[:4] in (b"GIF8",):
        return "gif"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


async def read_and_validate_image(
    file: UploadFile, max_bytes: int = MAX_IMAGE_BYTES
) -> Tuple[bytes, str]:
    """
    Lee el archivo completo y valida tamaño + tipo real (magic bytes).
    Retorna (contenido, extensión_segura). Lanza HTTPException si es inválido.
    """
    content = await file.read()
    size = len(content)
    if size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Archivo vacío.")
    if size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo supera el tamaño máximo de {max_bytes // (1024 * 1024)} MB.",
        )
    ext = detect_image_type(content)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es una imagen válida (JPG, PNG, GIF o WEBP).",
        )
    return content, ext


def enforce_max_files(files, max_files: int = MAX_FILES_PER_SUBMISSION) -> None:
    """Rechaza si se exceden los archivos permitidos por solicitud."""
    if files and len(files) > max_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Demasiados archivos. Máximo permitido: {max_files}.",
        )
