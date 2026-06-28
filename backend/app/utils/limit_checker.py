from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from fastapi import HTTPException, status
from typing import Dict, Any, Type

from app.utils import tz

from app.api.internal.admin.models import Tenant, SubscriptionPlan
from app.api.internal.crm.models import Pet, Customer
from app.api.internal.operations.models import CremationOC
from app.api.internal.auth.models import User
from app.api.internal.catalog.models import Service, Product, Plan
from app.api.internal.partners.models import PartnerLinkV2, PartnerLinkStatus

class LimitChecker:
    # Mapeo de recursos a sus modelos y campo de límite en SubscriptionPlan
    # Type: 'monthly' o 'total'
    RESOURCE_CONFIG = {
        "pets": {
            "model": Pet,
            "limit_field": "max_pets",
            "type": "monthly",
            "label": "Mascotas"
        },
        "customers": {
            "model": Customer,
            "limit_field": "max_customers",
            "type": "monthly",
            "label": "Clientes"
        },
        "orders": {
            "model": CremationOC,
            "limit_field": "max_orders",
            "type": "monthly",
            "label": "Órdenes"
        },
        "users": {
            "model": User,
            "limit_field": "max_users",
            "type": "total",
            "label": "Staff/Usuarios"
        },
        "services": {
            "model": Service,
            "limit_field": "max_services",
            "type": "total",
            "label": "Servicios"
        },
        "products": {
            "model": Product,
            "limit_field": "max_products",
            "type": "total",
            "label": "Productos"
        },
        "plans": {
            "model": Plan,
            "limit_field": "max_plans",
            "type": "total",
            "label": "Planes Internos"
        },
        "partners": {
            "model": PartnerLinkV2,
            "limit_field": "max_partners",
            "type": "total",
            "label": "Socios"
        }
    }

    @staticmethod
    def check_limit(db: Session, tenant_id: int, resource_name: str):
        if resource_name not in LimitChecker.RESOURCE_CONFIG:
            return True # O lanzar error si es un recurso no registrado

        config = LimitChecker.RESOURCE_CONFIG[resource_name]

        # Lock advisory por (tenant, recurso) para cerrar la ventana TOCTOU:
        # dos requests concurrentes podían pasar el conteo a la vez y superar
        # el cap del plan. Esta dependencia comparte sesión/transacción con el
        # INSERT del handler (FastAPI cachea get_db por request), así que el
        # lock se libera recién en el commit de la creación, serializando las
        # creaciones del mismo recurso para el mismo tenant.
        resource_idx = list(LimitChecker.RESOURCE_CONFIG.keys()).index(resource_name)
        db.execute(
            text("SELECT pg_advisory_xact_lock(:tid, :rid)"),
            {"tid": tenant_id, "rid": resource_idx},
        )
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

        # Usa el plan efectivo (demo si está vigente, si no el contratado)
        active_plan = tenant.effective_plan if tenant else None
        if not tenant or not active_plan:
            # Plan por defecto (puedes ajustar los valores aquí)
            limit = 5
            plan_name = "FREE (Default)"
        else:
            limit = getattr(active_plan, config["limit_field"], 0)
            plan_name = active_plan.name

        # Plan Ultra / Ilimitado
        if limit == -1 or limit >= 999999:
            return True

        # Calcular uso actual
        usage = 0
        model = config["model"]
        
        query = db.query(func.count(model.id)).filter(model.tenant_id == tenant_id)
        
        if config["type"] == "monthly":
            # Usar hora de Chile (igual que el dashboard /summary) para que el
            # bloqueo coincida exactamente con el uso mensual que se muestra al
            # usuario. Antes usaba datetime.utcnow(), lo que descuadraba el conteo
            # en el cambio de mes respecto al indicador.
            start_of_month = tz.get_now().date().replace(day=1)
            usage = query.filter(model.created_at >= start_of_month).scalar()
        else:
            # Para total, a veces queremos filtrar por 'is_active' si el modelo lo tiene
            if hasattr(model, "is_active"):
                usage = query.filter(model.is_active == True).scalar()
            elif hasattr(model, "status") and model == PartnerLinkV2: # Para PartnerLinkV2
                usage = query.filter(model.status == PartnerLinkStatus.active).scalar()
            elif hasattr(model, "activo"): # Retrocompatibilidad si queda algo
                usage = query.filter(model.activo == True).scalar()
            else:
                usage = query.scalar()

        if usage >= limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "Límite alcanzado",
                    "resource": config["label"],
                    "limit": limit,
                    "usage": usage,
                    "plan": plan_name,
                    "message": f"Has alcanzado el límite de {config['label']} ({limit}) de tu plan {plan_name}. Por favor, mejora tu suscripción."
                }
            )
        
        return True
