"""
Backend FastAPI - SaaS Crematorio
Arquitectura modular v1
# Force reload - 2026-02-05 16:50
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.audit_middleware import AuditMiddleware
from datetime import datetime, timedelta
from fastapi import BackgroundTasks

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter
import logging

# Configurar logging (Fase: Estabilización de Logs)
# RotatingFileHandler: los logs de acceso/errores no pueden crecer sin límite
# dentro del contenedor (10 MB x 5 archivos por réplica).
from logging.handlers import RotatingFileHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        RotatingFileHandler("backend_access.log", maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"),
    ]
)
logger = logging.getLogger("saas_crematorio")

# Logger dedicado para tracebacks de errores 500 (antes: open() síncrono por error).
error_logger = logging.getLogger("saas_crematorio.errors")
_error_handler = RotatingFileHandler("error_debug.log", maxBytes=10 * 1024 * 1024, backupCount=3, encoding="utf-8")
_error_handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
error_logger.addHandler(_error_handler)
error_logger.setLevel(logging.ERROR)

from app.core.config import settings as app_settings

app = FastAPI(
    title="SaaS Crematorio API",
    version="1.0.0",
    description="API para gestión de crematorios",
    redirect_slashes=False,  # Prevent 307 redirects that trigger adblockers
    # En producción no se expone la documentación del API interno.
    docs_url=None if app_settings.IS_PRODUCTION else "/docs",
    redoc_url=None if app_settings.IS_PRODUCTION else "/redoc",
    openapi_url=None if app_settings.IS_PRODUCTION else "/openapi.json",
)

# Registrar el Limiter en la app (Fase 31: Rate Limiting)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(AuditMiddleware)

# Global Rate Limit Middleware (Fase 31)
from app.middleware.global_rate_limit import GlobalRateLimitMiddleware
app.add_middleware(GlobalRateLimitMiddleware)

class ErrorLoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        try:
            await self.app(scope, receive, send)
        except Exception as e:
            import uuid
            correlation_id = uuid.uuid4().hex[:12]
            error_logger.exception(
                f"[cid={correlation_id}] ERROR on {scope['method']} {scope['path']}"
            )

            response = JSONResponse(
                status_code=500,
                content={
                    "detail": "Ocurrió un error interno. Si persiste, contacta a soporte.",
                    "correlation_id": correlation_id,
                }
            )
            await response(scope, receive, send)

app.add_middleware(ErrorLoggingMiddleware)


# Backups automáticos: tarea de fondo con advisory lock (una sola réplica
# ejecuta el backup). Reemplaza al antiguo BackupSchedulerMiddleware, que
# dependía del tráfico HTTP y tenía una race entre réplicas.
@app.on_event("startup")
async def _start_backup_scheduler():
    import asyncio
    from app.services.backup_scheduler import backup_scheduler_loop
    asyncio.create_task(backup_scheduler_loop())

# Startup tasks removed. DDL migrations are handled by deployment scripts.

# CORS Configuration - DEBE IR AL FINAL para que se ejecute PRIMERO en el request
# Orígenes configurables por entorno vía CORS_ORIGINS (separados por coma);
# sin la variable se usan los defaults de app/core/config.py.
from app.core.config import settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Solo lo que el frontend realmente lee (descarga de backups).
    expose_headers=["Content-Disposition"],
)


# Static Files
# Static Files - Use absolute paths
# Reloading backend to apply model standardizations
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
storage_dir = os.path.join(BASE_DIR, "static", "storage")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/storage", StaticFiles(directory=storage_dir), name="storage")

# ===== API v1 - Internal Endpoints =====

# Auth Module
from app.api.internal.auth.router import router as auth_router
app.include_router(auth_router, prefix="/api/internal/auth", tags=["Autenticación"])

# CRM Module
from app.api.internal.crm.customers.router import router as customers_router
from app.api.internal.crm.pets.router import router as pets_router
app.include_router(customers_router, prefix="/api/internal/customers", tags=["CRM - Clientes"])
app.include_router(pets_router, prefix="/api/internal/pets", tags=["CRM - Mascotas"])

# Operations Module
from app.api.internal.operations.cremations.router import router as cremations_router
from app.api.internal.operations.documents.router import router as documents_router
from app.api.internal.operations.operations.router import router as operations_router
app.include_router(cremations_router, prefix="/api/internal/cremations", tags=["Operaciones - Cremaciones"])
app.include_router(documents_router, prefix="/api/internal/ops-records", tags=["Operaciones - Documentos"])
app.include_router(operations_router, prefix="/api/internal/operations", tags=["Operaciones"])

# Catalog Module
from app.api.internal.catalog.services.router import router as services_router
from app.api.internal.catalog.plans.router import router as plans_router
from app.api.internal.catalog.products.router import router as products_router
app.include_router(services_router, prefix="/api/internal/services", tags=["Catálogo - Servicios"])
app.include_router(plans_router, prefix="/api/internal/plans", tags=["Catálogo - Planes"])

# Memorials Module
from app.api.internal.memorials.router import router as memorials_router
app.include_router(memorials_router, prefix="/api/internal/memorials", tags=["Memoriales"])

# Payments Module
from app.api.internal.payments.router import router as payments_router
app.include_router(payments_router, prefix="/api/internal/payments", tags=["Pagos"])

app.include_router(products_router, prefix="/api/internal/products", tags=["Catálogo - Productos"])

# Admin Module
from app.api.internal.admin.tenants.router import router as tenants_router
from app.api.internal.admin.rbac.router import router as rbac_router
from app.api.internal.admin.roles.router import router as roles_router
from app.api.internal.admin.audit.router import router as audit_router
from app.api.internal.admin.maintenance.router import router as maintenance_router
from app.api.internal.admin.billing.router import router as billing_router # New
app.include_router(tenants_router, prefix="/api/internal/tenants", tags=["Admin - Tenants"])
app.include_router(rbac_router, prefix="/api/internal/rbac", tags=["Admin - RBAC"])
app.include_router(roles_router, prefix="/api/internal/admin/roles", tags=["Admin - Roles"])
app.include_router(audit_router, prefix="/api/internal/audit-logs", tags=["Admin - Auditoría"])
app.include_router(maintenance_router, prefix="/api/internal/maintenance", tags=["Admin - Mantenimiento"])
app.include_router(billing_router, prefix="/api/internal/billing", tags=["Admin - Facturación"]) # New


# Creator Module (SuperAdmin)
from app.api.internal.creator.dashboard.router import router as creator_dashboard_router
from app.api.internal.creator.announcements.router import router as creator_announcements_router
from app.api.internal.creator.plans.router import router as creator_plans_router
from app.api.internal.creator.subscriptions.router import router as creator_subscriptions_router
from app.api.internal.creator.notifications.router import router as creator_notifications_router
from app.api.internal.creator.config.router import router as creator_config_router
from app.api.internal.creator.templates.router import router as creator_templates_router
from app.api.internal.creator.receipts.router import router as creator_receipts_router
from app.api.internal.creator.farewell.router import router as creator_farewell_router
from app.api.internal.admin.image_templates.router import router as creator_image_templates_router
app.include_router(creator_dashboard_router, prefix="/api/internal/creator", tags=["Creator - Dashboard"])
app.include_router(creator_announcements_router, prefix="/api/internal/creator/announcements", tags=["Creator - Anuncios"])
app.include_router(creator_plans_router, prefix="/api/internal/creator/subscription-plans", tags=["Creator - Planes"])
app.include_router(creator_subscriptions_router, prefix="/api/internal/creator", tags=["Creator - Subscriptions"])
app.include_router(creator_notifications_router, prefix="/api/internal/creator/notifications", tags=["Creator - Notificaciones"])
app.include_router(creator_config_router, prefix="/api/internal/creator/config", tags=["Creator - Configuración Global"])
app.include_router(creator_templates_router, prefix="/api/internal/creator/document-templates", tags=["Creator - Plantillas de Documentos"])
app.include_router(creator_receipts_router, prefix="/api/internal/creator", tags=["Creator - Recibos"])
app.include_router(creator_farewell_router, prefix="/api/internal/creator/farewell-templates", tags=["Creator - Plantillas de Despedida"])
app.include_router(creator_image_templates_router, prefix="/api/internal/creator/image-templates", tags=["Creator - Plantillas de Imagen"])

from app.api.internal.creator.veterinaries.router import router as creator_vets_router
app.include_router(creator_vets_router)

from app.api.internal.creator.memorials.router import router as creator_memorials_router
app.include_router(creator_memorials_router, prefix="/api/internal/creator/memorials", tags=["Creator - Memorials"])

# Common Module

from app.api.internal.common.notifications.router import router as notifications_router
from app.api.internal.common.uploads.router import router as uploads_router
from app.api.internal.common.theme.router import router as theme_router
from app.api.internal.common.dashboard.router import router as dashboard_router
from app.api.internal.common.submissions.router import router as internal_submissions_router
from app.api.internal.common.onboarding.router import router as onboarding_router
from app.api.internal.common.landing.router import router as landing_router
from app.api.internal.common.farewell.router import router as farewell_router
from app.api.internal.common.form_tokens.router import router as form_tokens_router
from app.api.internal.common.health.router import router as health_router
from app.api.internal.common.media_router import router as media_router

app.include_router(notifications_router, prefix="/api/internal/notifications", tags=["Notificaciones"])
app.include_router(uploads_router, prefix="/api/internal/upload", tags=["Uploads"])
app.include_router(theme_router, prefix="/api/internal/theme", tags=["Tema"])
app.include_router(dashboard_router, prefix="/api/internal/dashboard", tags=["Dashboard"])
app.include_router(internal_submissions_router, prefix="/api/internal/submissions", tags=["Formularios Internos"])
app.include_router(onboarding_router, prefix="/api/internal/onboarding", tags=["Onboarding"])

app.include_router(landing_router, prefix="/api/internal/landing", tags=["Landing Config"])
app.include_router(farewell_router, prefix="/api/internal/farewell-templates", tags=["Plantillas Despedida"])
app.include_router(form_tokens_router, prefix="/api/internal/form-tokens", tags=["Form Tokens"])
app.include_router(health_router, prefix="/api/internal", tags=["Health"])
app.include_router(media_router, prefix="/api/internal", tags=["Biblioteca de Medios"])

# Announcements Module
from app.api.internal.common.announcements.router import router as announcements_router
app.include_router(announcements_router, prefix="/api/internal/announcements", tags=["Anuncios"])

# Partners Module (Veterinarios)
from app.api.internal.partners.router import router as partners_router
app.include_router(partners_router)

# Integrations Module (Widget embebible / API keys públicas) — gestionado por SuperAdmin
from app.api.internal.creator.widgets.router import router as creator_widgets_router
app.include_router(creator_widgets_router, prefix="/api/internal/creator/widgets", tags=["Creator - Widgets"])

# ===== API v1 - Public Endpoints =====

from app.api.public.forms.router import router as public_forms_router
from app.api.public.tenants.router import router as public_tenants_router
from app.api.public.qr.router import router as qr_router
from app.api.public.partners.router import router as public_partners_router
from app.api.public.contact.router import router as public_contact_router
app.include_router(public_forms_router, prefix="/api/public", tags=["Público - Formularios"])
app.include_router(public_tenants_router, prefix="/api/public", tags=["Público - Tenants"])
app.include_router(qr_router, prefix="/api/public", tags=["Público - QR"])
app.include_router(public_partners_router, prefix="/api/public", tags=["Público - Partners"])
app.include_router(landing_router, prefix="/api/public", tags=["Público - Landing"])
app.include_router(public_contact_router, prefix="/api/public", tags=["Público - Contacto"])

from app.api.public.widget.router import router as public_widget_router
app.include_router(public_widget_router, prefix="/api/public/widget", tags=["Público - Widget"])


# ===== API v1 - Veterinary Portal =====
from app.api.veterinary.auth.router import router as veterinary_auth_router
from app.api.veterinary.dashboard.router import router as veterinary_dashboard_router
from app.api.internal.veterinary.notifications.router import router as veterinary_notifications_router
app.include_router(veterinary_auth_router, prefix="/api/veterinary", tags=["Veterinary - Auth"])
app.include_router(veterinary_dashboard_router, tags=["Veterinary - Dashboard"])
app.include_router(veterinary_notifications_router, prefix="/api/veterinary/notifications", tags=["Veterinary - Notifications"])

from app.api.public.tracking.router import router as tracking_router
app.include_router(tracking_router, prefix="/api/public/tracking", tags=["Público - Seguimiento"])

@app.get("/")
def read_root():
    return {"message": "SaaS Crematorio API v1.0 - Arquitectura Modular"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Logger Middleware (DEBE SER EL ÚLTIMO add_middleware para ejecutarse primero)
class RequestLoggerMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope["method"]
        path = scope["path"]
        logger.info(f"--> incoming: {method} {path}")

        response_status = [500]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                response_status[0] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
            logger.info(f"<-- outgoing: {response_status[0]} for {path}")
        except Exception as e:
            logger.error(f"[ERROR]: {str(e)} in {path}")
            raise e

app.add_middleware(RequestLoggerMiddleware)
