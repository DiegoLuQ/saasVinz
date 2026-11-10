import mimetypes
import os
import boto3
from botocore.config import Config
from app.core.config import settings

MIME_OVERRIDES = {
    ".webp": "image/webp",
    ".m4a": "audio/mp4",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
}

DEFAULT_CACHE_CONTROL = "public, max-age=31536000, immutable"


def guess_content_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext in MIME_OVERRIDES:
        return MIME_OVERRIDES[ext]
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )


def upload_file_to_r2(
    local_path: str,
    bucket_name: str,
    object_name: str,
    content_type: str | None = None,
    cache_control: str | None = DEFAULT_CACHE_CONTROL
):
    """
    Subir un archivo local a R2 con cabeceras Content-Type y Cache-Control.
    Por defecto aplica 'public, max-age=31536000, immutable' para que los navegadores
    almacenen en caché los archivos inmutables y no consuman lecturas Clase B en R2.
    """
    s3 = get_r2_client()
    try:
        extra_args: dict = {}
        ct = content_type or guess_content_type(local_path)
        if ct:
            extra_args["ContentType"] = ct
        if cache_control:
            extra_args["CacheControl"] = cache_control

        kwargs = {"ExtraArgs": extra_args} if extra_args else {}
        s3.upload_file(local_path, bucket_name, object_name, **kwargs)
        return f"{settings.R2_PUBLIC_URL}/{object_name}"
    except Exception as e:
        print(f"Error uploading to R2: {e}")
        return None


def update_r2_object_cache_control(
    bucket_name: str,
    object_name: str,
    cache_control: str = DEFAULT_CACHE_CONTROL,
    content_type: str | None = None
) -> bool:
    """
    Actualiza los metadatos (Cache-Control y Content-Type) de un objeto ya existente en R2
    mediante una copia sobre sí mismo con MetadataDirective='REPLACE'.
    """
    s3 = get_r2_client()
    try:
        ct = content_type or guess_content_type(object_name)
        s3.copy_object(
            Bucket=bucket_name,
            Key=object_name,
            CopySource={"Bucket": bucket_name, "Key": object_name},
            MetadataDirective="REPLACE",
            ContentType=ct,
            CacheControl=cache_control
        )
        return True
    except Exception as e:
        print(f"Error updating cache headers on R2 for {object_name}: {e}")
        return False

def delete_file_from_r2(bucket_name: str, object_name: str):
    """
    Eliminar un archivo de R2.
    """
    s3 = get_r2_client()
    try:
        s3.delete_object(Bucket=bucket_name, Key=object_name)
        return True
    except Exception as e:
        print(f"Error deleting from R2: {e}")
        return False
def normalize_image_url(url: str) -> str:
    """Asegura que la URL sea absoluta si usa R2 o limpia prefijos antiguos."""
    if not url: return url
    if url.startswith("http"): return url
    
    # Limpiar prefijos internos que puedan haber quedado en DB
    clean_url = url.replace("\\", "/").lstrip("/")
    prefixes_to_strip = ["app/static/storage/", "static/storage/", "app/static/", "static/", "storage/"]
    for prefix in prefixes_to_strip:
        if clean_url.startswith(prefix):
            clean_url = clean_url[len(prefix):]
            break
            
    if settings.USE_R2 and settings.R2_PUBLIC_URL:
        # Asegurar que el dominio R2 no tenga slash final y el recurso no tenga slash inicial
        domain = settings.R2_PUBLIC_URL.rstrip("/")
        clean_url = clean_url.lstrip("/")
        return f"{domain}/{clean_url}"
        
    return url
