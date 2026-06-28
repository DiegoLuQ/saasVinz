from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, UploadFile
from typing import List, Optional
import os
import time

from app import models
from app.api.internal.catalog import schemas
from app.api.internal.common.media_service import MediaService

class CategoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, tenant_id: int) -> List[models.Category]:
        return self.db.query(models.Category).filter(models.Category.tenant_id == tenant_id).all()

    def create(self, tenant_id: int, category_in: schemas.CategoryCreate) -> models.Category:
        existing = self.db.query(models.Category).filter(
            models.Category.tenant_id == tenant_id,
            models.Category.name == category_in.name
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"La categoría '{category_in.name}' ya existe.")

        db_category = models.Category(**category_in.model_dump(), tenant_id=tenant_id)
        self.db.add(db_category)
        self.db.commit()
        self.db.refresh(db_category)
        return db_category

    def update(self, tenant_id: int, category_id: int, category_update: schemas.CategoryUpdate) -> models.Category:
        db_category = self.db.query(models.Category).filter(
            models.Category.id == category_id, 
            models.Category.tenant_id == tenant_id
        ).first()
        if not db_category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        update_data = category_update.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] != db_category.name:
            existing = self.db.query(models.Category).filter(
                models.Category.tenant_id == tenant_id,
                models.Category.name == update_data["name"],
                models.Category.id != category_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Ya existe otra categoría con el nombre '{update_data['name']}'.")

        for key, value in update_data.items():
            setattr(db_category, key, value)
        
        self.db.commit()
        self.db.refresh(db_category)
        return db_category

    def delete(self, tenant_id: int, category_id: int) -> dict:
        db_category = self.db.query(models.Category).filter(
            models.Category.id == category_id, 
            models.Category.tenant_id == tenant_id
        ).first()
        if not db_category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        products_count = self.db.query(models.Product).filter(models.Product.category_id == category_id).count()
        if products_count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete category with associated products")

        self.db.delete(db_category)
        self.db.commit()
        return {"message": "Category deleted"}


class ProviderService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, tenant_id: int) -> List[models.Provider]:
        return self.db.query(models.Provider).filter(models.Provider.tenant_id == tenant_id).all()

    def create(self, tenant_id: int, provider_in: schemas.ProviderCreate) -> models.Provider:
        if provider_in.rut:
            existing = self.db.query(models.Provider).filter(
                models.Provider.tenant_id == tenant_id,
                models.Provider.rut == provider_in.rut
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Ya existe un proveedor con el RUT {provider_in.rut}.")

        db_provider = models.Provider(**provider_in.model_dump(), tenant_id=tenant_id)
        self.db.add(db_provider)
        self.db.commit()
        self.db.refresh(db_provider)
        return db_provider

    def update(self, tenant_id: int, provider_id: int, provider_update: schemas.ProviderUpdate) -> models.Provider:
        db_provider = self.db.query(models.Provider).filter(
            models.Provider.id == provider_id, 
            models.Provider.tenant_id == tenant_id
        ).first()
        if not db_provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        update_data = provider_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_provider, key, value)
        
        self.db.commit()
        self.db.refresh(db_provider)
        return db_provider

    def delete(self, tenant_id: int, provider_id: int) -> dict:
        db_provider = self.db.query(models.Provider).filter(
            models.Provider.id == provider_id, 
            models.Provider.tenant_id == tenant_id
        ).first()
        if not db_provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        products_count = self.db.query(models.Product).filter(models.Product.provider_id == provider_id).count()
        if products_count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete provider with associated products")

        self.db.delete(db_provider)
        self.db.commit()
        return {"message": "Provider deleted"}


class ProductService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, tenant_id: int) -> List[models.Product]:
        return self.db.query(models.Product).filter(models.Product.tenant_id == tenant_id).all()

    def create(self, tenant_id: int, product_in: schemas.ProductCreate) -> models.Product:
        if product_in.code:
            existing = self.db.query(models.Product).filter(
                models.Product.tenant_id == tenant_id,
                models.Product.code == product_in.code
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"El código de producto '{product_in.code}' ya está en uso.")
        
        db_product = models.Product(**product_in.model_dump(), tenant_id=tenant_id)
        self.db.add(db_product)
        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def update(self, tenant_id: int, product_id: int, product_update: schemas.ProductUpdate) -> models.Product:
        db_product = self.db.query(models.Product).filter(
            models.Product.id == product_id, 
            models.Product.tenant_id == tenant_id
        ).first()
        if not db_product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        update_data = product_update.model_dump(exclude_unset=True)

        if "code" in update_data and update_data["code"] != db_product.code:
            existing = self.db.query(models.Product).filter(
                models.Product.tenant_id == tenant_id,
                models.Product.code == update_data["code"],
                models.Product.id != product_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"El código de producto '{update_data['code']}' ya está en uso por otro producto.")

        for key, value in update_data.items():
            setattr(db_product, key, value)
        
        self.db.commit()
        self.db.refresh(db_product)
        return db_product

    def delete(self, tenant_id: int, product_id: int) -> dict:
        db_product = self.db.query(models.Product).filter(
            models.Product.id == product_id, 
            models.Product.tenant_id == tenant_id
        ).first()
        if not db_product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # 1. Delete images (supports R2 and MediaLibrary)
        from app.api.internal.common.models import MediaLibrary
        
        # Helper for unified deletion
        def _safe_delete(url: str):
            if not url: return
            m_item = self.db.query(MediaLibrary).filter(MediaLibrary.url == url).first()
            if m_item:
                MediaService.delete_media(self.db, m_item)
            else:
                MediaService.delete_media_by_url(self.db, url)

        if db_product.image_url:
            _safe_delete(db_product.image_url)

        if db_product.images:
            for img_path in db_product.images:
                _safe_delete(img_path)

        self.db.delete(db_product)
        self.db.commit()
        return {"message": "Product deleted"}

    async def upload_image(self, tenant_id: int, file: UploadFile) -> str:
        """Sube una imagen de producto usando el MediaService unificado."""
        import shutil
        import uuid
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            # Prefijo amigable
            clean_name = "".join(x for x in file.filename if x.isalnum() or x in "._-")
            prefix = f"prod_{os.path.splitext(clean_name)[0]}"

            media_item = MediaService.upload_media(
                db=self.db,
                local_path=temp_path,
                media_type="image",
                category="products",
                ratio="original", # A veces los productos no son 1:1 (ej: urnas altas)
                description=f"Producto {file.filename}",
                alt_text=f"Imagen {file.filename}",
                processing_mode="optimized",
                custom_prefix=prefix,
                tenant_id=tenant_id
            )
            return media_item.url
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al procesar la imagen del producto: {str(e)}")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)


class PlanService:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, tenant_id: int) -> List[models.Plan]:
        return self.db.query(models.Plan).options(
            selectinload(models.Plan.services),
            selectinload(models.Plan.products)
        ).filter(models.Plan.tenant_id == tenant_id).all()

    def get_by_id(self, tenant_id: int, plan_id: int) -> models.Plan:
        plan = self.db.query(models.Plan).options(
            selectinload(models.Plan.services),
            selectinload(models.Plan.products)
        ).filter(
            models.Plan.id == plan_id, 
            models.Plan.tenant_id == tenant_id
        ).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan no encontrado")
        return plan

    def create(self, tenant_id: int, plan_in: schemas.PlanCreate) -> models.Plan:
        existing = self.db.query(models.Plan).filter(
            models.Plan.tenant_id == tenant_id,
            models.Plan.name == plan_in.name
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"El plan '{plan_in.name}' ya existe.")

        db_plan = models.Plan(
            name=plan_in.name,
            description=plan_in.description,
            price=plan_in.price,
            cost=plan_in.cost,
            image_url=plan_in.image_url,
            is_active=plan_in.is_active,
            tenant_id=tenant_id
        )
        self.db.add(db_plan)
        self.db.commit()
        self.db.refresh(db_plan)

        # Vincular servicios
        for svc_id in plan_in.service_ids:
            svc = self.db.query(models.Service).filter(
                models.Service.id == svc_id, 
                models.Service.tenant_id == tenant_id
            ).first()
            if svc:
                self.db.add(models.PlanService(plan_id=db_plan.id, service_id=svc_id, tenant_id=tenant_id))
        
        # Vincular productos
        for prod_id in plan_in.product_ids:
            prod = self.db.query(models.Product).filter(
                models.Product.id == prod_id, 
                models.Product.tenant_id == tenant_id
            ).first()
            if prod:
                self.db.add(models.PlanProduct(plan_id=db_plan.id, product_id=prod_id, tenant_id=tenant_id))
        
        self.db.commit()
        self.db.refresh(db_plan)
        return db_plan

    def update(self, tenant_id: int, plan_id: int, plan_update: schemas.PlanUpdate) -> models.Plan:
        db_plan = self.get_by_id(tenant_id, plan_id)
        
        update_data = plan_update.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] != db_plan.name:
            existing = self.db.query(models.Plan).filter(
                models.Plan.tenant_id == tenant_id,
                models.Plan.name == update_data["name"],
                models.Plan.id != plan_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Ya existe otro plan con el nombre '{update_data['name']}'.")
        
        if "service_ids" in update_data:
            service_ids = update_data.pop("service_ids")
            self.db.query(models.PlanService).filter(
                models.PlanService.plan_id == plan_id, 
                models.PlanService.tenant_id == tenant_id
            ).delete()
            for svc_id in service_ids:
                svc = self.db.query(models.Service).filter(
                    models.Service.id == svc_id, 
                    models.Service.tenant_id == tenant_id
                ).first()
                if svc:
                    self.db.add(models.PlanService(plan_id=plan_id, service_id=svc_id, tenant_id=tenant_id))

        if "product_ids" in update_data:
            product_ids = update_data.pop("product_ids")
            self.db.query(models.PlanProduct).filter(
                models.PlanProduct.plan_id == plan_id, 
                models.PlanProduct.tenant_id == tenant_id
            ).delete()
            for prod_id in product_ids:
                prod = self.db.query(models.Product).filter(
                    models.Product.id == prod_id, 
                    models.Product.tenant_id == tenant_id
                ).first()
                if prod:
                    self.db.add(models.PlanProduct(plan_id=plan_id, product_id=prod_id, tenant_id=tenant_id))

        # Si se reemplaza/borra la imagen, eliminar el objeto anterior de R2 para
        # no acumular huérfanos (el gemelo de productos solo limpia al borrar el
        # producto; aquí lo hacemos también al reemplazar).
        if "image_url" in update_data:
            old_url = db_plan.image_url
            new_url = update_data.get("image_url")
            if old_url and old_url != new_url:
                self._delete_image_from_storage(old_url)

        for key, value in update_data.items():
            setattr(db_plan, key, value)

        self.db.commit()
        self.db.refresh(db_plan)
        return db_plan

    def _delete_image_from_storage(self, url: str):
        """Borra una imagen de plan de R2/biblioteca de medios (mismo patrón que productos)."""
        if not url:
            return
        from app.api.internal.common.models import MediaLibrary
        m_item = self.db.query(MediaLibrary).filter(MediaLibrary.url == url).first()
        if m_item:
            MediaService.delete_media(self.db, m_item)
        else:
            MediaService.delete_media_by_url(self.db, url)

    def delete(self, tenant_id: int, plan_id: int) -> dict:
        db_plan = self.get_by_id(tenant_id, plan_id)

        cremation_exists = self.db.query(models.PlanOC).filter(
            models.PlanOC.plan_id == plan_id, 
            models.PlanOC.tenant_id == tenant_id
        ).first()

        if cremation_exists:
            raise HTTPException(
                status_code=409, 
                detail="No se puede eliminar el plan porque ha sido utilizado en asignaciones de servicio (OC)."
            )
        
        # Limpiar la imagen de catálogo en R2 antes de borrar el plan.
        if db_plan.image_url:
            self._delete_image_from_storage(db_plan.image_url)

        # self.db.query(models.PlanService).filter(...) is done by cascade usually, or manual
        self.db.query(models.PlanService).filter(
            models.PlanService.plan_id == plan_id,
            models.PlanService.tenant_id == tenant_id
        ).delete()

        self.db.delete(db_plan)
        self.db.commit()
        return {"status": "deleted", "message": f"Plan {db_plan.name} eliminado correctamente"}

    async def upload_image(self, tenant_id: int, file: UploadFile) -> str:
        """Sube la imagen de catálogo de un plan (WEBP 1:1 optimizado en R2).

        Solo acepta JPG/JPEG/PNG; el MediaService recorta a 1:1, convierte a WEBP
        y optimiza el peso.
        """
        import shutil
        import uuid

        # Validación de formato: solo JPG/JPEG/PNG (luego se convierte a WEBP).
        allowed = {"image/jpeg", "image/jpg", "image/png"}
        if (file.content_type or "").lower() not in allowed:
            raise HTTPException(
                status_code=400,
                detail="Formato no permitido. Sube una imagen JPG, JPEG o PNG."
            )

        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        ext = os.path.splitext(file.filename or "")[1]
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            clean_name = "".join(x for x in (file.filename or "plan") if x.isalnum() or x in "._-")
            prefix = f"plan_{os.path.splitext(clean_name)[0]}"

            media_item = MediaService.upload_media(
                db=self.db,
                local_path=temp_path,
                media_type="image",
                category="plans",
                ratio="1:1",  # Catálogo uniforme: tarjetas cuadradas consistentes
                description=f"Plan {file.filename}",
                alt_text=f"Imagen de plan {file.filename}",
                processing_mode="optimized",
                custom_prefix=prefix,
                tenant_id=tenant_id
            )
            return media_item.url
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al procesar la imagen del plan: {str(e)}")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
