from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.auth import get_current_creator
from datetime import datetime
from app.utils import tz

router = APIRouter()

@router.get("/landing-config", response_model=schemas.LandingConfig)
def get_landing_config(
    key: str = "main_landing",
    db: Session = Depends(get_db)
):
    config = db.query(models.LandingConfig).filter(models.LandingConfig.key == key).first()
    
    # Query system subscription plans to return them dynamically
    plans_list = []
    try:
        sys_plans = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.is_active == True).order_by(models.SubscriptionPlan.display_order.asc()).all()
        for p in sys_plans:
            plans_list.append({
                "id": p.id,
                "name": p.name,
                "price": p.price,
                "annual_price": p.annual_price,
                "max_pets": p.max_pets,
                "max_services": p.max_services,
                "max_plans": p.max_plans,
                "max_products": p.max_products,
                "max_orders": p.max_orders,
                "max_customers": p.max_customers,
                "max_users": p.max_users,
                "max_partners": p.max_partners,
                "allowed_modules": p.allowed_modules or [],
                "features": p.features or [],
                "description": p.description
            })
    except Exception as e:
        print(f"Error fetching sys_plans: {e}")

    if not config:
        # Return default structure if not found
        default_config = {
            "seo": {"title": "SaaS Crematorio", "description": "Gestión integral para crematorios"},
            "hero": {"h1": "Dignidad y Control", "h2": "en cada proceso.", "subtitle": "Transforma la gestión de tu crematorio."},
            "theme": "default", # default, warm
            "plans": [],
            "features": []
        }
        config = models.LandingConfig(key=key, config=default_config, id=0, updated_at=tz.get_now())
    
    # Inject system plans and saas_whatsapp dynamically
    if isinstance(config.config, dict):
        # Create a copy to avoid mutating session-attached objects unexpectedly
        config_copy = dict(config.config)
        config_copy["system_plans"] = plans_list
        # Query SaaSConfig for corporate whatsapp number
        saas_config = db.query(models.SaaSConfig).first()
        config_copy["saas_whatsapp"] = saas_config.whatsapp if saas_config else None
        config.config = config_copy
    return config

@router.put("/landing-config", response_model=schemas.LandingConfig)
def update_landing_config(
    config_in: schemas.LandingConfigCreate,
    key: str = "main_landing",
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(get_current_creator)
):
    config = db.query(models.LandingConfig).filter(models.LandingConfig.key == key).first()
    if config:
        config.config = config_in.config
        config.updated_at = tz.get_now()
    else:
        config = models.LandingConfig(key=key, config=config_in.config)
        db.add(config)
    
    db.commit()
    db.refresh(config)
    return config


@router.get("/platform-info")
def get_platform_info(db: Session = Depends(get_db)):
    """Datos públicos de la plataforma Vinzer (Configuración global del admin) para
    las pantallas de inicio de sesión: nombre, eslogan, logo y canales de contacto.
    Sin RUT ni dirección."""
    cfg = db.query(models.SaaSConfig).first()
    if not cfg:
        return {"name": "Vinzer", "eslogan": None, "logo": None, "whatsapp": None, "correo": None, "redes_sociales": []}
    redes = cfg.redes_sociales if isinstance(cfg.redes_sociales, list) else []
    return {
        "name": cfg.name or "Vinzer",
        "eslogan": cfg.eslogan,
        "logo": cfg.logo,
        "whatsapp": cfg.whatsapp,
        "correo": cfg.correo,
        "redes_sociales": [
            {"name": r.get("name"), "link": r.get("link")}
            for r in redes if isinstance(r, dict) and r.get("link")
        ],
    }
