from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Optional

from app import models
from app.api.internal.crm import schemas

class CustomerService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, tenant_id: int) -> List[models.Customer]:
        """Retrieve all customers for a tenant."""
        return self.db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id).all()

    def get_by_id(self, tenant_id: int, customer_id: int) -> models.Customer:
        """Retrieve a specific customer by ID within a tenant."""
        customer = self.db.query(models.Customer).filter(
            models.Customer.id == customer_id, 
            models.Customer.tenant_id == tenant_id
        ).first()
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

    def get_by_rut(self, tenant_id: int, rut: str) -> Optional[models.Customer]:
        """Retrieve a customer by RUT within a tenant."""
        return self.db.query(models.Customer).filter(
            models.Customer.tenant_id == tenant_id,
            models.Customer.rut == rut
        ).first()

    def create(self, tenant_id: int, customer_in: schemas.CustomerCreate) -> models.Customer:
        """Create a new customer with RUT duplicate check."""
        if customer_in.rut:
            existing = self.get_by_rut(tenant_id, customer_in.rut)
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Ya existe un cliente registrado con el RUT {customer_in.rut}."
                )

        db_customer = models.Customer(
            **customer_in.model_dump(),
            tenant_id=tenant_id
        )
        self.db.add(db_customer)
        self.db.commit()
        self.db.refresh(db_customer)
        return db_customer

    def update(self, tenant_id: int, customer_id: int, customer_update: schemas.CustomerUpdate) -> models.Customer:
        """Update a customer with RUT duplicate check."""
        db_customer = self.get_by_id(tenant_id, customer_id)
        
        update_data = customer_update.model_dump(exclude_unset=True)
        
        # Validar duplicado si se cambia el RUT
        if "rut" in update_data and update_data["rut"] != db_customer.rut:
            existing = self.db.query(models.Customer).filter(
                models.Customer.tenant_id == tenant_id,
                models.Customer.rut == update_data["rut"],
                models.Customer.id != customer_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Ya existe otro cliente registrado con el RUT {update_data['rut']}."
                )

        for key, value in update_data.items():
            setattr(db_customer, key, value)
        
        self.db.commit()
        self.db.refresh(db_customer)
        return db_customer

    def delete(self, tenant_id: int, customer_id: int) -> dict:
        """Delete a customer after verifying dependencies (Pets, Orders)."""
        db_customer = self.get_by_id(tenant_id, customer_id)

        # 1. Verificar dependencias (Mascotas)
        pet_exists = self.db.query(models.Pet).filter(
            models.Pet.customer_id == customer_id,
            models.Pet.tenant_id == tenant_id
        ).first()

        if pet_exists:
            raise HTTPException(
                status_code=409, 
                detail="No se puede eliminar el cliente porque tiene mascotas registradas."
            )

        # 2. Verificar dependencias (Pedidos/Cremaciones - Future implementation)
        # order_exists = ...
        
        self.db.delete(db_customer)
        self.db.commit()
        
        return {"status": "deleted", "message": f"Cliente {db_customer.name} eliminado correctamente"}
