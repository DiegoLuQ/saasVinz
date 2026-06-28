from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, UploadFile
from typing import List, Optional
from datetime import datetime
import os
import time
import uuid
import shutil

from app import models
from app.api.internal.operations import schemas
from app.api.internal.common.media_service import MediaService
from app.utils.time import get_tenant_now
from app.utils.generators import generate_unique_code
from app.api.internal.partners.models import PartnerLinkV2 as PartnerLink, PartnerCommission, PartnerCommissionStatus

class CremationService:
    def __init__(self, db: Session):
        self.db = db

    def _sync_cremation_type(self, db_cremation: models.CremationOC):
        # Resolve from plans first
        principal_plan = self.db.query(models.PlanOC).filter(
            models.PlanOC.cremation_id == db_cremation.id,
            models.PlanOC.es_principal == True
        ).first()
        if not principal_plan:
            principal_plan = self.db.query(models.PlanOC).filter(
                models.PlanOC.cremation_id == db_cremation.id
            ).first()
            
        if principal_plan and principal_plan.plan:
            db_cremation.cremation_type = principal_plan.plan.name
            return

        principal_service = self.db.query(models.ServicioOC).filter(
            models.ServicioOC.cremation_id == db_cremation.id,
            models.ServicioOC.es_principal == True
        ).first()
        if not principal_service:
            principal_service = self.db.query(models.ServicioOC).filter(
                models.ServicioOC.cremation_id == db_cremation.id
            ).first()
            
        if principal_service and principal_service.service:
            db_cremation.cremation_type = principal_service.service.name
            return
            
        db_cremation.cremation_type = "Servicio Personalizado"

    def get_all(
        self, 
        tenant_id: int, 
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        cremation_type: Optional[str] = None,
        status: Optional[str] = None,
        sort_order: str = "desc"
    ) -> List[models.CremationOC]:
        query = self.db.query(models.CremationOC).options(
            joinedload(models.CremationOC.pet).joinedload(models.Pet.customer),
            joinedload(models.CremationOC.technical),
            joinedload(models.CremationOC.logistics),
            joinedload(models.CremationOC.financial),
            joinedload(models.CremationOC.details),
            joinedload(models.CremationOC.scheduling),
            joinedload(models.CremationOC.servicios),
            joinedload(models.CremationOC.planes),
            joinedload(models.CremationOC.productos)
        ).filter(models.CremationOC.tenant_id == tenant_id)

        if status and status != "all":
            query = query.filter(models.CremationOC.status == status)

        if cremation_type and cremation_type != "all":
            query = query.filter(models.CremationOC.cremation_type == cremation_type)

        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                query = query.filter(models.CremationOC.created_at >= start_dt)
            except ValueError:
                pass
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
                if len(end_date) <= 10:
                    from datetime import time as dt_time
                    end_dt = datetime.combine(end_dt.date(), dt_time(23, 59, 59))
                query = query.filter(models.CremationOC.created_at <= end_dt)
            except ValueError:
                pass

        if sort_order == "desc":
            query = query.order_by(models.CremationOC.created_at.desc(), models.CremationOC.id.desc())
        else:
            query = query.order_by(models.CremationOC.created_at.asc(), models.CremationOC.id.asc())

        return query.all()

    def get_by_id(self, tenant_id: int, cremation_id: int) -> models.CremationOC:
        db_cremation = self.db.query(models.CremationOC).options(
            joinedload(models.CremationOC.pet).joinedload(models.Pet.customer),
            joinedload(models.CremationOC.partner_link),
            joinedload(models.CremationOC.technical),
            joinedload(models.CremationOC.commission),
            joinedload(models.CremationOC.logistics),
            joinedload(models.CremationOC.financial),
            joinedload(models.CremationOC.details),
            joinedload(models.CremationOC.scheduling),
            joinedload(models.CremationOC.productos),
            joinedload(models.CremationOC.planes),
            joinedload(models.CremationOC.servicios)
        ).filter(
            models.CremationOC.id == cremation_id,
            models.CremationOC.tenant_id == tenant_id
        ).first()
        if not db_cremation:
            raise HTTPException(status_code=404, detail="OC no encontrada")
        return db_cremation

    def create(self, tenant_id: int, cremation_in: schemas.CremationOCCreate) -> models.CremationOC:
        pet = self.db.query(models.Pet).filter(
            models.Pet.id == cremation_in.pet_id,
            models.Pet.tenant_id == tenant_id
        ).first()
        if not pet:
            raise HTTPException(status_code=404, detail="Mascota no encontrada")

        servicios_in = list(cremation_in.servicios or [])
        planes_in = list(cremation_in.planes or [])
        productos_in = list(cremation_in.products or [])
        
        if cremation_in.service_id:
            if not any(s.service_id == cremation_in.service_id for s in servicios_in):
                srv = self.db.query(models.Service).filter(models.Service.id == cremation_in.service_id).first()
                servicios_in.append(schemas.ServicioOCCreate(
                    service_id=cremation_in.service_id,
                    cantidad=1,
                    precio_venta=srv.price if srv else 0.0,
                    precio_costo=srv.cost if srv else 0.0
                ))

        if cremation_in.additional_services:
            for s_id in cremation_in.additional_services:
                if not any(s.service_id == s_id for s in servicios_in):
                    srv = self.db.query(models.Service).filter(models.Service.id == s_id).first()
                    servicios_in.append(schemas.ServicioOCCreate(
                        service_id=s_id,
                        cantidad=1,
                        precio_venta=srv.price if srv else 0.0,
                        precio_costo=srv.cost if srv else 0.0
                    ))

        if cremation_in.plan_id:
            if not any(p.plan_id == cremation_in.plan_id for p in planes_in):
                pln = self.db.query(models.Plan).filter(models.Plan.id == cremation_in.plan_id).first()
                planes_in.append(schemas.PlanOCCreate(
                    plan_id=cremation_in.plan_id,
                    cantidad=1,
                    precio_venta=pln.price if pln else 0.0,
                    precio_costo=pln.cost if pln else 0.0
                ))

        core_fields_keys = {"pet_id", "oc_number", "cremation_type", "status", "weight"}
        cremation_data = {k: v for k, v in cremation_in.model_dump().items() if k in core_fields_keys}

        db_cremation = models.CremationOC(
            **cremation_data,
            tenant_id=tenant_id,
            verification_code=generate_unique_code()
        )
        if cremation_in.partner_id:
            db_cremation.partner_link_id = cremation_in.partner_id
        
        if not cremation_in.oc_number:
            last_oc = self.db.query(func.max(models.CremationOC.oc_number)).filter(
                models.CremationOC.tenant_id == tenant_id
            ).scalar() or 0
            db_cremation.oc_number = last_oc + 1
        else:
            db_cremation.oc_number = cremation_in.oc_number

        self.db.add(db_cremation)
        self.db.flush()

        self.db.add(models.CremationLogistics(
            cremation_id=db_cremation.id,
            tenant_id=tenant_id,
            region=cremation_in.region,
            city=cremation_in.city,
            address=cremation_in.address,
            pickup_region=cremation_in.pickup_region,
            pickup_city=cremation_in.pickup_city,
            pickup_address=cremation_in.pickup_address
        ))

        calculated_commission = 0.0
        calculated_commission_percent = 0.0
        
        is_operational_status = cremation_in.status and cremation_in.status.lower() not in ['pendiente', 'pending', 'borrador', 'cotizacion']
        
        if is_operational_status and db_cremation.partner_link_id:
            partner_link = self.db.query(PartnerLink).filter(PartnerLink.id == db_cremation.partner_link_id).first()
            if partner_link:
                tipo = getattr(partner_link, 'tipo_comision', 'porcentaje')
                if tipo == 'fijo':
                    calculated_commission = getattr(partner_link, 'monto_comision', 0.0) or 0.0
                    calculated_commission_percent = 0.0
                else:
                    percent = getattr(partner_link, 'porcentaje_comision', 0.0) or 0.0
                    price_for_comm = cremation_in.total_price or 0.0
                    calculated_commission = price_for_comm * (percent / 100)
                    calculated_commission_percent = percent

        total_cost_in = (
            sum((s.precio_costo or 0.0) * s.cantidad for s in servicios_in) +
            sum((p.precio_costo or 0.0) * p.cantidad for p in planes_in) +
            sum((pr.precio_costo or 0.0) * pr.cantidad for pr in productos_in)
        )
        self.db.add(models.CremationFinancial(
            cremation_id=db_cremation.id,
            tenant_id=tenant_id,
            total_price=cremation_in.total_price or 0.0,
            total_cost=total_cost_in,
            discount=cremation_in.discount or 0.0,
            weight_price=cremation_in.weight_price or 0.0,
            commission=calculated_commission
        ))

        self.db.add(models.CremationDetails(
            cremation_id=db_cremation.id,
            tenant_id=tenant_id,
            images=cremation_in.images or [],
            notes=cremation_in.notes,
            additional_services=cremation_in.additional_services or []
        ))

        self.db.add(models.CremationScheduling(
            cremation_id=db_cremation.id,
            tenant_id=tenant_id,
            scheduled_at=cremation_in.scheduled_at,
            completed_at=cremation_in.completed_at or (get_tenant_now(self.db, tenant_id) if cremation_in.status and cremation_in.status.lower() in ['completado', 'completed', 'entregado', 'delivered'] else None)
        ))

        tech = models.CremationTechnical(
            cremation_id=db_cremation.id,
            step_id=cremation_in.current_step_id if hasattr(cremation_in, 'current_step_id') else None,
            operator_id=cremation_in.operator_id if hasattr(cremation_in, 'operator_id') else None,
            furnace_id=cremation_in.furnace_id if hasattr(cremation_in, 'furnace_id') else None,
            start_at=cremation_in.start_time if hasattr(cremation_in, 'start_time') else None,
            end_at=cremation_in.end_time if hasattr(cremation_in, 'end_time') else None,
            temperature=cremation_in.temperature if hasattr(cremation_in, 'temperature') else None,
            evidence_url=cremation_in.technical_evidence_image_url if hasattr(cremation_in, 'technical_evidence_image_url') else None
        )
        self.db.add(tech)

        if is_operational_status and db_cremation.partner_link_id:
            self.db.add(PartnerCommission(
                cremation_id=db_cremation.id,
                partner_link_id=db_cremation.partner_link_id,
                amount=calculated_commission,
                amount_porcentaje=calculated_commission_percent,
                status=PartnerCommissionStatus.pendiente
            ))

        for s_item in servicios_in:
            s_dict = s_item if isinstance(s_item, dict) else s_item.model_dump()
            db_serv_oc = models.ServicioOC(
                tenant_id=tenant_id,
                cremation_id=db_cremation.id,
                service_id=s_dict['service_id'],
                cantidad=s_dict['cantidad'],
                precio_costo=s_dict.get('precio_costo'),
                precio_venta=s_dict.get('precio_venta'),
                es_principal=s_dict.get('es_principal', True),
            )
            self.db.add(db_serv_oc)

        for p_item in planes_in:
            p_dict = p_item if isinstance(p_item, dict) else p_item.model_dump()
            db_plan_oc = models.PlanOC(
                tenant_id=tenant_id,
                cremation_id=db_cremation.id,
                plan_id=p_dict['plan_id'],
                cantidad=p_dict['cantidad'],
                precio_costo=p_dict.get('precio_costo'),
                precio_venta=p_dict.get('precio_venta'),
                es_principal=p_dict.get('es_principal', True),
            )
            self.db.add(db_plan_oc)

        for prod_item in productos_in:
            p_dict = prod_item if isinstance(prod_item, dict) else prod_item.model_dump()
            db_product = self.db.query(models.Product).filter(
                models.Product.id == p_dict['product_id'], 
                models.Product.tenant_id == tenant_id
            ).first()
            
            if db_product:
                db_product.stock -= p_dict['cantidad']
                if db_product.stock <= 0:
                    db_product.availability_status = "Agotado"
                
                db_assoc = models.ProductoOC(
                    tenant_id=tenant_id,
                    cremation_id=db_cremation.id,
                    product_id=p_dict['product_id'],
                    cantidad=p_dict['cantidad'],
                    precio_costo=p_dict.get('precio_costo') if p_dict.get('precio_costo') and p_dict.get('precio_costo') > 0 else (db_product.cost_price or 0.0),
                    precio_venta=p_dict.get('precio_venta')
                )
                self.db.add(db_assoc)
        
        self.db.flush()
        self._sync_cremation_type(db_cremation)
        self.db.commit()
        self.db.refresh(db_cremation)
        return db_cremation

    def update(self, tenant_id: int, cremation_id: int, cremation_in: schemas.CremationOCUpdate) -> models.CremationOC:
        db_obj = self.get_by_id(tenant_id, cremation_id)

        # Ensure partitions exist
        if not db_obj.logistics: db_obj.logistics = models.CremationLogistics(cremation_id=cremation_id, tenant_id=tenant_id)
        if not db_obj.financial: db_obj.financial = models.CremationFinancial(cremation_id=cremation_id, tenant_id=tenant_id)
        if not db_obj.details: db_obj.details = models.CremationDetails(cremation_id=cremation_id, tenant_id=tenant_id)
        if not db_obj.scheduling: db_obj.scheduling = models.CremationScheduling(cremation_id=cremation_id, tenant_id=tenant_id)

        update_data = cremation_in.model_dump(exclude_unset=True)
        servicios_in = update_data.pop("servicios", None)
        planes_in = update_data.pop("planes", None)
        productos_in = update_data.pop("products", None)
        
        patch_service_id = update_data.pop("service_id", None)
        patch_plan_id = update_data.pop("plan_id", None)
        patch_additional = update_data.pop("additional_services", None)

        if (servicios_in is not None or planes_in is not None or productos_in is not None or 
            patch_service_id is not None or patch_plan_id is not None or patch_additional is not None):
            
            # Servicios
            if servicios_in is not None or patch_service_id is not None or patch_additional is not None:
                if servicios_in is None: servicios_in = []
                if patch_service_id:
                    if not any(s.get("service_id") == patch_service_id for s in servicios_in):
                        srv = self.db.query(models.Service).filter(models.Service.id == patch_service_id).first()
                        servicios_in.append({"service_id": patch_service_id, "cantidad": 1, "precio_venta": srv.price if srv else 0.0, "precio_costo": srv.cost if srv else 0.0, "es_principal": True})
                if patch_additional:
                    for s_id in patch_additional:
                        if not any(s.get("service_id") == s_id for s in servicios_in):
                            srv = self.db.query(models.Service).filter(models.Service.id == s_id).first()
                            servicios_in.append({"service_id": s_id, "cantidad": 1, "precio_venta": srv.price if srv else 0.0, "precio_costo": srv.cost if srv else 0.0, "es_principal": True})
                self.db.query(models.ServicioOC).filter(models.ServicioOC.cremation_id == cremation_id).delete()
                for s_item in servicios_in:
                    s_dict = s_item if isinstance(s_item, dict) else s_item.model_dump()
                    self.db.add(models.ServicioOC(tenant_id=tenant_id, cremation_id=cremation_id, **s_dict))

            # Planes
            if planes_in is not None or patch_plan_id is not None:
                if planes_in is None: planes_in = []
                if patch_plan_id:
                    if not any(p.get("plan_id") == patch_plan_id for p in planes_in):
                        pln = self.db.query(models.Plan).filter(models.Plan.id == patch_plan_id).first()
                        planes_in.append({"plan_id": patch_plan_id, "cantidad": 1, "precio_venta": pln.price if pln else 0.0, "precio_costo": 0.0, "es_principal": True})
                self.db.query(models.PlanOC).filter(models.PlanOC.cremation_id == cremation_id).delete()
                for p_item in planes_in:
                    p_dict = p_item if isinstance(p_item, dict) else p_item.model_dump()
                    self.db.add(models.PlanOC(tenant_id=tenant_id, cremation_id=cremation_id, **p_dict))

            # Productos (Stock management)
            if productos_in is not None:
                old_products = self.db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == cremation_id).all()
                for old_p in old_products:
                    p_obj = self.db.query(models.Product).filter(models.Product.id == old_p.product_id).first()
                    if p_obj: p_obj.stock += old_p.cantidad
                
                self.db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == cremation_id).delete()
                for prod_item in productos_in:
                    p_dict = prod_item if isinstance(prod_item, dict) else prod_item.model_dump()
                    p_obj = self.db.query(models.Product).filter(models.Product.id == p_dict["product_id"]).first()
                    if p_obj:
                        p_obj.stock -= p_dict["cantidad"]
                        p_obj.availability_status = "Disponible" if p_obj.stock > 0 else "Agotado"
                        
                        if not p_dict.get("precio_costo") or p_dict.get("precio_costo") == 0:
                            p_dict["precio_costo"] = p_obj.cost_price or 0.0
                            
                    self.db.add(models.ProductoOC(tenant_id=tenant_id, cremation_id=cremation_id, **p_dict))

            self.db.flush()
            new_total_cost = (
                self.db.query(func.sum(models.ServicioOC.precio_costo * models.ServicioOC.cantidad)).filter(models.ServicioOC.cremation_id == cremation_id).scalar() or 0.0
            ) + (
                self.db.query(func.sum(models.PlanOC.precio_costo * models.PlanOC.cantidad)).filter(models.PlanOC.cremation_id == cremation_id).scalar() or 0.0
            ) + (
                self.db.query(func.sum(models.ProductoOC.precio_costo * models.ProductoOC.cantidad)).filter(models.ProductoOC.cremation_id == cremation_id).scalar() or 0.0
            )
            if db_obj.financial:
                db_obj.financial.total_cost = new_total_cost

        new_status = update_data.get("status")
        if new_status and new_status.lower() == "cancelado" and db_obj.status != "cancelado":
            self.db.flush()
            for p_assoc in db_obj.productos:
                prod = self.db.query(models.Product).filter(models.Product.id == p_assoc.product_id).first()
                if prod:
                    prod.stock += p_assoc.cantidad
                    prod.availability_status = "Disponible"
            
            if db_obj.images:
                for img_url in db_obj.images:
                    try:
                        if img_url.startswith("/static/"):
                            disk_path = os.path.join(os.getcwd(), "app", img_url.lstrip("/"))
                            if os.path.exists(disk_path): os.remove(disk_path)
                    except Exception as e: print(f"Error deleting OC image {img_url}: {e}")

            if db_obj.details: db_obj.details.additional_services = []
            if db_obj.financial:
                db_obj.financial.total_price = 0.0
                db_obj.financial.total_cost = 0.0
            
            # Using raw SQL or relationship clearing
            # db_obj.servicios = [] # This might fail if back_populates isn't perfect, safer to delete via Query if needed or let ORM handle
            # Assuming cascade or simple clearing works:
            # But safer to manually delete associations as in original code
            self.db.query(models.ServicioOC).filter(models.ServicioOC.cremation_id == cremation_id).delete()
            self.db.query(models.PlanOC).filter(models.PlanOC.cremation_id == cremation_id).delete()
            self.db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id == cremation_id).delete()

            pet = self.db.query(models.Pet).filter(models.Pet.id == db_obj.pet_id).first()
            if pet and pet.image_url:
                try:
                    if pet.image_url.startswith("/static/"):
                        disk_path = os.path.join(os.getcwd(), "app", pet.image_url.lstrip("/"))
                        if os.path.exists(disk_path): os.remove(disk_path)
                    pet.image_url = None
                    pet.images = []
                except Exception as e: print(f"Error deleting pet image: {e}")
            
            db_obj.images = []
            if "images" in update_data: update_data["images"] = []

        core_fields_keys = {"pet_id", "oc_number", "cremation_type", "status", "weight", "cremation_type"}
        partition_fields = {
            "logistics": {"region", "city", "address", "pickup_region", "pickup_city", "pickup_address"},
            "financial": {"total_price", "discount", "weight_price"},
            "details": {"images", "notes", "additional_services"},
            "scheduling": {"scheduled_at", "completed_at"}
        }

        for var, value in update_data.items():
            if var in ["id", "tenant_id"]:
                continue
            if var in core_fields_keys:
                setattr(db_obj, var, value)
            elif var in partition_fields["logistics"]:
                if db_obj.logistics: setattr(db_obj.logistics, var, value)
            elif var in partition_fields["financial"]:
                if db_obj.financial: setattr(db_obj.financial, var, value)
            elif var in partition_fields["details"]:
                if var == "additional_services":
                    value = value if isinstance(value, list) else []
                if db_obj.details: setattr(db_obj.details, var, value)
            elif var in partition_fields["scheduling"]:
                if db_obj.scheduling: setattr(db_obj.scheduling, var, value)

        completed_statuses = ["completed", "completado", "delivered", "entregado"]
        new_status_val = update_data.get("status")
        if new_status_val and new_status_val.lower() in completed_statuses:
            if "completed_at" not in update_data and (not db_obj.scheduling.completed_at):
                 db_obj.scheduling.completed_at = get_tenant_now(self.db, tenant_id)

        tech_fields = {"current_step_id", "operator_id", "furnace_id", "start_time", "end_time", "temperature"}
        if any(k in update_data for k in tech_fields):
            if not db_obj.technical:
                db_obj.technical = models.CremationTechnical(cremation_id=cremation_id)
            
            if "current_step_id" in update_data: db_obj.technical.step_id = update_data["current_step_id"]
            if "operator_id" in update_data: db_obj.technical.operator_id = update_data["operator_id"]
            if "furnace_id" in update_data: db_obj.technical.furnace_id = update_data["furnace_id"]
            if "start_time" in update_data: db_obj.technical.start_at = update_data["start_time"]
            if "end_time" in update_data: db_obj.technical.end_at = update_data["end_time"]
            if "temperature" in update_data: db_obj.technical.temperature = update_data["temperature"]
        
        current_status = db_obj.status.lower() if db_obj.status else "pending"
        is_operational_status = current_status not in ['pendiente', 'pending', 'borrador', 'cotizacion']

        if db_obj.partner_link_id and is_operational_status:
            partner_link = self.db.query(PartnerLink).filter(PartnerLink.id == db_obj.partner_link_id).first()
            if partner_link:
                tipo = getattr(partner_link, 'tipo_comision', 'porcentaje')
                comm_amount = 0.0
                comm_percent = 0.0
                
                if tipo == 'fijo':
                    comm_amount = getattr(partner_link, 'monto_comision', 0.0) or 0.0
                    comm_percent = 0.0
                else:
                    percent = getattr(partner_link, 'porcentaje_comision', 0.0) or 0.0
                    price_for_comm = (db_obj.financial.total_price if db_obj.financial else 0.0) or 0.0
                    comm_amount = price_for_comm * (percent / 100)
                    comm_percent = percent
                
                if db_obj.financial:
                    db_obj.financial.commission = comm_amount
                
                p_comm = self.db.query(PartnerCommission).filter(
                    PartnerCommission.cremation_id == db_obj.id,
                    PartnerCommission.partner_link_id == db_obj.partner_link_id
                ).first()
                
                if p_comm:
                    if p_comm.status == PartnerCommissionStatus.pendiente:
                        p_comm.amount = comm_amount
                        p_comm.amount_porcentaje = comm_percent
                else:
                    self.db.add(PartnerCommission(
                        cremation_id=db_obj.id,
                        partner_link_id=db_obj.partner_link_id,
                        amount=comm_amount,
                        amount_porcentaje=comm_percent,
                        status=PartnerCommissionStatus.pendiente
                    ))

        self.db.flush()
        self._sync_cremation_type(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, tenant_id: int, cremation_id: int) -> dict:
        db_cremation = self.db.query(models.CremationOC).filter(
            models.CremationOC.id == cremation_id,
            models.CremationOC.tenant_id == tenant_id
        ).first()
        
        if not db_cremation:
            raise HTTPException(status_code=404, detail="OC no encontrada")
        
        # Files Cleanup
        if db_cremation.details and db_cremation.details.images:
            for img_url in db_cremation.details.images or []:
                MediaService.delete_media_by_url(self.db, img_url)

        if db_cremation.evidence:
             for ev in db_cremation.evidence:
                if ev.photo_url:
                    MediaService.delete_media_by_url(self.db, ev.photo_url)

        if db_cremation.technical and db_cremation.technical.evidence_url:
            MediaService.delete_media_by_url(self.db, db_cremation.technical.evidence_url)

        if db_cremation.logistics_tasks:
            for task in db_cremation.logistics_tasks:
                if task.evidence_image_url:
                    MediaService.delete_media_by_url(self.db, task.evidence_image_url)
                if task.signature_url:
                    MediaService.delete_media_by_url(self.db, task.signature_url)

        if db_cremation.documents:
            for doc in db_cremation.documents:
                if doc.file_url:
                    MediaService.delete_media_by_url(self.db, doc.file_url)

        other_orders = self.db.query(models.CremationOC).filter(
            models.CremationOC.pet_id == db_cremation.pet_id,
            models.CremationOC.id != cremation_id
        ).count()

        if other_orders == 0 and db_cremation.pet:
            pet = db_cremation.pet
            if pet.image_url:
                MediaService.delete_media_by_url(self.db, pet.image_url)
            if pet.images:
                for pet_img in pet.images or []:
                    MediaService.delete_media_by_url(self.db, pet_img)
        
        # Restore Stock
        for p_assoc in db_cremation.productos:
            prod = self.db.query(models.Product).filter(models.Product.id == p_assoc.product_id).first()
            if prod:
                prod.stock += p_assoc.cantidad
                prod.availability_status = "Disponible"
        
        self.db.delete(db_cremation)
        self.db.commit()
        return {"status": "success", "message": "Orden de Cremación eliminada correctamente"}

    async def upload_image(self, tenant_id: int, cremation_id: int, file: UploadFile) -> str:
        # Temporary save for processing
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        temp_path = os.path.join(temp_dir, f"crem_{cremation_id}_{uuid.uuid4().hex[:6]}{ext}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            # Upload using MediaService
            media_item = MediaService.upload_media(
                db=self.db,
                local_path=temp_path,
                media_type="image",
                category="cremations",
                ratio="original",
                description=f"Evidencia de cremación {cremation_id}",
                alt_text=f"Cremación {cremation_id}",
                processing_mode="optimized",
                tenant_id=tenant_id
            )
            image_url = media_item.url
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al procesar la imagen: {str(e)}")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
        db_cremation = self.db.query(models.CremationOC).filter(models.CremationOC.id == cremation_id).first()
        if db_cremation:
            if not db_cremation.details:
                db_cremation.details = models.CremationDetails(cremation_id=cremation_id, tenant_id=tenant_id)
            
            current_images = list(db_cremation.details.images or [])
            current_images.append(image_url)
            db_cremation.details.images = current_images
            self.db.commit()

        return image_url
