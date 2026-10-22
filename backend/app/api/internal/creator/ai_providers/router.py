"""
SuperAdmin: plataformas de IA (Configuración Global → Plataformas IA).

Cada conexión guarda plataforma, nombre, modelo y API key (cifrada; nunca se
devuelve, solo sus últimos 4 caracteres). Una conexión puede marcarse para
texto y/o ilustración de las plantillas de imagen. Con varias por uso, `priority`
define el orden de respaldo: si la principal falla se usa la siguiente.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.internal.creator.ai_providers.schemas import (
    AiProviderCreate, AiProviderOut, AiProviderTestRequest, AiProviderTestResult, AiProviderUpdate,
)
from app.auth import get_current_creator
from app.database import get_db
from app.services import ai_providers
from app.utils import secrets_box, tz

router = APIRouter()


def _out(row: models.AiProvider) -> AiProviderOut:
    return AiProviderOut(
        id=row.id, provider=row.provider, name=row.name, model=row.model, is_active=row.is_active,
        use_for_text=row.use_for_text, use_for_image=row.use_for_image,
        cost_per_use_usd=float(row.cost_per_use_usd or 0),
        priority=row.priority or 1,
        api_key_hint=secrets_box.hint(secrets_box.decrypt(row.api_key_encrypted)),
        last_test_at=row.last_test_at, last_test_ok=row.last_test_ok, last_test_message=row.last_test_message,
        created_at=row.created_at, updated_at=row.updated_at,
    )


def _get_or_404(db: Session, provider_id: int) -> models.AiProvider:
    row = db.query(models.AiProvider).filter(models.AiProvider.id == provider_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Plataforma no encontrada")
    return row


def _validate_and_mark(db: Session, row: models.AiProvider) -> None:
    """Varias conexiones pueden servir el mismo uso: `priority` define el orden
    (1 = principal, el resto son respaldos si la anterior falla)."""
    if row.use_for_image and not ai_providers.PROVIDERS[row.provider]["supports_image"]:
        raise HTTPException(status_code=400, detail="La ilustración con IA solo está disponible con Google Gemini u OpenRouter.")


@router.get("/catalog")
def ai_providers_catalog(_creator=Depends(get_current_creator)):
    return ai_providers.PROVIDERS


@router.get("", response_model=List[AiProviderOut])
def list_ai_providers(db: Session = Depends(get_db), _creator=Depends(get_current_creator)):
    return [_out(r) for r in db.query(models.AiProvider).order_by(models.AiProvider.id).all()]


@router.post("", response_model=AiProviderOut)
def create_ai_provider(payload: AiProviderCreate, db: Session = Depends(get_db), _creator=Depends(get_current_creator)):
    data = payload.model_dump(exclude={"api_key"})
    row = models.AiProvider(**data, api_key_encrypted=secrets_box.encrypt(payload.api_key.strip()))
    db.add(row)
    db.flush()
    _validate_and_mark(db, row)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.patch("/{provider_id}", response_model=AiProviderOut)
def update_ai_provider(provider_id: int, payload: AiProviderUpdate, db: Session = Depends(get_db),
                       _creator=Depends(get_current_creator)):
    row = _get_or_404(db, provider_id)
    data = payload.model_dump(exclude_unset=True, exclude={"api_key"})
    for key, value in data.items():
        setattr(row, key, value)
    new_key = (payload.api_key or "").strip()
    if new_key:
        row.api_key_encrypted = secrets_box.encrypt(new_key)
    if new_key or {"provider", "model"} & data.keys():
        # La prueba anterior ya no representa esta configuración.
        row.last_test_at = row.last_test_ok = row.last_test_message = None
    _validate_and_mark(db, row)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.delete("/{provider_id}")
def delete_ai_provider(provider_id: int, db: Session = Depends(get_db), _creator=Depends(get_current_creator)):
    db.delete(_get_or_404(db, provider_id))
    db.commit()
    return {"status": "deleted"}


@router.post("/test", response_model=AiProviderTestResult)
async def test_ai_provider(payload: AiProviderTestRequest, db: Session = Depends(get_db),
                           _creator=Depends(get_current_creator)):
    row = _get_or_404(db, payload.id) if payload.id else None
    typed_key = (payload.api_key or "").strip()
    api_key = typed_key or (secrets_box.decrypt(row.api_key_encrypted) if row else None)
    if not api_key:
        raise HTTPException(status_code=400, detail="Ingresa la API key para probar la conexión.")

    model = payload.model.strip()
    ok, message, detail = await ai_providers.test_connection(payload.provider, model, api_key)

    # El resultado se guarda solo si se probó exactamente lo que está guardado.
    if row and row.provider == payload.provider and row.model == model and not typed_key:
        row.last_test_at = tz.get_now()
        row.last_test_ok = ok
        row.last_test_message = message
        db.commit()
    return AiProviderTestResult(ok=ok, message=message, detail=detail)
