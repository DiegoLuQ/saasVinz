from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app import schemas
from app.api import deps
from app.utils.time import format_tenant_datetime
from pydantic import BaseModel
from datetime import datetime
import json
import os
import shutil
from pathlib import Path
from pathlib import Path
from app.utils.generators import generate_unique_code
from app.api.internal.common.media_service import MediaService

from app.api.internal.admin.rbac.router import check_permission

router = APIRouter()

def parse_date(date_str: str | None) -> datetime | None:
    if not date_str or not isinstance(date_str, str):
        return None
    
    # Try multiple formats
    formats = [
        "%Y-%m-%d",      # 2024-01-15
        "%d/%m/%Y",      # 15/01/2024
        "%d-%m-%Y",      # 15-01-2024
        "%Y/%m/%d",      # 2024/01/15
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
            
    # Try ISO format as last resort
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except Exception:
        pass
        
    return None

class SubmissionListItem(BaseModel):
    id: int
    owner_name: str
    pet_name: str
    pet_type: str
    region: str | None = None
    city: str | None = None
    status: str
    created_at: str

    class Config:
        from_attributes = True

@router.get("", response_model=list[SubmissionListItem])
def get_submissions(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(deps.get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "view"))
):
    submissions = db.query(models.FormSubmission).filter(
        models.FormSubmission.tenant_id == tenant_id
    ).order_by(models.FormSubmission.created_at.desc()).all()
    
    result = []
    for s in submissions:
        result.append({
            "id": s.id,
            "owner_name": s.owner_data.get("fullName", "N/A"),
            "pet_name": s.pet_data.get("name", "N/A"),
            "pet_type": s.pet_data.get("type", "N/A"),
            "region": s.owner_data.get("region"),
            "city": s.owner_data.get("commune") or s.owner_data.get("city") or s.owner_data.get("Ciudad"),
            "status": s.status,
            "created_at": format_tenant_datetime(s.created_at, db, tenant_id)
        })
    return result

@router.get("/{submission_id}")
def get_submission_detail(
    submission_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(deps.get_tenant_id)
):
    submission = db.query(models.FormSubmission).filter(
        models.FormSubmission.id == submission_id,
        models.FormSubmission.tenant_id == tenant_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    # --- AUTO-RESOLUTION LOGIC ---
    # 1. Resolver Cliente por RUT
    if not submission.customer_id:
        rut = submission.owner_data.get("rut")
        if rut:
            existing_customer = db.query(models.Customer).filter(
                models.Customer.rut == rut,
                models.Customer.tenant_id == tenant_id
            ).first()
            if existing_customer:
                submission.customer_id = existing_customer.id
                db.commit()
                print(f"Auto-resolved customer for submission {submission_id}: {existing_customer.id}")
    
    # 2. Resolver Mascota por Nombre (perteneciente al cliente)
    if submission.customer_id and not submission.pet_id:
        pet_name = submission.pet_data.get("name")
        if pet_name:
            existing_pet = db.query(models.Pet).filter(
                models.Pet.name == pet_name,
                models.Pet.customer_id == submission.customer_id,
                models.Pet.tenant_id == tenant_id
            ).first()
            if existing_pet:
                submission.pet_id = existing_pet.id
                db.commit()
                print(f"Auto-resolved pet for submission {submission_id}: {existing_pet.id}")
    # --- END AUTO-RESOLUTION ---

    # Resolve selected services
    resolved_services = []
    total = 0.0
    
    for item in (submission.selected_services or []):
        try:
            # Handle Legacy String Format
            if isinstance(item, str):
                if item.startswith("svc_"):
                    sid = int(item.split("_")[1])
                    s = db.query(models.Service).filter(models.Service.id == sid, models.Service.tenant_id == tenant_id).first()
                    if s:
                        resolved_services.append({"id": item, "name": s.name, "price": s.price, "type": "Servicio"})
                        total += (s.price or 0)
                elif item.startswith("plan_"):
                    pid = int(item.split("_")[1])
                    p = db.query(models.Plan).filter(models.Plan.id == pid, models.Plan.tenant_id == tenant_id).first()
                    if p:
                        resolved_services.append({"id": item, "name": p.name, "price": p.price, "type": "Plan"})
                        total += (p.price or 0)
                elif item.startswith("prod_"):
                    rid = int(item.split("_")[1])
                    p = db.query(models.Product).filter(models.Product.id == rid, models.Product.tenant_id == tenant_id).first()
                    if p:
                        resolved_services.append({"id": item, "name": p.name, "price": p.sale_price, "type": "Producto"})
                        total += (p.sale_price or 0)
                continue

            # Handle New Snapshot Format
            itype = item.get("type")
            if itype == "plan":
                # Add Plan Main Line
                resolved_services.append({
                    "id": item.get("id"),
                    "name": item.get("name"), 
                    "price": item.get("price"), 
                    "type": "Plan",
                    "items": item.get("items") # Pass nested items for frontend display
                })
                total += (item.get("price") or 0.0)
                
            elif itype == "service":
                resolved_services.append({
                    "id": item.get("id"),
                    "name": item.get("name"), 
                    "price": item.get("price"), 
                    "type": "Servicio"
                })
                total += (item.get("price") or 0.0)
                
            elif itype == "product":
                qty = item.get("quantity") or 1
                price = item.get("price") or 0.0
                resolved_services.append({
                    "id": item.get("id"),
                    "name": item.get("name"), 
                    "price": price * qty, # Total for line
                    "type": "Producto"
                })
                total += (price * qty)
                
        except Exception as e:
            print(f"Error resolving service {item}: {e}")
            
    # Add resolved data to response
    data = json.loads(json.dumps(submission, default=str, sort_keys=True))
    # Note: Pydantic models need to be converted to dict or use an adapter if we want to add fields
    # Here we just return a dict instead of the raw model to include the metadata
    # Resolve Partner Information
    # We store partner_id in owner_data as fallback
    partner_id = submission.owner_data.get('partner_id')
    partner_info = None
    if partner_id:
        partner_link = db.query(models.PartnerLink).filter(
            models.PartnerLink.id == partner_id,
            models.PartnerLink.tenant_id == tenant_id
        ).first()
        if partner_link and partner_link.veterinary:
            partner_info = {
                "id": partner_link.id,
                "name": partner_link.veterinary.name,
                "slug": partner_link.slug_publico
            }

    # Resolve image URLs for R2 using helper (imported at top)
    resolved_images = []
    for img in submission.images or []:
        resolved_images.append(MediaService.get_public_url(img))

    submission_dict = {
        "id": submission.id,
        "tenant_id": submission.tenant_id,
        "slug": submission.slug,
        "owner_data": submission.owner_data,
        "pet_name": submission.pet_data.get("name"), # Added for convenience
        "pet_data": submission.pet_data,
        "selected_services": submission.selected_services,
        "images": resolved_images,
        "status": submission.status,
        "created_at": format_tenant_datetime(submission.created_at, db, tenant_id),
        "resolved_services": resolved_services,
        "total": total,
        "customer_id": submission.customer_id,
        "pet_id": submission.pet_id,
        "partner": partner_info
    }
        
    return submission_dict

@router.delete("/{submission_id}")
def delete_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(deps.get_tenant_id),
    _: bool = Depends(check_permission("ordenes", "delete"))
):
    submission = db.query(models.FormSubmission).filter(
        models.FormSubmission.id == submission_id,
        models.FormSubmission.tenant_id == tenant_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
        
    db.delete(submission)
    db.commit()
    return {"status": "success"}

@router.post("/{submission_id}/create-customer")
def create_customer_from_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(deps.get_tenant_id)
):
    submission = db.query(models.FormSubmission).filter(
        models.FormSubmission.id == submission_id,
        models.FormSubmission.tenant_id == tenant_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    owner = submission.owner_data
    print(f"Creating customer for submission {submission_id}. owner_data: {owner}")
    rut = owner.get("rut")
    
    # Check if RUT already exists for this tenant (only if RUT is provided)
    if rut and str(rut).strip():
        existing = db.query(models.Customer).filter(
            models.Customer.rut == rut,
            models.Customer.tenant_id == tenant_id
        ).first()
        
        if existing:
            # Save existing ID to submission for persistence
            submission.customer_id = existing.id
            db.commit()
            return {"status": "exists", "customer_id": existing.id, "message": "El cliente ya existe"}
    
    # Map city/commune with fallback
    city = owner.get("commune") or owner.get("city") or owner.get("Ciudad")
    region = owner.get("region") or owner.get("Region") or owner.get("Región")
    
    db_customer = models.Customer(
        tenant_id=tenant_id,
        name=owner.get("fullName"),
        rut=rut,
        email=owner.get("email"),
        phone=owner.get("phone"),
        address=owner.get("address") or owner.get("Dirección"),
        region=region,
        city=city,
        country=owner.get("country") or "Chile"
    )
    db.add(db_customer)
    db.flush() # Get ID
    
    # Save to submission
    submission.customer_id = db_customer.id
    db.commit()
    
    return {"status": "created", "customer_id": db_customer.id}

@router.post("/{submission_id}/create-pet")
def create_pet_from_submission(
    submission_id: int,
    customer_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(deps.get_tenant_id)
):
    try:
        submission = db.query(models.FormSubmission).filter(
            models.FormSubmission.id == submission_id,
            models.FormSubmission.tenant_id == tenant_id
        ).first()
        
        if not submission:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        
        pet_data = submission.pet_data
        
        # Process Images - Move and Sanitize Filenames
        image_urls = []
        if submission.images:
            target_dir = f"app/static/tenants/{tenant_id}/uploads/pets"
            os.makedirs(target_dir, exist_ok=True)
            
            import unicodedata
            def sanitize_filename(name):
                # Normalizar y quitar acentos/caracteres especiales
                n = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
                # Quitar comas y otros problematicos
                return "".join(c for c in n if c.isalnum() or c in ('.', '_', '-')).strip()

            for img_path in submission.images:
                try:
                    source_file = Path("app/static/storage") / img_path
                    if source_file.exists():
                        filename = source_file.name
                        # Sanitize filename to avoid accent/special char issues in URLs
                        clean_filename = sanitize_filename(filename)
                        new_filename = f"pet_{submission_id}_{clean_filename}"
                        dest_file = Path(target_dir) / new_filename
                        
                        # Use copy2 then remove for cross-volume safety on Windows
                        shutil.copy2(str(source_file), str(dest_file))
                        # DO NOT remove source file here, it will be cleaned up when the submission is finalized
                        # os.remove(str(source_file))
                        
                        image_urls.append(f"/static/tenants/{tenant_id}/uploads/pets/{new_filename}")
                except Exception as e:
                    print(f"Error processing image {img_path}: {e}")

        # Safer age conversion
        try:
            raw_age = pet_data.get("age", 0)
            # Remove "años" if present and convert to int
            if isinstance(raw_age, str):
                age_val = "".join(filter(str.isdigit, raw_age))
                age = int(age_val) if age_val else 0
            else:
                age = int(raw_age or 0)
        except:
            age = 0

        # Safer date conversion using helper
        birth_date = parse_date(pet_data.get("birthDate") or pet_data.get("birth_date"))
        death_date = parse_date(pet_data.get("deathDate") or pet_data.get("death_date"))

        # Species mapping for legacy/human-readable values
        species_map = {
            "perro": "canino",
            "canino": "canino",
            "gato": "felino",
            "felino": "felino",
            "ave": "ave",
            "mamífero pequeño": "mamifero",
            "reptil / anfibio": "reptil",
            "exótico": "exotico",
            "exotico": "exotico",
            "exótico / otro": "exotico",
            "otro": "otro",
            "conejo": "exotico"
        }
        
        raw_type = pet_data.get("type", "canino").lower()
        species = species_map.get(raw_type, raw_type) # Fallback to raw_type if not mapped

        db_pet = models.Pet(
            tenant_id=tenant_id,
            customer_id=customer_id,
            name=pet_data.get("name", "Mascota S/N"),
            species=species,
            breed=pet_data.get("breed", "N/A"),
            size=pet_data.get("size"), # pequeño, mediano, normal, grande, muy grande
            age=age,
            birth_date=birth_date,
            death_date=death_date,
            image_url=image_urls[0] if image_urls else None,
            images=image_urls,
            status="received"
        )
        db.add(db_pet)
        db.flush() # Get ID
        
        # Save to submission
        submission.pet_id = db_pet.id
        db.commit()
        
        return {"status": "created", "pet_id": db_pet.id}
    except Exception as e:
        print(f"🚨 EXCEPTION in create_pet: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{submission_id}/create-services")
def create_services_from_submission(
    submission_id: int,
    pet_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(deps.get_tenant_id)
):
    try:
        submission = db.query(models.FormSubmission).filter(
            models.FormSubmission.id == submission_id,
            models.FormSubmission.tenant_id == tenant_id
        ).first()
        
        if not submission:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        
        pet = db.query(models.Pet).get(pet_id)
        if not pet:
            raise HTTPException(status_code=404, detail="Mascota no encontrada")

        # Check if there is already a cremation for this pet
        existing_cremation = db.query(models.Cremation).filter(models.Cremation.pet_id == pet_id).first()
        if existing_cremation:
            return {"status": "exists", "cremation_id": existing_cremation.id, "message": "Ya se ha creado un servicio para esta mascota"}

        # Resolve details and calculate total
        resolved_plans = []
        resolved_services = []
        resolved_products = []
        total_price = 0.0
        total_cost = 0.0
        plan_name = "Servicio Solicitado"
        
        selected_items = submission.selected_services or []
        print(f"Resolving services for submission {submission_id}. items count: {len(selected_items)}")
        
        for item in selected_items:
            try:
                # Handle Legacy String Format (just in case)
                if isinstance(item, str):
                    print(f"Legacy item string found: {item}, skipping enrichment usage")
                    if item.startswith("plan_"):
                        pid = int(item.split("_")[1])
                        p = db.query(models.Plan).filter(models.Plan.id == pid, models.Plan.tenant_id == tenant_id).first()
                        if p:
                            resolved_plans.append({
                                "id": p.id,
                                "price": p.price or 0.0,
                                "cost": p.cost or 0.0,
                                "items": [] # Legacy doesn't have snapshot items
                            })
                            plan_name = p.name
                            total_price += (p.price or 0.0)
                            total_cost += (p.cost or 0.0)
                    elif item.startswith("svc_"):
                        sid = int(item.split("_")[1])
                        s = db.query(models.Service).filter(models.Service.id == sid, models.Service.tenant_id == tenant_id).first()
                        if s:
                            resolved_services.append({
                                "id": s.id,
                                "price": s.price or 0.0,
                                "cost": s.cost or 0.0
                            })
                            total_price += (s.price or 0.0)
                            total_cost += (s.cost or 0.0)
                    elif item.startswith("prod_"):
                        rid = int(item.split("_")[1])
                        p = db.query(models.Product).filter(models.Product.id == rid, models.Product.tenant_id == tenant_id).first()
                        if p:
                            resolved_products.append({
                                "id": p.id,
                                "price": p.sale_price or 0.0,
                                "cost": p.cost_price or 0.0,
                                "qty": 1
                            })
                            total_price += (p.sale_price or 0.0)
                            total_cost += (p.cost_price or 0.0)
                    continue

                # Handle New Object Format (Snapshot)
                # item is a dict: { type, id, price, cost, items, etc }
                itype = item.get("type")
                
                if itype == "plan":
                    plan_name = item.get("name") or "Plan"
                    p_price = float(item.get("price") or 0.0)
                    p_cost = float(item.get("cost") or 0.0)
                    
                    resolved_plans.append({
                        "id": item.get("id"),
                        "price": p_price,
                        "cost": p_cost,
                        "items": item.get("items") or [] # Pass nested items for stock processing
                    })
                    total_price += p_price
                    total_cost += p_cost
                    
                elif itype == "service":
                    s_price = float(item.get("price") or 0.0)
                    s_cost = float(item.get("cost") or 0.0)
                    resolved_services.append({
                        "id": item.get("id"),
                        "price": s_price,
                        "cost": s_cost
                    })
                    total_price += s_price
                    total_cost += s_cost
                    
                elif itype == "product":
                    pr_price = float(item.get("price") or 0.0)
                    pr_cost = float(item.get("cost") or 0.0)
                    qty = int(item.get("quantity") or 1)
                    resolved_products.append({
                        "id": item.get("id"),
                        "price": pr_price,
                        "cost": pr_cost,
                        "qty": qty
                    })
                    total_price += (pr_price * qty)
                    total_cost += (pr_cost * qty)

            except Exception as e:
                print(f"Error resolving item {item}: {e}")

        # Create Cremation record with full details
        owner = submission.owner_data
        # Map city/commune with fallback
        city = owner.get("commune") or owner.get("city") or owner.get("Ciudad")
        region = owner.get("region") or owner.get("Region") or owner.get("Región")
        
        # Generar Número de OC correlativo por tenant
        from sqlalchemy import func
        last_oc = db.query(func.max(models.CremationOC.oc_number)).filter(
            models.CremationOC.tenant_id == tenant_id
        ).scalar() or 0
        
        # 1. Main Table (Core only)
        db_cremation = models.CremationOC(
            tenant_id=tenant_id,
            pet_id=pet_id,
            oc_number=last_oc + 1,
            status="pendiente", # Use lowercase to match frontend colors/labels
            cremation_type="Individual", # Default/Fallback
            partner_link_id=submission.owner_data.get('partner_id'),
            verification_code=generate_unique_code()
        )
        db.add(db_cremation)
        db.flush() # Get ID
        
        # 2. Partitioned: Logistics
        db.add(models.CremationLogistics(
            cremation_id=db_cremation.id,
            tenant_id=tenant_id,
            region=region,
            city=city,
            address=owner.get("address") or owner.get("Dirección")
        ))
        
        # 3. Partitioned: Financial
        db.add(models.CremationFinancial(
            cremation_id=db_cremation.id,
            tenant_id=tenant_id,
            total_price=total_price,
            total_cost=total_cost,
            discount=0.0
        ))
        
        # 4. Partitioned: Details
        pickup_loc = (owner.get("veterinary") or "").strip()
        if not pickup_loc:
            pickup_loc = "PARTICULAR_SIN_CONVENIO"
            
        db.add(models.CremationDetails(
            cremation_id=db_cremation.id,
            tenant_id=tenant_id,
            images=pet.images or [],
            notes=f"Generado desde formulario público. Plan: {plan_name}. [RETIRO: {pickup_loc}]",
            service_code=owner.get("service_code"),
            tracking_token=submission.code
        ))
        
        # 5. Partitioned: Scheduling
        db.add(models.CremationScheduling(
            cremation_id=db_cremation.id,
            tenant_id=tenant_id
        ))
        
        # 1. Procesar Planes
        # 1. Procesar Planes
        # 1. Procesar Planes
        for p in resolved_plans:
            db_plan_oc = models.PlanOC(
                tenant_id=tenant_id,
                cremation_id=db_cremation.id,
                plan_id=p["id"],
                cantidad=1,
                precio_costo=p["cost"],
                precio_venta=p["price"]
            )
            db.add(db_plan_oc)
            
            # Process nested items for stock deduction
            # The snapshot contains "items" list with all services and products included
            if "items" in p and isinstance(p["items"], list):
                for sub in p["items"]:
                    if sub.get("type") == "product":
                        # Find product to deduct stock
                        sub_orig_id = sub.get("origin_id") or sub.get("id")
                        if sub_orig_id:
                            prod_db = db.query(models.Product).filter(
                                models.Product.id == sub_orig_id, 
                                models.Product.tenant_id == tenant_id
                            ).first()
                            
                            if prod_db:
                                qty_sub = int(sub.get("quantity") or 1)
                                prod_db.stock -= qty_sub
                                if prod_db.stock <= 0:
                                    prod_db.availability_status = "Agotado"
                                # Note: We don't create ProductoOC for these nested items as they are part of the PlanOC package
                                # unless the business logic changes to require exploded BOM in the table.
                                # Current instruction is just "descuento de stock".

        # 2. Procesar Servicios
        for s in resolved_services:
            db_serv_oc = models.ServicioOC(
                tenant_id=tenant_id,
                cremation_id=db_cremation.id,
                service_id=s["id"],
                cantidad=1,
                precio_costo=s["cost"],
                precio_venta=s["price"]
            )
            db.add(db_serv_oc)

        # 3. Procesar Productos (con descuento de stock)
        for p in resolved_products:
            # Re-fetch product only to manage STOCK (snapshot didn't hold the lock/current stock)
            db_product = db.query(models.Product).filter(
                models.Product.id == p["id"], 
                models.Product.tenant_id == tenant_id
            ).first()
            
            p_cost = p["cost"] # Use snapshot cost by default
            
            if db_product:
                # Deduct stock
                db_product.stock -= p["qty"]
                if db_product.stock <= 0:
                    db_product.availability_status = "Agotado"
                
                # If snapshot cost was 0, maybe try to fetch current? Or stick to 0?
                # User said: "todos estos con el precio costo y venta... ya que se cobra por plan"
                # So we respect the snapshot primarily.
            
            db_assoc = models.ProductoOC(
                tenant_id=tenant_id,
                cremation_id=db_cremation.id,
                product_id=p["id"],
                cantidad=p["qty"],
                precio_costo=p_cost,
                precio_venta=p["price"]
            )
            db.add(db_assoc)
                
        # Cleanup physical files from storage folder
        try:
            submission_dir = Path("app/static/storage") / (submission.slug or f"tenant_{tenant_id}") / "submissions" / str(submission.id)
            if submission_dir.exists():
                shutil.rmtree(submission_dir)
        except Exception as e:
            print(f"Error cleaning up submission folder: {e}")

        # Delete the submission record as it's no longer needed
        db.delete(submission)
        db.commit()
        
        return {"status": "created", "cremation_id": db_cremation.id}
    except Exception as e:
        print(f"🚨 EXCEPTION in create_services: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
