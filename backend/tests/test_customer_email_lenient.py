import pytest
from app.api.internal.crm.schemas import CustomerInDB, CustomerBase
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
