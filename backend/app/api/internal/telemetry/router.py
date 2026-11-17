"""
Rutas para ingesta de telemetría de módulos desde el frontend de crematorios.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session

from app import models, auth
from app.database import get_db
from app.services import module_telemetry

router = APIRouter()


class ClickItem(BaseModel):
    module_key: str = Field(..., max_length=50)
    count: int = Field(1, ge=1, le=100)


class ModuleClicksBatchRequest(BaseModel):
    clicks: List[ClickItem]


@router.post("/module-clicks", status_code=status.HTTP_200_OK)
def ingest_module_clicks(
    payload: ModuleClicksBatchRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Ingesta un lote acumulado de clics en módulos del Sidebar.
    Si la telemetría está apagada en SaaSConfig, no procesa nada y responde de inmediato.
    """
    if not current_user.tenant_id:
        return {"recorded": False, "reason": "no_tenant"}

    # Serializar lista a diccionarios
    batch = [item.model_dump() for item in payload.clicks]
    recorded = module_telemetry.record_batch_clicks(db, current_user.tenant_id, batch)

    if not recorded:
        response.status_code = status.HTTP_204_NO_CONTENT
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return {"recorded": True, "count": len(batch)}
