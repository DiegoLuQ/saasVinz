from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, or_
from app.database import get_db
from app import models
from app import schemas
from app import auth
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.utils import tz

router = APIRouter()

from fastapi.security import OAuth2PasswordRequestForm

from app.core.rate_limiter import limiter
from app.core.config import settings

@router.post("/login", response_model=schemas.Token)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login_for_access_token(
    request: Request, # Request object is required for SlowAPI
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # En OAuth2PasswordRequestForm, 'username' es el campo para el email
    user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    if not user:
        # Hash dummy para igualar el tiempo de respuesta cuando el email no
        # existe: sin esto, la diferencia de timing (pbkdf2 solo se ejecuta si
        # hay usuario) permite enumerar emails registrados.
        auth.pwd_context.dummy_verify()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id) if user.tenant_id is not None else None,
        "role": user.role,
        "ver": user.token_version,
    }
    access_token = auth.create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    # S-01/S-02: la sesión vive en cookies httpOnly (viajan por el proxy de
    # Next). El body mantiene el token por compatibilidad (scripts, OAuth2
    # password flow de /docs).
    refresh_token = auth.create_refresh_token(db, user, request)
    auth.set_auth_cookies(response, access_token, refresh_token)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/refresh", response_model=schemas.Token)
@limiter.limit("20/minute")
def refresh_session(
    request: Request, # Request object is required for SlowAPI
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Rota el refresh token (cookie saasc_refresh) y emite un access token
    nuevo. El frontend lo invoca automáticamente ante un 401.
    """
    raw_refresh = request.cookies.get(auth.REFRESH_COOKIE_NAME)
    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o token inválido.",
        )
    user, new_refresh = auth.rotate_refresh_token(db, raw_refresh, request)

    access_token = auth.create_access_token(
        data={
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id) if user.tenant_id is not None else None,
            "role": user.role,
            "ver": user.token_version,
        },
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    auth.set_auth_cookies(response, access_token, new_refresh)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Revoca el refresh token activo y limpia las cookies de sesión.
    No exige access token válido: un logout siempre debe poder completarse.
    """
    raw_refresh = request.cookies.get(auth.REFRESH_COOKIE_NAME)
    if raw_refresh:
        db_token = db.query(models.RefreshToken).filter(
            models.RefreshToken.token_hash == auth._hash_refresh_token(raw_refresh),
            models.RefreshToken.revoked_at.is_(None),
        ).first()
        if db_token:
            db_token.revoked_at = tz.get_now()
            db.commit()
    auth.clear_auth_cookies(response)
    return {"detail": "Sesión cerrada"}

class AdminCredentials(BaseModel):
    admin_name: str
    admin_password: str


@router.post("/register-tenant", response_model=schemas.TenantInDB)
def register_tenant(
    tenant_in: schemas.TenantCreate,
    credentials: AdminCredentials,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_creator)
):
    """
    Crea un tenant + su usuario admin inicial.

    Restringido a SuperAdmin (creator). Las credenciales del admin viajan en el
    body (nunca como query param, para no filtrarlas a los logs de acceso).
    """
    # Validar unicidad de email antes de crear (evita 500 por constraint y duplicados)
    if tenant_in.email:
        existing = db.query(models.User).filter(models.User.email == tenant_in.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado.")

    # 1. Create Tenant
    db_tenant = models.Tenant(
        name=tenant_in.name,
        rut=tenant_in.rut,
        email=tenant_in.email,
        phone=tenant_in.phone
    )
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)

    # 2. Create Admin User for this Tenant
    hashed_password = auth.get_password_hash(credentials.admin_password)
    db_user = models.User(
        tenant_id=db_tenant.id,
        name=credentials.admin_name,
        email=tenant_in.email, # Using tenant email as admin email for simplicity initially
        password_hash=hashed_password,
        role=models.UserRole.admin
    )
    db.add(db_user)
    db.commit()

    return db_tenant
@router.get("/me", response_model=schemas.UserInDB)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.get("/bootstrap", response_model=schemas.BootstrapResponse)
def get_bootstrap(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Consolidated bootstrap endpoint that returns all initialization data in a single request.
    Replaces multiple calls to /me, /tenants/me, /rbac/modules, /notifications.
    
    Performance: ~60% reduction in latency, 75% fewer database queries.
    """
    from sqlalchemy.orm import selectinload
    
    # Optimized query with eager loading
    user = db.query(models.User).options(
        selectinload(models.User.tenant).options(
            selectinload(models.Tenant.subscription_plan),
            selectinload(models.Tenant.billing_info)
        )
    ).filter(models.User.id == current_user.id).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"Usuario (ID: {current_user.id}) no encontrado en la base de datos actual."
        )

    if not user.tenant:
        raise HTTPException(
            status_code=404,
            detail=f"Empresa (Tenant ID: {user.tenant_id}) no encontrada para el usuario {user.email}."
        )

    # Set RLS context so INSERTs (ThemeConfig, permissions) are allowed
    from app.core.tenant_context import apply_tenant_rls
    apply_tenant_rls(db, user.tenant_id)

    # Get RBAC permissions
    permissions = db.query(models.UserModulePermission).filter(
        models.UserModulePermission.user_id == user.id
    ).all()
    
    # If no permissions exist, initialize them
    if not permissions:
        tenant_configs = db.query(models.TenantModuleConfig).filter(
            models.TenantModuleConfig.tenant_id == user.tenant_id,
            models.TenantModuleConfig.role == user.role,
            models.TenantModuleConfig.is_active == True
        ).all()
        
        # --- Lógica de Auto-recuperación (Self-healing) ---
        if not tenant_configs:
            # 1. Identificar módulos permitidos por plan
            base_modules = ["dashboard", "perfil", "configuracion"]
            allowed_modules = list(base_modules)
            _eff_plan = user.tenant.effective_plan
            if _eff_plan and _eff_plan.allowed_modules:
                allowed_modules.extend(_eff_plan.allowed_modules)
            
            # 2. Crear configuración por defecto para el tenant (solo si es Admin, los otros roles vendrán después o se heredarán)
            all_modules = db.query(models.Module).all()
            for m in all_modules:
                is_active = m.key in allowed_modules
                new_cfg = models.TenantModuleConfig(
                    tenant_id=user.tenant_id,
                    role=user.role,
                    module_key=m.key,
                    is_active=is_active
                )
                db.add(new_cfg)
            db.commit()
            
            # 3. Recargar configs recién creadas
            tenant_configs = db.query(models.TenantModuleConfig).filter(
                models.TenantModuleConfig.tenant_id == user.tenant_id,
                models.TenantModuleConfig.role == user.role,
                models.TenantModuleConfig.is_active == True
            ).all()

        for cfg in tenant_configs:
            is_admin = user.role == models.UserRole.admin
            key = cfg.module_key
            if key == "pets": key = "mascotas"
            if key == "customers": key = "clientes"
            
            new_perm = models.UserModulePermission(
                user_id=user.id,
                module_key=key,
                is_active=True,
                actions={"view": True, "create": True, "edit": True, "delete": is_admin}
            )
            db.add(new_perm)
        
        db.commit()
        permissions = db.query(models.UserModulePermission).filter(
            models.UserModulePermission.user_id == user.id
        ).all()
    
    # 4. Get Theme Config
    theme_config = db.query(models.ThemeConfig).filter(
        models.ThemeConfig.tenant_id == user.tenant_id
    ).first()
    
    if not theme_config:
        theme_config = models.ThemeConfig(
            tenant_id=user.tenant_id,
            theme_mode="auto",
            auto_light_start="06:00",
            auto_light_end="18:00"
        )
        db.add(theme_config)
        db.flush()  # Persist to DB without ending transaction (avoids RLS refresh issue)
    
    # 5. Get Active Announcements
    announcements_query = db.query(models.TenantAnnouncement).filter(
        models.TenantAnnouncement.is_active == True,
        (models.TenantAnnouncement.tenant_id == user.tenant_id) | (models.TenantAnnouncement.tenant_id == None)
    )
    all_announcements = announcements_query.all()
    
    viewed_ids = [v.announcement_id for v in db.query(models.UserAnnouncementView).filter(
        models.UserAnnouncementView.user_id == user.id
    ).all()]
    
    active_announcements = [
        a for a in all_announcements 
        if not a.show_once or a.id not in viewed_ids
    ]
    active_announcements.sort(key=lambda x: x.priority, reverse=True)
    
    # 6. Get Notifications (Latest 5 unread)
    notifications = db.query(models.Notification).filter(
        models.Notification.tenant_id == user.tenant_id,
        models.Notification.is_read == False
    ).order_by(models.Notification.created_at.desc()).limit(20).all()

    # 7. Get Pending Submissions (Latest 10)
    submissions = db.query(models.FormSubmission).filter(
        models.FormSubmission.tenant_id == user.tenant_id
    ).order_by(models.FormSubmission.created_at.desc()).limit(10).all()

    formatted_submissions = []
    for s in submissions:
        formatted_submissions.append(schemas.SubmissionListItem(
            id=s.id,
            owner_name=s.owner_data.get("fullName", "N/A") if s.owner_data else "N/A",
            pet_name=s.pet_data.get("name", "N/A") if s.pet_data else "N/A",
            pet_type=s.pet_data.get("type", "N/A") if s.pet_data else "N/A",
            region=s.owner_data.get("region") if s.owner_data else None,
            city=(s.owner_data.get("commune") or s.owner_data.get("city") or s.owner_data.get("Ciudad")) if s.owner_data else None,
            status=s.status,
            created_at=s.created_at
        ))

    # 8. Dashboard Summary Logic
    today = tz.get_now().date()
    start_of_month = today.replace(day=1)
    tenant_id = user.tenant_id

    # Usage counts
    monthly_pets = db.query(models.Pet).filter(models.Pet.tenant_id == tenant_id, models.Pet.created_at >= start_of_month).count()
    monthly_customers = db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id, models.Customer.created_at >= start_of_month).count()
    
    # Query for all monthly orders created in the current month
    monthly_orders = db.query(models.CremationOC).filter(
        models.CremationOC.tenant_id == tenant_id, 
        models.CremationOC.created_at >= start_of_month
    ).count()
    total_services = db.query(models.Service).filter(models.Service.tenant_id == tenant_id).count()
    total_products = db.query(models.Product).filter(models.Product.tenant_id == tenant_id).count()
    total_plans = db.query(models.Plan).filter(models.Plan.tenant_id == tenant_id).count()
    total_users_total = db.query(models.User).filter(models.User.tenant_id == tenant_id).count()
    total_partners = db.query(models.PartnerLink).filter(models.PartnerLink.tenant_id == tenant_id, models.PartnerLink.status == 'active').count()

    # Current stats
    total_customers_total = db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id).count()
    total_pets_total = db.query(models.Pet).filter(models.Pet.tenant_id == tenant_id).count()
    total_orders_completed = db.query(models.CremationOC).filter(models.CremationOC.tenant_id == tenant_id, models.CremationOC.status == 'completado').count()
    
    from sqlalchemy import or_, and_
    monthly_cremations_query = db.query(models.CremationOC).join(
        models.CremationScheduling, models.CremationOC.id == models.CremationScheduling.cremation_id
    ).options(
        joinedload(models.CremationOC.financial),
        joinedload(models.CremationOC.servicios).joinedload(models.ServicioOC.service),
        joinedload(models.CremationOC.planes).joinedload(models.PlanOC.plan),
        joinedload(models.CremationOC.productos)
    ).filter(
        models.CremationOC.tenant_id == tenant_id,
        models.CremationOC.status.in_(['completado', 'completed', 'entregado', 'delivered']),
        or_(
            models.CremationScheduling.completed_at >= start_of_month,
            and_(
                models.CremationScheduling.completed_at == None,
                models.CremationOC.created_at >= start_of_month
            )
        )
    )
    cremations_this_month = monthly_cremations_query.count()

    monthly_revenue = 0
    for cremation in monthly_cremations_query.all():
        if cremation.financial and cremation.financial.total_price and cremation.financial.total_price > 0:
            monthly_revenue += cremation.financial.total_price
        else:
            revenue_from_services = sum(s.precio_venta for s in cremation.servicios) if cremation.servicios else 0
            revenue_from_plans = sum(p.precio_venta for p in cremation.planes) if cremation.planes else 0
            revenue_from_products = sum(pr.precio_venta for pr in cremation.productos) if cremation.productos else 0
            monthly_revenue += (revenue_from_services + revenue_from_plans + revenue_from_products)

    # Pending Revenue Calculation
    pending_cremations_query = db.query(models.CremationOC).options(
        joinedload(models.CremationOC.financial),
        joinedload(models.CremationOC.servicios).joinedload(models.ServicioOC.service),
        joinedload(models.CremationOC.planes).joinedload(models.PlanOC.plan),
        joinedload(models.CremationOC.productos)
    ).filter(
        models.CremationOC.tenant_id == tenant_id,
        models.CremationOC.status.notin_(['completado', 'completed', 'entregado', 'delivered', 'rejected', 'rechazado', 'rechazado_por_cliente'])
    )
    
    pending_revenue = 0
    for cremation in pending_cremations_query.all():
        if cremation.financial and cremation.financial.total_price and cremation.financial.total_price > 0:
            pending_revenue += cremation.financial.total_price
        else:
            revenue_from_services = sum(s.precio_venta for s in cremation.servicios) if cremation.servicios else 0
            revenue_from_plans = sum(p.precio_venta for p in cremation.planes) if cremation.planes else 0
            revenue_from_products = sum(pr.precio_venta for pr in cremation.productos) if cremation.productos else 0
            pending_revenue += (revenue_from_services + revenue_from_plans + revenue_from_products)

    # Recent Activity (Latest 5 pending or processing cremations)
    recent_cremations = db.query(models.CremationOC).options(
        joinedload(models.CremationOC.scheduling),
        joinedload(models.CremationOC.financial),
        joinedload(models.CremationOC.servicios).joinedload(models.ServicioOC.service),
        joinedload(models.CremationOC.planes).joinedload(models.PlanOC.plan),
        joinedload(models.CremationOC.technical).joinedload(models.CremationTechnical.step),
        selectinload(models.CremationOC.pet).selectinload(models.Pet.customer)
    ).filter(
        models.CremationOC.tenant_id == tenant_id,
        models.CremationOC.status.in_(['pendiente', 'en_proceso', 'pending', 'processing', 'entregado', 'delivered'])
    ).order_by(models.CremationOC.id.desc()).limit(5).all()

    formatted_recent = []
    for c in recent_cremations:
        pet = c.pet
        main_service_name = "Servicio"
        if c.servicios:
            main_service_name = c.servicios[0].service.name if c.servicios[0].service else "Servicio"
        elif c.planes:
            main_service_name = c.planes[0].plan.name if c.planes[0].plan else "Plan de Cremación"
            
        customer = pet.customer if pet else None
        
        tech = c.technical
        formatted_recent.append(schemas.DashboardRecentActivity(
            id=c.id,
            pet=pet.name if pet else "Desconocida",
            pet_image=(pet.images[0] if pet.images else None) if pet else None,
            client=customer.name if customer else "Desconocido",
            service_name=main_service_name,
            amount=c.financial.total_price if c.financial else 0.0,
            status=c.status,
            step_name=tech.step.name if tech and tech.step else None,
            time=c.scheduling.scheduled_at.strftime("%H:%M") if c.scheduling and c.scheduling.scheduled_at else (tech.start_at.strftime("%H:%M") if tech and tech.start_at else "N/A")
        ))

    plan = user.tenant.effective_plan

    dashboard_summary = schemas.DashboardSummarySchema(
        stats=schemas.DashboardStatData(
            total_customers=total_customers_total,
            total_pets=total_pets_total,
            total_orders=total_orders_completed,
            total_services=total_services,
            total_users=total_users_total,
            cremations_this_month=cremations_this_month,
            monthly_revenue=monthly_revenue,
            pending_revenue=pending_revenue
        ),
        limits=schemas.DashboardLimitsData(
            pets=schemas.DashboardLimitItem(usage=monthly_pets, max=plan.max_pets if plan else 0),
            customers=schemas.DashboardLimitItem(usage=monthly_customers, max=plan.max_customers if plan else 0),
            orders=schemas.DashboardLimitItem(usage=monthly_orders, max=plan.max_orders if plan else 0),
            services=schemas.DashboardLimitItem(usage=total_services, max=plan.max_services if plan else 0),
            products=schemas.DashboardLimitItem(usage=total_products, max=plan.max_products if plan else 0),
            plans=schemas.DashboardLimitItem(usage=total_plans, max=plan.max_plans if plan else 0),
            partners=schemas.DashboardLimitItem(usage=total_partners, max=plan.max_partners if plan else 0),
            users=schemas.DashboardLimitItem(usage=total_users_total, max=plan.max_users if plan else 0)
        ),
        recent_cremations=formatted_recent
    )

    unread_count = db.query(models.Notification).filter(
        models.Notification.tenant_id == user.tenant_id,
        models.Notification.is_read == False
    ).count()

    # 9. Get Templates
    # Incluye las plantillas propias del tenant + las GLOBALES del sistema
    # (tenant_id IS NULL, creadas desde el admin). RLS lo permite vía la política
    # farewell_global_read_policy (migración 010).
    farewell_templates = db.query(models.FarewellTemplate).filter(
        or_(
            models.FarewellTemplate.tenant_id == user.tenant_id,
            models.FarewellTemplate.tenant_id.is_(None),
        )
    ).all()
    
    document_templates = db.query(models.CertificateTemplate).filter(
        or_(
            models.CertificateTemplate.tenant_id == user.tenant_id,
            models.CertificateTemplate.tenant_id.is_(None),
        )
    ).all()

    # 10. Get Catalog (Services & Plans)
    from sqlalchemy.orm import selectinload
    services_list = db.query(models.Service).filter(
        models.Service.tenant_id == user.tenant_id,
        models.Service.is_active == True
    ).all()
    
    plans_list = db.query(models.Plan).options(
        selectinload(models.Plan.services)
    ).filter(
        models.Plan.tenant_id == user.tenant_id,
        models.Plan.is_active == True
    ).all()

    # 11. Get Inventory Catalogs (Categories & Providers)
    product_categories = db.query(models.Category).filter(
        models.Category.tenant_id == user.tenant_id
    ).all()
    
    product_providers = db.query(models.Provider).filter(
        models.Provider.tenant_id == user.tenant_id
    ).all()

    # 12. Get Operations Workflow Steps
    operation_steps = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.tenant_id == user.tenant_id,
        models.WorkflowStep.is_active == True
    ).order_by(models.WorkflowStep.order_index).all()

    # --- Dynamic Plan-to-Permission Sync (capa de plan + capa de rol/blueprint) ---
    # 1. Universo de módulos del plan efectivo (techo del tenant)
    allowed_plan_modules = user.tenant.effective_plan.allowed_modules if user.tenant.effective_plan else []
    base_required = ["dashboard", "perfil"]
    master_keys = list(set(allowed_plan_modules + base_required))

    # 2. Capa de ROL (blueprint global). Si el rol TIENE blueprint definido es
    #    autoritativo: los módulos fuera de él quedan sin acceso para ese rol,
    #    aunque el plan los permita o existan permisos por-usuario obsoletos.
    #    Admin y creator quedan exentos (mantienen todo lo que el plan permita).
    role_is_privileged = user.role in (models.UserRole.admin, models.UserRole.creator)
    role_blueprint = (
        [] if role_is_privileged
        else db.query(models.RoleModuleBlueprint).filter(
            models.RoleModuleBlueprint.role == user.role
        ).all()
    )
    role_allowed_keys = None  # None => sin restricción de rol (comportamiento previo)
    mandatory_keys = set()
    if role_blueprint:
        mandatory_keys = {b.module_key for b in role_blueprint if b.is_mandatory}
        # Solo 'perfil' es base siempre-permitido; 'dashboard' es controlable por
        # rol (debe estar en el blueprint del rol para quedar habilitado).
        role_allowed_keys = {b.module_key for b in role_blueprint} | {"perfil"}

    # 3. Capa de TENANT: el admin del tenant puede apagar opcionales (no los
    #    mandatorios). Un opcional sin configuración del tenant queda VISIBLE
    #    por defecto. Solo aplica cuando el rol tiene blueprint autoritativo.
    tenant_disabled = set()
    if role_allowed_keys is not None:
        for c in db.query(models.TenantModuleConfig).filter(
            models.TenantModuleConfig.tenant_id == user.tenant_id,
            models.TenantModuleConfig.role == user.role,
        ).all():
            if not c.is_active and c.module_key not in mandatory_keys:
                tenant_disabled.add(c.module_key)

    # 4. Map de permisos por-usuario para overrides granulares
    existing_perms_map = {p.module_key: p for p in permissions}

    # 5. Construir lista final de permisos efectivos
    final_rbac_permissions = []
    for m_key in master_keys:
        role_denies = role_allowed_keys is not None and m_key not in role_allowed_keys

        if role_denies:
            # Sin acceso por rol: forzar inactivo (ignora cualquier permiso
            # por-usuario heredado/obsoleto que otorgara el módulo).
            actions = (
                existing_perms_map[m_key].actions
                if m_key in existing_perms_map
                else {"view": True, "create": True, "edit": True, "delete": True}
            )
            final_rbac_permissions.append(
                models.UserModulePermission(
                    user_id=user.id, module_key=m_key, is_active=False, actions=actions
                )
            )
        elif m_key in existing_perms_map:
            # Permiso por-usuario explícito manda DENTRO de lo permitido por el rol
            final_rbac_permissions.append(existing_perms_map[m_key])
        else:
            # Self-healing: activo por defecto, salvo opcional apagado por el tenant
            is_active = m_key not in tenant_disabled
            final_rbac_permissions.append(
                models.UserModulePermission(
                    user_id=user.id,
                    module_key=m_key,
                    is_active=is_active,
                    actions={"view": True, "create": True, "edit": True, "delete": True}
                )
            )

    # Prepare tenant data with renewal date and cycle
    tenant_resp = schemas.BootstrapTenantData.model_validate(user.tenant)

    # Use consolidated fields from Tenant model
    tenant_resp.next_billing_date = user.tenant.billing_end_date
    tenant_resp.billing_cycle = user.tenant.billing_cycle

    # --- Acceso de demostración ---
    # Si hay demo vigente, el plan efectivo (demo) se refleja en subscription_plan
    # para que el frontend desbloquee las funciones; el banner usa los campos demo_*.
    tenant_resp.contracted_plan_name = (
        user.tenant.subscription_plan.name if user.tenant.subscription_plan else (user.tenant.plan or "FREE")
    )
    if user.tenant.demo_active and user.tenant.demo_plan:
        tenant_resp.subscription_plan = schemas.SubscriptionPlanInDB.model_validate(user.tenant.demo_plan)
        tenant_resp.demo_active = True
        tenant_resp.demo_plan_name = user.tenant.demo_plan.name
        tenant_resp.demo_expires_at = user.tenant.demo_expires_at
        
    # Fallback: Check most recent active subscription if Tenant dates are missing
    if not tenant_resp.next_billing_date:
        latest_sub = db.query(models.TenantSubscription).filter(
            models.TenantSubscription.tenant_id == user.tenant.id,
            models.TenantSubscription.status == "active"
        ).order_by(models.TenantSubscription.end_date.desc()).first()
        
        if latest_sub:
            tenant_resp.next_billing_date = latest_sub.end_date
            if not tenant_resp.billing_cycle:
                tenant_resp.billing_cycle = latest_sub.billing_cycle

    # Build response
    return schemas.BootstrapResponse(
        user=schemas.BootstrapUserData.model_validate(user),
        tenant=tenant_resp,
        rbac=schemas.BootstrapRBACData(
            modules=[schemas.BootstrapModulePermission.model_validate(p) for p in final_rbac_permissions],
            role=user.role
        ),
        theme=schemas.ThemeConfigInDB.model_validate(theme_config),
        announcements=[schemas.AnnouncementInDB.model_validate(a) for a in active_announcements],
        dashboard=dashboard_summary,
        notifications=[schemas.NotificationInDB.model_validate(n) for n in notifications],
        submissions=formatted_submissions,
        farewell_templates=[schemas.FarewellTemplate.model_validate(t) for t in farewell_templates],
        document_templates=[schemas.CertificateTemplateInDB.model_validate(t) for t in document_templates],
        services=[schemas.ServiceInDB.model_validate(s) for s in services_list],
        plans=[schemas.PlanInDB.model_validate(p) for p in plans_list],
        product_categories=[schemas.CategoryInDB.model_validate(c) for c in product_categories],
        product_providers=[schemas.ProviderInDB.model_validate(p) for p in product_providers],
        operation_steps=[schemas.WorkflowStepInDB.model_validate(s) for s in operation_steps],
        metadata=schemas.BootstrapMetadata(
            unread_notifications=unread_count,
            pending_submissions=len([s for s in submissions if s.status == "pending"])
        )
    )

class UserUpdateMe(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

@router.patch("/me", response_model=schemas.UserInDB)
def update_user_me(
    user_in: UserUpdateMe,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if user_in.name:
        current_user.name = user_in.name
    if user_in.email:
        # Verificar si el email ya existe en otro usuario
        existing_user = db.query(models.User).filter(models.User.email == user_in.email, models.User.id != current_user.id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="El email ya está registrado")
        current_user.email = user_in.email
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not auth.verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña anterior incorrecta")

    current_user.password_hash = auth.get_password_hash(password_data.new_password)
    # Invalida cualquier otra sesión activa con la contraseña anterior.
    current_user.token_version = (current_user.token_version or 0) + 1
    db.add(current_user)
    db.commit()
    # Revoca los refresh tokens de las demás sesiones (la actual recibe uno nuevo).
    auth.revoke_user_refresh_tokens(db, current_user.id)

    # Devolvemos un token nuevo (con el ver actualizado) para que la sesión que
    # acaba de cambiar la contraseña NO se desloguee, y renovamos las cookies.
    new_token = auth.create_access_token(
        data={
            "sub": str(current_user.id),
            "tenant_id": str(current_user.tenant_id) if current_user.tenant_id is not None else None,
            "role": current_user.role,
            "ver": current_user.token_version,
        },
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    new_refresh = auth.create_refresh_token(db, current_user, request)
    auth.set_auth_cookies(response, new_token, new_refresh)
    return {
        "detail": "Contraseña actualizada exitosamente",
        "access_token": new_token,
        "token_type": "bearer",
    }

@router.get("/users", response_model=List[schemas.UserInDB])
def get_tenant_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lista todos los usuarios del tenant (solo para admins)."""
    if current_user.role not in (models.UserRole.admin, models.UserRole.creator):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver usuarios")
    
    users = db.query(models.User).filter(models.User.tenant_id == current_user.tenant_id).all()
    return users

class UserStatusToggle(BaseModel):
    is_active: bool

@router.patch("/users/{user_id}/toggle", response_model=schemas.UserInDB)
def toggle_user_status(
    user_id: int,
    status_data: UserStatusToggle,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Activa o desactiva un usuario del tenant (solo para admins)."""
    if current_user.role not in (models.UserRole.admin, models.UserRole.creator):
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar usuarios")
    
    user = db.query(models.User).filter(
        models.User.id == user_id, 
        models.User.tenant_id == current_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")
    
    user.is_active = status_data.is_active
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}", response_model=schemas.UserInDB)
def update_user_info(
    user_id: int,
    user_in: schemas.UserUpdateMe, # Reusing this schema for basic info
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Actualiza la información básica de un usuario (solo admin)."""
    if current_user.role not in (models.UserRole.admin, models.UserRole.creator):
        raise HTTPException(status_code=403, detail="No tienes permisos")
    
    user = db.query(models.User).filter(
        models.User.id == user_id, 
        models.User.tenant_id == current_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user_in.name:
        user.name = user_in.name
    if user_in.email:
        user.email = user_in.email
    if user_in.password:
        user.password_hash = auth.get_password_hash(user_in.password)
        # Resetear la contraseña invalida las sesiones activas de ese usuario.
        user.token_version = (user.token_version or 0) + 1
        auth.revoke_user_refresh_tokens(db, user.id)

    db.commit()
    db.refresh(user)
    return user

@router.get("/users/{user_id}/permissions", response_model=List[schemas.UserPermissionBase])
def get_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Obtiene los permisos granulares de un usuario."""
    if current_user.role not in (models.UserRole.admin, models.UserRole.creator):
        raise HTTPException(status_code=403, detail="No tienes permisos")

    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.tenant_id == current_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Get all modules available for the tenant/role
    # For now, we'll just return what's in UserModulePermission
    # and initialize if empty
    perms = db.query(models.UserModulePermission).filter(models.UserModulePermission.user_id == user_id).all()
    
    if not perms:
        # Check tenant/role config to initialize
        tenant_configs = db.query(models.TenantModuleConfig).filter(
            models.TenantModuleConfig.tenant_id == user.tenant_id,
            models.TenantModuleConfig.role == user.role,
            models.TenantModuleConfig.is_active == True
        ).all()
        
        for cfg in tenant_configs:
            is_admin = user.role == models.UserRole.admin
            key = cfg.module_key
            if key == "pets": key = "mascotas"
            if key == "customers": key = "clientes"
            
            new_perm = models.UserModulePermission(
                user_id=user_id,
                module_key=key,
                is_active=True,
                actions={
                    "view": True, 
                    "create": True,
                    "edit": True,
                    "delete": is_admin
                }
            )
            # Re-thinking the logic: 
            # If we want non-admins to have view/create/edit by default:
            # actions={"view": True, "create": True, "edit": True, "delete": is_admin}
            new_perm.actions = {"view": True, "create": True, "edit": True, "delete": is_admin}
            
            db.add(new_perm)
        db.commit()
        perms = db.query(models.UserModulePermission).filter(models.UserModulePermission.user_id == user_id).all()

    return perms

@router.put("/users/{user_id}/permissions")
def update_user_permissions(
    user_id: int,
    permissions_in: List[schemas.UserPermissionBase],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Actualiza todos los permisos granulares de un usuario."""
    if current_user.role not in (models.UserRole.admin, models.UserRole.creator):
        raise HTTPException(status_code=403, detail="No tienes permisos")

    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.tenant_id == current_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Delete existing and recreate for simplicity or update
    db.query(models.UserModulePermission).filter(models.UserModulePermission.user_id == user_id).delete()
    
    for p in permissions_in:
        new_perm = models.UserModulePermission(
            user_id=user_id,
            module_key=p.module_key,
            is_active=p.is_active,
            actions=p.actions.model_dump()
        )
        db.add(new_perm)
    
    db.commit()
    return {"detail": "Permisos actualizados"}
