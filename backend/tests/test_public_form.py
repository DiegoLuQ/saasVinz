"""Formulario público de las familias: acceso por token, campos obligatorios y máximo de fotos."""
import io
import json
import uuid

import pytest
from PIL import Image

from app import models


@pytest.fixture
def form_token(db, world):
    tenant = db.query(models.Tenant).get(world["tenant_a"])
    if not tenant.public_token:
        tenant.public_token = uuid.uuid4().hex
        db.commit()
    return tenant.public_token


def _png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 40), (120, 180, 200)).save(buf, format="PNG")
    return buf.getvalue()


def _submit(client, world, token, owner=None, pet=None, photos=0):
    # Campos obligatorios por defecto (services/public_form_config.py): retiro, entrega, tamaño y edad.
    owner = owner if owner is not None else {"fullName": "Familia Formulario", "phone": "+56912345678",
                                             "veterinary": "Domicilio", "address": "Av. Siempre Viva 742"}
    pet = pet if pet is not None else {"name": "Copito", "type": "Felino", "species": "Felino", "size": "Pequeño", "age": "8"}
    files = [("files", (f"foto{i}.png", _png(), "image/png")) for i in range(photos)]
    return client.post("/api/public/submit-form", data={
        "tenant_id": world["tenant_a"], "owner_data": json.dumps(owner), "pet_data": json.dumps(pet),
        "token": token or "", "recaptcha_token": "x",
    }, files=files or None)


def test_sin_token_valido_no_se_acepta(client, world):
    assert _submit(client, world, "token-falso").status_code == 403


def test_registro_valido_crea_la_solicitud(client, db, world, form_token):
    antes = db.query(models.FormSubmission).filter(models.FormSubmission.tenant_id == world["tenant_a"]).count()
    r = _submit(client, world, form_token, photos=1)
    assert r.status_code == 200, r.text
    assert db.query(models.FormSubmission).filter(models.FormSubmission.tenant_id == world["tenant_a"]).count() == antes + 1


def test_faltan_campos_obligatorios(client, world, form_token):
    r = _submit(client, world, form_token, owner={"fullName": "Sin teléfono"})
    assert r.status_code in (400, 422), r.text


def test_maximo_tres_fotos(client, world, form_token):
    r = _submit(client, world, form_token, photos=4)
    assert r.status_code in (400, 413, 422), r.text


def test_email_invalido_se_rechaza(client, world, form_token):
    r = _submit(client, world, form_token, owner={"fullName": "Familia", "phone": "+56912345678", "email": "no-es-correo"})
    assert r.status_code == 400
