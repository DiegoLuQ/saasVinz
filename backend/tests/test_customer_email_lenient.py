import pytest
from app.api.internal.crm.schemas import CustomerInDB, CustomerCreate, CustomerUpdate
from app.utils.sanitize import sanitize_email, validate_email_strict
from datetime import datetime


def test_customer_email_with_spaces_does_not_crash_serialization():
    # Email con espacio o mal formado en la base de datos no debe botar la API con ResponseValidationError
    customer_data = {
        "id": 1,
        "tenant_id": 1,
        "name": "Gabriela Cisternas",
        "email": "gabriela. cisternas.15.gc@gmail.con",
        "created_at": datetime.now()
    }
    customer = CustomerInDB.model_validate(customer_data)
    assert customer.email == "gabriela. cisternas.15.gc@gmail.con"


def test_sanitize_and_validate_email():
    # Remueve espacios y corrige gmail.con -> gmail.com
    cleaned = sanitize_email("  gabriela. cisternas.15.gc@gmail.con ")
    assert cleaned == "gabriela.cisternas.15.gc@gmail.com"
    assert validate_email_strict(cleaned) is None

    # Caracteres permitidos: . - _ @
    assert validate_email_strict("juan_perez-12.test@empresa.cl") is None

    # Rechaza caracteres especiales inválidos
    assert validate_email_strict("juan$perez@gmail.com") is not None
    assert validate_email_strict("juan+test@gmail.com") is not None

    # Rechaza mayor a 100 caracteres
    long_email = "a" * 91 + "@gmail.com"  # 101 chars
    assert len(long_email) == 101
    assert validate_email_strict(long_email) is not None

    ok_email = "a" * 90 + "@gmail.com"  # 100 chars
    assert len(ok_email) == 100
    assert validate_email_strict(ok_email) is None

    # Rechaza variantes Gmail que no terminan en @gmail.com
    assert validate_email_strict("test@gmail.org") is not None
    assert validate_email_strict("test@gmail.net") is not None


def test_customer_create_sanitizes_and_validates():
    c = CustomerCreate(name="Gabriela", email="gabriela. cisternas.15.gc@gmail.con")
    assert c.email == "gabriela.cisternas.15.gc@gmail.com"

    # Los caracteres que un correo no admite se quitan (ñ → n, sin tildes; app/utils/sanitize.py)
    assert CustomerCreate(name="Bad", email="user!#$@gmail.com").email == "user@gmail.com"
    assert CustomerCreate(name="Ñandú", email="nandú.peña@gmail.com").email == "nandu.pena@gmail.com"

    with pytest.raises(ValueError):
        CustomerCreate(name="BadGmail", email="user@gmail.net")
