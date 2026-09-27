"""Mensajes de despedida sugeridos (SuperAdmin).

El formulario público ofrece uno al azar en la "Carta de Despedida" cuando la
familia no puede escribir. `{nombre_mascota}` se reemplaza por el nombre de la
mascota al mostrarlo.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app import auth, models
from app.database import get_db

router = APIRouter()

MESSAGE_MAX = 500


class FarewellMessageIn(BaseModel):
    text: str
    is_active: bool = True

    @field_validator("text")
    @classmethod
    def _valid_text(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("El mensaje no puede estar vacío")
        if len(v) > MESSAGE_MAX:
            raise ValueError(f"Máximo {MESSAGE_MAX} caracteres")
        return v


class FarewellMessageOut(BaseModel):
    id: int
    text: str
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}


def _get_or_404(db: Session, message_id: int) -> models.FarewellMessage:
    msg = db.query(models.FarewellMessage).filter(models.FarewellMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    return msg


@router.get("", response_model=List[FarewellMessageOut])
def list_messages(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    return db.query(models.FarewellMessage).order_by(models.FarewellMessage.created_at.desc()).all()


@router.post("", response_model=FarewellMessageOut)
def create_message(
    data: FarewellMessageIn,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    msg = models.FarewellMessage(text=data.text, is_active=data.is_active)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.put("/{message_id}", response_model=FarewellMessageOut)
def update_message(
    message_id: int,
    data: FarewellMessageIn,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    msg = _get_or_404(db, message_id)
    msg.text = data.text
    msg.is_active = data.is_active
    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    db.delete(_get_or_404(db, message_id))
    db.commit()
    return {"ok": True}
