"""Clic en «Dejar mi opinión en Google» del correo de reseña (services/google_review.py).

GET /api/public/review/r/{slug}/{token}: registra el clic y redirige (302) al enlace
de reseñas de Google de ESE crematorio (el actual del Perfil). Nunca muestra error a
la familia: un token desconocido también redirige (al enlace del crematorio o al sitio).
"""
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app import models
from app.core.config import settings
from app.core.rate_limiter import limiter
from app.database import get_db
from app.services import google_review as gr

logger = logging.getLogger(__name__)
router = APIRouter()


@router.api_route("/r/{slug}/{token}", methods=["GET", "HEAD"], include_in_schema=False)
@limiter.limit("30/minute")
def review_click(request: Request, slug: str, token: str, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    target = (gr.review_link(tenant) if tenant else "") or settings.FRONTEND_URL
    if tenant and 8 <= len(token) <= 40:
        from app.core.tenant_context import apply_tenant_rls
        try:
            apply_tenant_rls(db, tenant.id)
            gr.register_click(db, tenant, token, request.headers.get("user-agent"), request.method)
        except Exception:  # noqa: BLE001 - registrar el clic nunca impide llegar a Google
            db.rollback()
            logger.exception("No se pudo registrar el clic de reseña (%s)", slug)
    resp = RedirectResponse(target, status_code=302)
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["X-Robots-Tag"] = "noindex"
    return resp
