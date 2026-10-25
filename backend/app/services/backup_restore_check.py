"""Prueba de restauración de respaldos.

Un respaldo que nunca se restauró no está probado. Una vez al mes (y a pedido
desde Admin → Mantención → Respaldos) se toma el último respaldo subido a R2
(`backups/*.dump`, formato custom de pg_dump), se restaura en una base temporal
`<base>_restore_check`, se cuentan registros clave y se borra la base temporal.
El resultado queda en sys_saas_config.restore_check_* y, si falla, se avisa por
correo al «Correo para recibir mensajes».

Usa pg_restore/psql del sistema (la imagen del backend trae postgresql-client) o,
si no están (desarrollo en Windows), `docker exec` en el contenedor de Postgres
(BACKUP_PG_CONTAINER, igual que create_db_dump).
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time
from datetime import timedelta
from urllib.parse import urlparse


from app import models
from app.utils import tz

logger = logging.getLogger("saas_crematorio.backups")

CHECK_EVERY_DAYS = 30
# Tablas que se cuentan en la base restaurada: muestran que hay datos reales.
COUNT_TABLES = ["sys_tenants", "sys_users", "crm_customers", "crm_pets", "oc_cremations", "sys_subscription_plans"]


def _db_params() -> dict:
    u = urlparse(os.getenv("SQLALCHEMY_DATABASE_URL", ""))
    return {
        "host": u.hostname or "127.0.0.1",
        "port": str(u.port or 5432),
        "db": (u.path or "/").lstrip("/").split("?")[0],
        "user": os.getenv("DB_ADMIN_USER") or u.username,
        "password": os.getenv("DB_ADMIN_PASS") or u.password or "",
    }


def _s3():
    import boto3
    from botocore.config import Config
    account_id = os.getenv("R2_ACCOUNT_ID_BACKUP")
    return boto3.client(
        "s3", endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID_BACKUP"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY_BACKUP"),
        config=Config(signature_version="s3v4"),
    )


def latest_backup_key() -> tuple[str, int] | None:
    """(clave, bytes) del respaldo más reciente en el bucket de respaldos, o None."""
    bucket = os.getenv("R2_BUCKET_BACKUPS")
    if not all([bucket, os.getenv("R2_ACCOUNT_ID_BACKUP"), os.getenv("R2_ACCESS_KEY_ID_BACKUP"), os.getenv("R2_SECRET_ACCESS_KEY_BACKUP")]):
        raise RuntimeError("Faltan las credenciales del bucket de respaldos (R2_*_BACKUP)")
    s3 = _s3()
    newest = None
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix="backups/"):
        for obj in page.get("Contents", []):
            if obj["Key"].endswith(".dump") and (newest is None or obj["LastModified"] > newest["LastModified"]):
                newest = obj
    return (newest["Key"], newest["Size"]) if newest else None


def _psql(p: dict, dbname: str, sql: str) -> str:
    """Ejecuta SQL como administrador y devuelve la salida (sin encabezados)."""
    if shutil.which("psql"):
        cmd = ["psql", "-h", p["host"], "-p", p["port"], "-U", p["user"], "-d", dbname, "-tAc", sql]
        r = subprocess.run(cmd, env={**os.environ, "PGPASSWORD": p["password"]}, capture_output=True, text=True)
    else:
        container = os.getenv("BACKUP_PG_CONTAINER", "postgres_db")
        cmd = ["docker", "exec", "-e", f"PGPASSWORD={p['password']}", container,
               "psql", "-U", p["user"], "-d", dbname, "-tAc", sql]
        r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"psql: {(r.stderr or r.stdout)[:300]}")
    return r.stdout.strip()


def _pg_restore(p: dict, dbname: str, dump_path: str) -> None:
    args = ["--no-owner", "--no-privileges", "--exit-on-error", "-U", p["user"], "-d", dbname]
    if shutil.which("pg_restore"):
        cmd = ["pg_restore", "-h", p["host"], "-p", p["port"], *args, dump_path]
        r = subprocess.run(cmd, env={**os.environ, "PGPASSWORD": p["password"]}, capture_output=True, text=True)
    else:
        container = os.getenv("BACKUP_PG_CONTAINER", "postgres_db")
        with open(dump_path, "rb") as fh:
            r = subprocess.run(["docker", "exec", "-i", "-e", f"PGPASSWORD={p['password']}", container, "pg_restore", *args],
                               stdin=fh, capture_output=True)
        r.stderr = (r.stderr or b"").decode("utf-8", "replace")
    if r.returncode != 0:
        raise RuntimeError(f"pg_restore falló: {(r.stderr or '')[:400]}")


def restore_and_count(dump_path: str) -> dict:
    """Restaura el dump en una base temporal, cuenta registros y la borra."""
    p = _db_params()
    check_db = f"{p['db']}_restore_check"
    started = time.monotonic()
    _psql(p, "postgres", f'DROP DATABASE IF EXISTS "{check_db}"')
    _psql(p, "postgres", f'CREATE DATABASE "{check_db}"')
    try:
        _pg_restore(p, check_db, dump_path)
        counts = {}
        for table in COUNT_TABLES:
            counts[table] = int(_psql(p, check_db, f"SELECT count(*) FROM {table}") or 0)
        alembic = _psql(p, check_db, "SELECT version_num FROM alembic_version LIMIT 1")
    finally:
        try:
            _psql(p, "postgres", f'DROP DATABASE IF EXISTS "{check_db}"')
        except Exception:  # noqa: BLE001
            logger.exception("No se pudo borrar la base temporal %s", check_db)
    if counts.get("sys_tenants", 0) == 0 or counts.get("sys_users", 0) == 0:
        raise RuntimeError(f"La base restaurada no tiene crematorios o usuarios: {counts}")
    return {"counts": counts, "alembic": alembic, "seconds": round(time.monotonic() - started, 1)}


def _save(status: str, detail: dict | None) -> None:
    from app.core.tenant_context import apply_bypass_rls
    from app.database import SessionLocal

    s = SessionLocal()
    try:
        apply_bypass_rls(s)  # sys_saas_config solo se escribe con bypass
        cfg = s.query(models.SaaSConfig).first()
        if cfg:
            cfg.restore_check_status = status[:255]
            cfg.restore_check_detail = detail
            if status != "in_progress":
                cfg.restore_check_at = tz.get_now()
            s.commit()
    finally:
        s.close()


def _alert_failure(error: str) -> None:
    import asyncio
    from app.services.email import send_action_email, notification_recipients
    try:
        asyncio.run(send_action_email(
            notification_recipients(), "La prueba de restauración del respaldo falló", "Respaldo sin verificar",
            ["La prueba mensual intentó restaurar el último respaldo en una base temporal y no lo logró:", error,
             "Revisa Admin → Mantención → Respaldos. Hasta resolverlo, no hay certeza de poder recuperar los datos."],
            kicker="Respaldos",
        ))
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo enviar el aviso de restauración fallida")


def run_restore_check(dump_path: str | None = None) -> dict:
    """Prueba completa. Con `dump_path` usa ese archivo en vez de bajar el último de R2."""
    _save("in_progress", None)
    tmpdir = None
    try:
        if dump_path:
            source, size = os.path.basename(dump_path), os.path.getsize(dump_path)
        else:
            found = latest_backup_key()
            if not found:
                raise RuntimeError("No hay respaldos en el bucket (backups/*.dump)")
            source, size = found
            tmpdir = tempfile.mkdtemp(prefix="restore_check_")
            dump_path = os.path.join(tmpdir, "backup.dump")
            _s3().download_file(os.getenv("R2_BUCKET_BACKUPS"), source, dump_path)
        result = restore_and_count(dump_path)
        detail = {"backup": source, "size_mb": round(size / 1_048_576, 2), **result}
        _save("success", detail)
        logger.info("Prueba de restauración OK: %s", detail)
        return {"status": "success", **detail}
    except Exception as e:  # noqa: BLE001
        error = str(e)[:240]
        _save(f"error: {error}", None)
        logger.error("Prueba de restauración falló: %s", error)
        _alert_failure(error)
        return {"status": "error", "error": error}
    finally:
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)


def restore_check_due(config) -> bool:
    """¿Toca la prueba mensual? (solo con respaldos automáticos activos)."""
    if not config or not config.backup_enabled:
        return False
    if config.restore_check_status == "in_progress":
        return False
    last = config.restore_check_at
    return last is None or tz.get_now() - last >= timedelta(days=CHECK_EVERY_DAYS)

