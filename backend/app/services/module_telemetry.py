"""
Servicio de telemetría agregada de uso de módulos del Sidebar.

Principios:
1. Zero Bloat: 1 sola fila diaria por (tenant, módulo, fecha) mediante UPSERT.
2. Zero PII: No almacena usuario, IP, dispositivo ni información personal.
3. Zero Friction: Si module_tracking_enabled es False, ignora el lote en 0ms.
"""
from datetime import timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from sqlalchemy.dialects.postgresql import insert

from app import models
from app.utils import tz

MODULE_LABELS: Dict[str, str] = {
    "dashboard": "Dashboard",
    "ordenes": "Recepción y Pedidos",
    "clientes": "Clientes",
    "mascotas": "Mascotas",
    "convenios": "Convenios",
    "servicios": "Catálogo de Servicios",
    "solicitudes-productos": "Solicitudes de productos",
    "inventario": "Inventario",
    "certificados": "Documentos y Certificados",
    "configuracion": "Configuración",
    "rutas": "Rutas y Traslados",
    "pagos": "Pagos",
    "indicadores": "Indicadores",
    "marketing": "Marketing",
    "memorials": "Memoriales",
}


def is_tracking_enabled(db: Session) -> bool:
    """Verifica si la telemetría global está activada por SuperAdmin."""
    row = db.query(models.SaaSConfig.module_tracking_enabled).first()
    return bool(row[0]) if row and row[0] is not None else False


def record_batch_clicks(
    db: Session,
    tenant_id: int,
    batch: List[Dict[str, Any]]
) -> bool:
    """
    Registra un lote de clics agregados para un tenant.
    Realiza UPSERT atómico en sys_module_clicks_daily.
    """
    if not is_tracking_enabled(db):
        return False

    if not tenant_id or not batch:
        return False

    today = tz.get_now().date()
    now = tz.get_now()

    # Consolidar en memoria por si el lote contiene varias veces la misma clave
    consolidated: Dict[str, int] = {}
    for item in batch:
        raw_key = str(item.get("module_key") or "").strip().lower()
        if not raw_key:
            continue
        # Limitar longitud de clave por seguridad
        key = raw_key[:50]
        try:
            count = max(1, int(item.get("count", 1)))
        except (ValueError, TypeError):
            count = 1
        consolidated[key] = consolidated.get(key, 0) + count

    if not consolidated:
        return False

    # UPSERT para cada módulo en el lote
    for module_key, count in consolidated.items():
        stmt = insert(models.ModuleClickDaily).values(
            tenant_id=tenant_id,
            module_key=module_key,
            date=today,
            click_count=count,
            updated_at=now,
        ).on_conflict_do_update(
            index_elements=["tenant_id", "module_key", "date"],
            set_={
                "click_count": models.ModuleClickDaily.click_count + count,
                "updated_at": now,
            }
        )
        db.execute(stmt)

    db.commit()
    return True


def get_stats(
    db: Session,
    days: int = 30,
    tenant_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Obtiene métricas agregadas de uso de módulos para SuperAdmin.
    """
    enabled = is_tracking_enabled(db)
    safe_days = max(1, min(days, 365))
    since_date = tz.get_now().date() - timedelta(days=safe_days)

    query = db.query(
        models.ModuleClickDaily.module_key,
        func.sum(models.ModuleClickDaily.click_count).label("total_clicks")
    ).filter(models.ModuleClickDaily.date >= since_date)

    if tenant_id:
        query = query.filter(models.ModuleClickDaily.tenant_id == tenant_id)

    results = query.group_by(models.ModuleClickDaily.module_key).order_by(desc("total_clicks")).all()

    total_clicks = sum(int(r[1] or 0) for r in results)

    modules_stats = []
    for r in results:
        key = r[0]
        clicks = int(r[1] or 0)
        pct = round((clicks / total_clicks * 100), 1) if total_clicks > 0 else 0.0
        modules_stats.append({
            "module_key": key,
            "label": MODULE_LABELS.get(key, key.replace("-", " ").title()),
            "total_clicks": clicks,
            "percentage": pct
        })

    # Línea de tiempo diaria (últimos N días)
    timeline_q = db.query(
        models.ModuleClickDaily.date,
        func.sum(models.ModuleClickDaily.click_count).label("daily_total")
    ).filter(models.ModuleClickDaily.date >= since_date)

    if tenant_id:
        timeline_q = timeline_q.filter(models.ModuleClickDaily.tenant_id == tenant_id)

    timeline_res = timeline_q.group_by(models.ModuleClickDaily.date).order_by(models.ModuleClickDaily.date).all()
    timeline = [
        {"date": str(row[0]), "total": int(row[1] or 0)}
        for row in timeline_res
    ]

    return {
        "is_enabled": enabled,
        "days": safe_days,
        "total_clicks": total_clicks,
        "tenant_id": tenant_id,
        "modules": modules_stats,
        "timeline": timeline,
    }
