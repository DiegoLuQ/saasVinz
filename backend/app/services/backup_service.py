import os
import subprocess
import boto3
from datetime import datetime
from botocore.config import Config
from app.utils import tz
from sqlalchemy.orm import Session
from app import models

def upload_to_r2(file_path: str, object_name: str) -> bool:
    """Uploads a file to Cloudflare R2 backup bucket."""
    bucket = os.getenv("R2_BUCKET_BACKUPS")
    account_id = os.getenv("R2_ACCOUNT_ID_BACKUP")
    access_key = os.getenv("R2_ACCESS_KEY_ID_BACKUP")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY_BACKUP")
    
    if not all([bucket, account_id, access_key, secret_key]):
        print("Error: R2 Backup credentials missing in .env")
        return False

    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    
    try:
        s3 = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version='s3v4')
        )
        s3.upload_file(file_path, bucket, object_name)
        return True
    except Exception as e:
        print(f"Error uploading to R2: {e}")
        return False

def create_db_dump(dest_dir: str = "app/static") -> str:
    """Genera un dump .sql de la BD y devuelve la ruta del archivo local.

    A diferencia de run_db_backup, NO sube a R2 ni borra el archivo: está pensado
    para descarga directa (on-demand). El llamador es responsable de eliminar el
    archivo cuando termine de enviarlo. Lanza Exception si el dump falla.
    """
    from urllib.parse import urlparse

    db_url = os.getenv("SQLALCHEMY_DATABASE_URL")
    if not db_url:
        raise Exception("SQLALCHEMY_DATABASE_URL no configurada")

    u = urlparse(db_url)
    host = u.hostname or "127.0.0.1"
    port = str(u.port or 5432)
    db_name = (u.path or "/").lstrip("/").split("?")[0]

    # IMPORTANTE: usar el usuario administrador (superusuario / BYPASSRLS). El
    # usuario de la app está sujeto a Row-Level Security y pg_dump fallaría con
    # "query would be affected by row-level security policy". Caemos al usuario
    # de la URL solo si no hay credenciales admin configuradas.
    user = os.getenv("DB_ADMIN_USER") or u.username
    password = os.getenv("DB_ADMIN_PASS") or u.password or ""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Formato custom de PostgreSQL (-Fc): comprimido y restaurable con pg_restore
    # (soporta --clean --if-exists y la herramienta "Restore" de pgAdmin). Evita el
    # problema de los meta-comandos \restrict del SQL plano al restaurar por GUI.
    filename = f"backup_{db_name}_{timestamp}.dump"
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, filename)

    import shutil
    pg_dump_path = shutil.which("pg_dump")

    if pg_dump_path:
        env = {**os.environ, "PGPASSWORD": password}
        command = [pg_dump_path, "-h", host, "-p", port, "-U", user, "-d", db_name, "-Fc", "-f", file_path]
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise Exception(f"pg_dump falló: {(result.stderr or '')[:300]}")
    else:
        # Fallback: ejecutar pg_dump dentro del contenedor de Postgres.
        # -Fc produce salida BINARIA por stdout: el archivo se abre en modo binario.
        container = os.getenv("BACKUP_PG_CONTAINER", "postgres_db")
        with open(file_path, "wb") as outfile:
            command = ["docker", "exec", "-e", f"PGPASSWORD={password}", container,
                       "pg_dump", "-U", user, "-Fc", db_name]
            result = subprocess.run(command, stdout=outfile, stderr=subprocess.PIPE)
        if result.returncode != 0:
            err = (result.stderr or b"").decode("utf-8", "replace")[:300]
            if os.path.exists(file_path):
                os.remove(file_path)
            raise Exception(f"docker pg_dump falló: {err}")

    return file_path


def run_db_backup(db: Session = None):
    """Genera un dump de la BD (formato custom) y lo sube a Cloudflare R2.

    Reutiliza create_db_dump (que usa el usuario admin para evitar RLS).

    IMPORTANTE: esta función corre como BackgroundTask, después de que el request
    HTTP terminó. Por eso abre SIEMPRE su propia sesión de BD: la sesión del
    request ya estaría cerrada y los commits de estado no persistirían (eso dejaba
    el estado atascado en 'in_progress'). El parámetro `db` se ignora.
    """
    from app.database import SessionLocal

    def _set_status(status: str, set_time: bool = False):
        session = SessionLocal()
        try:
            config = session.query(models.SaaSConfig).first()
            if config:
                if set_time:
                    config.last_backup_at = tz.get_now()
                config.last_backup_status = status
                session.commit()
        except Exception as e:
            print(f"No se pudo actualizar el estado del respaldo: {e}")
        finally:
            session.close()

    try:
        file_path = create_db_dump()
    except Exception as e:
        print(f"Backup service exception: {e}")
        _set_status(f"error: {str(e)[:200]}")
        return

    filename = os.path.basename(file_path)
    try:
        print(f"Uploading backup: {filename}")
        success = upload_to_r2(file_path, f"backups/{filename}")
        _set_status("success" if success else "error: R2 upload failed", set_time=success)
        print(f"Backup completed: {'success' if success else 'failed'}")
    finally:
        # Limpiar el archivo local pase lo que pase
        if os.path.exists(file_path):
            os.remove(file_path)
