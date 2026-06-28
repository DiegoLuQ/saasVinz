import boto3
import os
from botocore.config import Config
from app.core.config import settings

def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )

def upload_file_to_r2(local_path: str, bucket_name: str, object_name: str):
    """
    Subir un archivo local a R2.
    """
    s3 = get_r2_client()
    try:
        s3.upload_file(local_path, bucket_name, object_name)
        return f"{settings.R2_PUBLIC_URL}/{object_name}"
    except Exception as e:
        print(f"Error uploading to R2: {e}")
        return None

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
