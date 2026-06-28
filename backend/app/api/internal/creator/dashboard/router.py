from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import shutil
import os
import uuid
from datetime import datetime
from app.utils import tz
from sqlalchemy import func
from app.database import get_db
from app import models
from app import schemas
from app.models import Tenant, User, Cremation, UserRole, SubscriptionPlan, Pet, Service, Product, Customer
from app.auth import get_current_creator, get_password_hash
from app.api.internal.common.media_service import MediaService
from app.api.internal.creator.subscriptions.models import BillingTransaction
from typing import List, Dict, Any
from pydantic import BaseModel

router = APIRouter()

class PasswordReset(BaseModel):
    new_password: str

# Helper to sort modules consistently
def sort_modules(modules_list, key_attr='key'):
    preferred_order = [
        'dashboard', 'clientes', 'mascotas', 'servicios', 'ordenes', 
        'inventario', 'pagos', 'certificados', 'usuarios', 'configuracion',
        'reportes', 'comunicaciones', 'marketing', 'auditoria'
    ]
    def get_sort_key(m):
        key = getattr(m, key_attr) if not isinstance(m, dict) else m.get(key_attr)
        try:
            return preferred_order.index(key)
        except ValueError:
            return 999
    return sorted(modules_list, key=get_sort_key)

# Schemas
class TenantCreate(BaseModel):
    name: str
    slug: str
    rut: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    region: str | None = None
    city: str | None = None
    country: str | None = None
    logo_url: str | None = None
    plan: str = "FREE"
    subscription_plan_id: int | None = None
    admin_password: str | None = None
    pending_reason: str | None = None

class TenantUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    rut: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    region: str | None = None
    city: str | None = None
    country: str | None = None
    logo_url: str | None = None
    status: models.TenantStatus | None = None
    plan: str | None = None
    subscription_plan_id: int | None = None
    monthly_price: float | None = None
    pending_reason: str | None = None
    
    # Billing
    billing_cycle: str | None = None
    billing_status: str | None = None
    billing_end_date: datetime | str | None = None
    last_payment_date: datetime | str | None = None
    last_payment_method: str | None = None
    billing_notify_days: int | None = None
    billing_notify_channels: str | None = None
    billing_discount: int | None = None

class TenantResponse(BaseModel):
    id: int
    name: str
    slug: str
    rut: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    region: str | None = None
    city: str | None = None
    country: str | None = None
    logo_url: str | None = None
    status: models.TenantStatus
    plan: str
    subscription_plan_id: int | None = None
    revenue: float
    pending_reason: str | None = None
    resources: Dict[str, Any]
    created_at: str
    
    # Polar.sh
    polar_subscription_id: str | None = None
    polar_customer_id: str | None = None
    subscription_status: str | None = None
    current_period_end: datetime | None = None
    
    # Billing
    billing_cycle: str | None = None
    billing_status: str | None = None
    billing_end_date: datetime | None = None
    last_payment_date: datetime | None = None
    last_payment_method: str | None = None
    billing_notify_days: int | None = None
    billing_notify_channels: str | None = None
    billing_discount: int | None = None
    monthly_price: float | None = None
    # Acceso de demostración (plan superior temporal)
    demo_plan_id: int | None = None
    demo_plan_name: str | None = None
    demo_expires_at: datetime | None = None

    class Config:
        from_attributes = True

class UserSimpleResponse(BaseModel):
    id: int
    name: str | None = None
    email: str
    role: models.UserRole
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True

class UserPermissionUpdate(BaseModel):
    module_key: str
    is_active: bool
    actions: Dict[str, bool]

class TenantModuleConfigUpdate(BaseModel):
    role: models.UserRole
    module_key: str
    is_active: bool

class UserCreate(BaseModel):
    name: str | None = None
    email: str
    password: str
    role: models.UserRole
    is_active: bool = True

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    role: models.UserRole | None = None
    is_active: bool | None = None

class SubscriptionPlanCreate(BaseModel):
    name: str
    max_pets: int
    max_services: int
    max_plans: int
    max_products: int
    max_orders: int
    max_customers: int
    max_users: int
    max_partners: int
    allowed_modules: List[str]
    can_delete: bool
    can_export: bool
    price: float
    # Dict de flags por característica granular (módulo:feature -> bool). Lo edita
    # el modal "Configurar Características". Opcional para no romper otros callers.
    features: Any = None

class SubscriptionPlanResponse(SubscriptionPlanCreate):
    id: int
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    totalTenants: int
    activeTenants: int
    activeTenants: int
    totalRevenue: float

def calculate_tenant_resources(db: Session, tenant: Tenant) -> Dict[str, Any]:
    # Calculate Resource Counts
    customer_count = db.query(Customer).filter(Customer.tenant_id == tenant.id).count()
    pet_count = db.query(Pet).filter(Pet.tenant_id == tenant.id).count()
    
    # Services
    services_q = db.query(Service).filter(Service.tenant_id == tenant.id)
    services_total = services_q.count()
    services_active = services_q.filter(Service.is_active == True).count()
    services_inactive = services_total - services_active
    
    # Products
    product_count = db.query(Product).filter(Product.tenant_id == tenant.id).count()
    
    # Orders (Cremations) — el estado final único es 'entregado' (se incluyen alias/legacy)
    cremations_q = db.query(Cremation).filter(Cremation.tenant_id == tenant.id)
    orders_total = cremations_q.count()
    orders_pending = cremations_q.filter(Cremation.status.in_(['pendiente', 'pending', 'received'])).count()
    orders_in_process = cremations_q.filter(Cremation.status.in_(['en_proceso', 'processing', 'ready'])).count()
    orders_completed = cremations_q.filter(Cremation.status.in_(['entregado', 'delivered', 'completado', 'completed'])).count()
    orders_cancelled = cremations_q.filter(Cremation.status.in_(['cancelado', 'canceled'])).count()
    
    return {
        "customers": customer_count,
        "pets": pet_count,
        "services": {
            "total": services_total,
            "active": services_active,
            "inactive": services_inactive
        },
        "products": product_count,
        "orders": {
            "total": orders_total,
            "pending": orders_pending,
            "in_process": orders_in_process,
            "completed": orders_completed,
            "cancelled": orders_cancelled
        },
        "plan_details": {
            "name": tenant.subscription_plan.name if tenant.subscription_plan else (tenant.plan or "FREE"),
            "max_pets": tenant.subscription_plan.max_pets if tenant.subscription_plan else 10,
            "max_orders": tenant.subscription_plan.max_orders if tenant.subscription_plan else 5,
            "max_partners": tenant.subscription_plan.max_partners if tenant.subscription_plan else 5
        }
    }


class TenantDashboardBootstrap(BaseModel):
    tenant: TenantResponse
    users: List[UserSimpleResponse]
    plans: List[SubscriptionPlanResponse]
    modules: Dict[str, Any]

class DashboardResponse(BaseModel):
    stats: DashboardStats
    tenants: List[Dict[str, Any]]


@router.get("/dashboard", response_model=DashboardResponse)
async def get_creator_dashboard(
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics and recent tenants for SuperAdmin
    """
    # Get total tenants
    total_tenants = db.query(Tenant).count()
    
    # Get active tenants (status = 'active')
    active_tenants = db.query(Tenant).filter(Tenant.status == 'active').count()
    
    # Total revenue = sum of all completed billing transactions
    total_revenue = db.query(func.sum(BillingTransaction.amount)).filter(
        BillingTransaction.payment_status == "completed"
    ).scalar() or 0.0

    # Get recent tenants with details
    recent_tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).limit(10).all()
    
    tenants_data = []
    for tenant in recent_tenants:
        if tenant.subscription_plan:
            revenue = tenant.subscription_plan.price
        else:
            revenue = 0.0
        
        # Calculate Resource Counts
        resources = calculate_tenant_resources(db, tenant)

        tenants_data.append({
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "rut": tenant.rut,
            "email": tenant.email,
            "phone": tenant.phone,
            "address": tenant.address,
            "region": tenant.region,
            "city": tenant.city,
            "logo_url": tenant.logo_url,
            "status": tenant.status or "active",
            "plan": tenant.subscription_plan.name if tenant.subscription_plan else (tenant.plan or "FREE"),
            "subscription_plan_id": tenant.subscription_plan_id,
            "revenue": tenant.billing_info.monthly_price if tenant.billing_info else 0.0,
            "pending_reason": tenant.pending_reason,
            "resources": resources,
            "createdAt": tenant.created_at.isoformat() if tenant.created_at else None
        })
    
    return DashboardResponse(
        stats=DashboardStats(
            totalTenants=total_tenants,
            activeTenants=active_tenants,
            totalRevenue=total_revenue
        ),
        tenants=tenants_data
    )

@router.get("/dashboard/bootstrap", response_model=schemas.CreatorBootstrapResponse)
async def get_creator_bootstrap(
    current_creator: models.User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Consolidated bootstrap endpoint for SaaS SuperAdmin.
    Returns all initialization data for the Admin Dashboard in a single request.
    """
    from sqlalchemy.orm import joinedload
    from app.api.internal.partners.models import Veterinary
    from app.api.internal.creator.subscriptions.models import BillingTransaction
    
    try:
        from datetime import timedelta
        
        # 1. Dashboard Data (Reuse logic but optimized)
        total_tenants = db.query(models.Tenant).count()
        active_tenants = db.query(models.Tenant).filter(models.Tenant.status == 'active').count()
        
        # Real-time metrics
        total_mrr = db.query(func.sum(models.TenantBillingInfo.monthly_price)).scalar() or 0.0
        
        now = tz.get_now()
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_today = start_of_today + timedelta(days=1)
        
        due_today_count = db.query(models.Tenant).filter(
            models.Tenant.billing_end_date >= start_of_today,
            models.Tenant.billing_end_date < end_of_today
        ).count()

        cancelling_tenants_count = db.query(models.Tenant).filter(
            models.Tenant.subscription_status == 'canceled'
        ).count()

        # Suscripciones que requieren seguimiento: vencen en los próximos 7 días
        # o vencieron en los últimos 30. Se consulta sobre TODOS los tenants
        # (la lista `tenants` del bootstrap solo trae los 15 recientes, y la
        # card "Vencen en 7 días" se calculaba sobre ese subconjunto parcial).
        due_soon_entities = db.query(models.Tenant).options(
            joinedload(models.Tenant.subscription_plan)
        ).filter(
            models.Tenant.billing_end_date != None,
            models.Tenant.billing_end_date >= now - timedelta(days=30),
            models.Tenant.billing_end_date <= now + timedelta(days=7),
        ).order_by(models.Tenant.billing_end_date.asc()).all()

        due_soon_tenants = []
        for t in due_soon_entities:
            plan_name = t.subscription_plan.name if t.subscription_plan else (t.plan or "FREE")
            if plan_name == "FREE":
                continue  # FREE no factura; si arrastra una fecha vieja, no es accionable
            due_soon_tenants.append(schemas.DueSoonTenant(
                id=t.id,
                name=t.name,
                slug=t.slug,
                plan=plan_name,
                status=t.status.value if hasattr(t.status, "value") else str(t.status or "active"),
                billing_end_date=t.billing_end_date,
            ))

        # Growth Data (Last 6 months)
        growth_data = []
        months_to_fetch = 6
        for i in range(months_to_fetch - 1, -1, -1):
            target_date = start_of_today - timedelta(days=i * 30) # Simplify month calc
            month_label = target_date.strftime("%b")
            
            # Simple month range (this could be more precise)
            month_start = target_date.replace(day=1)
            next_month = (month_start + timedelta(days=32)).replace(day=1)
            
            month_revenue = db.query(func.sum(BillingTransaction.amount)).filter(
                BillingTransaction.payment_status == "completed",
                BillingTransaction.created_at >= month_start,
                BillingTransaction.created_at < next_month
            ).scalar() or 0.0
            
            month_tenants = db.query(models.Tenant).filter(
                models.Tenant.created_at < next_month
            ).count()
            
            growth_data.append(schemas.GrowthDataPoint(
                month=month_label,
                revenue=month_revenue,
                tenants=month_tenants
            ))

        # Simple revenue calculation (top level)
        total_revenue = db.query(func.sum(BillingTransaction.amount)).filter(
            BillingTransaction.payment_status == "completed"
        ).scalar() or 0.0
        
        recent_tenants_entities = db.query(models.Tenant).options(
            joinedload(models.Tenant.billing_info),
            joinedload(models.Tenant.subscription_plan)
        ).order_by(models.Tenant.created_at.desc()).limit(15).all()

        tenants_list = []
        for t in recent_tenants_entities:
            t_revenue = t.billing_info.monthly_price if t.billing_info else 0.0
            tenants_list.append(schemas.CreatorBootstrapTenant(
                id=t.id,
                name=t.name,
                slug=t.slug,
                rut=t.rut,
                email=t.email,
                phone=t.phone,
                address=t.address,
                region=t.region,
                city=t.city,
                status=t.status if t.status else "active",
                plan=t.subscription_plan.name if t.subscription_plan else (t.plan or "FREE"),
                revenue=t_revenue,
                billing_end_date=t.billing_end_date,
                created_at=t.created_at.isoformat() if t.created_at else "",
                resources=calculate_tenant_resources(db, t),
                demo_plan_id=t.demo_plan_id,
                demo_plan_name=(t.demo_plan.name if t.demo_plan_id and t.demo_plan else None),
                demo_expires_at=t.demo_expires_at if t.demo_active else None
            ))

        # 2. Notifications (Latest 10 system notifications)
        notifications = db.query(models.Notification).filter(
            models.Notification.recipient_type == models.RecipientType.admin,
            models.Notification.is_read == False
        ).order_by(models.Notification.created_at.desc()).limit(10).all()

        # 3. Global Veterinaries (For Sidebar/Quick Actions)
        vets = db.query(Veterinary).order_by(Veterinary.created_at.desc()).limit(20).all()
        formatted_vets = [schemas.CreatorBootstrapVeterinary.model_validate(v) for v in vets]

        # 4. Recent Billing Transactions (Last 50)
        billing_txns = db.query(BillingTransaction).order_by(
            BillingTransaction.created_at.desc()
        ).limit(50).all()
        
        # Count pending for metadata
        pending_count = db.query(BillingTransaction).filter(
            BillingTransaction.payment_status == "pending"
        ).count()

        # 5. Subscription Plans
        plans = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.is_active == True).order_by(models.SubscriptionPlan.display_order).all()

        # 6. Global Announcements
        announcements = db.query(models.TenantAnnouncement).filter(
            models.TenantAnnouncement.is_active == True,
            (models.TenantAnnouncement.tenant_id == None) # Creator only sees and manages global ones here or similar
        ).order_by(models.TenantAnnouncement.priority.desc()).all()

        # counts
        unread_count = db.query(models.Notification).filter(
            models.Notification.recipient_type == models.RecipientType.admin,
            models.Notification.is_read == False
        ).count()

        return schemas.CreatorBootstrapResponse(
            user=schemas.BootstrapUserData.model_validate(current_creator),
            stats=schemas.CreatorBootstrapStats(
                total_tenants=total_tenants,
                active_tenants=active_tenants,
                total_revenue=total_revenue,
                total_mrr=total_mrr,
                due_today_count=due_today_count,
                cancelling_tenants_count=cancelling_tenants_count,
                growth_data=growth_data
            ),
            tenants=tenants_list,
            due_soon_tenants=due_soon_tenants,
            notifications=[schemas.NotificationInDB.model_validate(n) for n in notifications],
            veterinaries=formatted_vets,
            billing_transactions=[schemas.BillingTransactionResponse.model_validate(b) for b in billing_txns],
            subscription_plans=[schemas.SubscriptionPlanInDB.model_validate(p) for p in plans],
            announcements=[schemas.AnnouncementInDB.model_validate(a) for a in announcements],
            metadata=schemas.BootstrapMetadata(
                unread_notifications=unread_count,
                pending_submissions=pending_count # Real pending count
            )
        )
    except Exception as e:
        import traceback
        error_msg = f"Bootstrap Error: {str(e)}\n{traceback.format_exc()}"
        with open("critical_error.log", "a") as f:
            f.write(f"\n[{datetime.now()}] {error_msg}\n")
        raise HTTPException(status_code=500, detail=f"Error interno en bootstrap: {str(e)}")


@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    tenant_data: TenantCreate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Create a new tenant
    """
    # Check if slug already exists
    existing = db.query(Tenant).filter(Tenant.slug == tenant_data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    # Create tenant
    new_tenant = Tenant(
        name=tenant_data.name,
        slug=tenant_data.slug,
        rut=tenant_data.rut,
        email=tenant_data.email,
        phone=tenant_data.phone,
        address=tenant_data.address,
        region=tenant_data.region,
        city=tenant_data.city,
        country=tenant_data.country or "Chile",
        logo_url=tenant_data.logo_url,
        plan=tenant_data.plan,
        subscription_plan_id=tenant_data.subscription_plan_id,
        status="active",
        pending_reason=tenant_data.pending_reason
    )
    
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    # Create Initial Admin User
    if tenant_data.email:
        # Check if email is already taken
        existing_user = db.query(models.User).filter(models.User.email == tenant_data.email).first()
        if existing_user:
             # If it belongs to another tenant, we can't use it
             raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado en el sistema.")
        
        admin_password = tenant_data.admin_password or "admin123"
        hashed_password = get_password_hash(admin_password)
        
        new_admin = models.User(
            tenant_id=new_tenant.id,
            email=tenant_data.email,
            password_hash=hashed_password,
            role=models.UserRole.admin,
            name=f"Administrador {new_tenant.name}",
            is_active=True
        )
        db.add(new_admin)
    
    # Create default billing info
    plan_price = 0.0
    allowed_modules = ["dashboard", "perfil", "configuracion"] # Módulos base siempre activos

    if tenant_data.subscription_plan_id:
        plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == tenant_data.subscription_plan_id).first()
        if plan:
            plan_price = plan.price
            if plan.allowed_modules:
                allowed_modules.extend(plan.allowed_modules)

    # 1. Inicializar TenantModuleConfig para el rol admin
    all_modules = db.query(models.Module).all()
    for m in all_modules:
        is_active = m.key in allowed_modules
        
        new_cfg = models.TenantModuleConfig(
            tenant_id=new_tenant.id,
            role=models.UserRole.admin,
            module_key=m.key,
            is_active=is_active
        )
        db.add(new_cfg)

    # 2. Inicializar UserModulePermission para el nuevo admin
    if tenant_data.email: # Si se creó el usuario
        for m_key in allowed_modules:
            # Mapeo de compatibilidad similar al de bootstrap
            key = m_key
            if key == "pets": key = "mascotas"
            if key == "customers": key = "clientes"
            
            new_perm = models.UserModulePermission(
                user_id=new_admin.id,
                module_key=key,
                is_active=True,
                actions={"view": True, "create": True, "edit": True, "delete": True}
            )
            db.add(new_perm)

    billing_info = models.TenantBillingInfo(
        tenant_id=new_tenant.id,
        monthly_price=plan_price
    )
    db.add(billing_info)
    db.commit()
    
    return TenantResponse(
        id=new_tenant.id,
        name=new_tenant.name,
        slug=new_tenant.slug,
        rut=new_tenant.rut,
        email=new_tenant.email,
        phone=new_tenant.phone,
        address=new_tenant.address,
        region=new_tenant.region,
        city=new_tenant.city,
        logo_url=new_tenant.logo_url,
        status=new_tenant.status or "active",
        plan=new_tenant.subscription_plan.name if new_tenant.subscription_plan else (new_tenant.plan or "FREE"),
        subscription_plan_id=new_tenant.subscription_plan_id,
        revenue=0.0,
        pending_reason=new_tenant.pending_reason,
        created_at=new_tenant.created_at.isoformat() if new_tenant.created_at else "",
        
        # Billing
        billing_cycle=billing_info.billing_cycle,
        billing_status=billing_info.billing_status,
        billing_end_date=billing_info.billing_end_date,
        last_payment_date=billing_info.last_payment_date,
        last_payment_method=billing_info.last_payment_method,
        billing_notify_days=billing_info.billing_notify_days,
        billing_notify_channels=billing_info.billing_notify_channels,
        billing_discount=billing_info.billing_discount,
        monthly_price=billing_info.monthly_price,
        resources={} # New tenant has no resources
    )



@router.get("/tenants/{identifier}/dashboard_bootstrap", response_model=TenantDashboardBootstrap)
async def get_tenant_dashboard_bootstrap(
    identifier: str,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get consolidated data for Tenant Detail Dashboard (Tenant, Users, Plans, Modules)
    """
    # 1. Tenant Detail Logic
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    cremations_count = db.query(Cremation).filter(Cremation.tenant_id == tenant.id).count()
    revenue = cremations_count * 50000
    
    tenant_response = TenantResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        rut=tenant.rut,
        email=tenant.email,
        phone=tenant.phone,
        address=tenant.address,
        region=tenant.region,
        city=tenant.city,
        country=tenant.country,
        logo_url=tenant.logo_url,
        status=tenant.status or "active",
        plan=tenant.subscription_plan.name if tenant.subscription_plan else (tenant.plan or "FREE"),
        subscription_plan_id=tenant.subscription_plan_id,
        revenue=revenue,
        pending_reason=tenant.pending_reason,
        created_at=tenant.created_at.isoformat() if tenant.created_at else "",
        
        # Billing
        billing_cycle=tenant.billing_cycle or "monthly",
        billing_status=tenant.billing_status or "active",
        billing_end_date=tenant.billing_end_date,
        last_payment_date=tenant.last_payment_date,
        last_payment_method=tenant.last_payment_method,
        billing_notify_days=tenant.billing_notify_days or 30,
        billing_notify_channels=tenant.billing_notify_channels or "email",
        billing_discount=tenant.billing_discount or 0,
        monthly_price=tenant.billing_info.monthly_price if tenant.billing_info else 0.0,
        resources=calculate_tenant_resources(db, tenant),
        polar_subscription_id=tenant.polar_subscription_id,
        polar_customer_id=tenant.polar_customer_id,
        subscription_status=tenant.subscription_status,
        current_period_end=tenant.current_period_end,
        demo_plan_id=tenant.demo_plan_id,
        demo_plan_name=(tenant.demo_plan.name if tenant.demo_plan_id and tenant.demo_plan else None),
        demo_expires_at=tenant.demo_expires_at if tenant.demo_active else None
    )

    # Precise Expiration Fallbacks
    if not tenant_response.billing_end_date:
        if tenant.billing_end_date:
            tenant_response.billing_end_date = tenant.billing_end_date
        else:
            latest_sub = db.query(models.TenantSubscription).filter(
                models.TenantSubscription.tenant_id == tenant.id,
                models.TenantSubscription.status == "active"
            ).order_by(models.TenantSubscription.end_date.desc()).first()
            if latest_sub:
                tenant_response.billing_end_date = latest_sub.end_date
                if not tenant_response.billing_cycle:
                    tenant_response.billing_cycle = latest_sub.billing_cycle

    # 2. Users Logic
    users = db.query(User).filter(User.tenant_id == tenant.id).all()
    users_response = [
        UserSimpleResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else ""
        ) for u in users
    ]

    # 3. Plans Logic
    plans = db.query(models.SubscriptionPlan).all()
    plans_response = [SubscriptionPlanResponse.model_validate(p) for p in plans]

    # 4. Modules Logic
    plan_modules = []
    if tenant.subscription_plan:
        plan_modules = tenant.subscription_plan.allowed_modules or []
    
    overrides = db.query(models.TenantModuleConfig).filter(
        models.TenantModuleConfig.tenant_id == tenant.id
    ).all()
    
    all_modules = db.query(models.Module).all()
    
    modules_response = {
        "plan_modules": plan_modules,
        "overrides": [
            {
                "role": o.role,
                "module_key": o.module_key,
                "is_active": o.is_active
            } for o in overrides
        ],
        "all_modules": sort_modules([
            {
                "key": m.key,
                "name": m.name,
                "description": m.description
            } for m in all_modules
        ])
    }

    return TenantDashboardBootstrap(
        tenant=tenant_response,
        users=users_response,
        plans=plans_response,
        modules=modules_response
    )


@router.get("/tenants/{identifier}", response_model=TenantResponse)
async def get_tenant_detail(
    identifier: str,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get detailed info for a specific tenant by ID or Slug
    """
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    cremations_count = db.query(Cremation).filter(Cremation.tenant_id == tenant.id).count()
    revenue = cremations_count * 50000
    
    response = TenantResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        rut=tenant.rut,
        email=tenant.email,
        phone=tenant.phone,
        address=tenant.address,
        region=tenant.region,
        city=tenant.city,
        logo_url=tenant.logo_url,
        status=tenant.status or "active",
        plan=tenant.subscription_plan.name if tenant.subscription_plan else (tenant.plan or "FREE"),
        subscription_plan_id=tenant.subscription_plan_id,
        revenue=revenue,
        pending_reason=tenant.pending_reason,
        created_at=tenant.created_at.isoformat() if tenant.created_at else "",
        
        # Billing
        billing_cycle=tenant.billing_cycle or "monthly",
        billing_status=tenant.billing_status or "active",
        billing_end_date=tenant.billing_end_date,
        last_payment_date=tenant.last_payment_date,
        last_payment_method=tenant.last_payment_method,
        billing_notify_days=tenant.billing_notify_days or 30,
        billing_notify_channels=tenant.billing_notify_channels or "email",
        billing_discount=tenant.billing_discount or 0,
        monthly_price=tenant.billing_info.monthly_price if tenant.billing_info else 0.0,
        resources=calculate_tenant_resources(db, tenant),
        polar_subscription_id=tenant.polar_subscription_id,
        polar_customer_id=tenant.polar_customer_id,
        subscription_status=tenant.subscription_status,
        current_period_end=tenant.current_period_end,
        demo_plan_id=tenant.demo_plan_id,
        demo_plan_name=(tenant.demo_plan.name if tenant.demo_plan_id and tenant.demo_plan else None),
        demo_expires_at=tenant.demo_expires_at if tenant.demo_active else None
    )

    # Precise Expiration Fallbacks
    if not response.billing_end_date:
        if tenant.billing_end_date:
            response.billing_end_date = tenant.billing_end_date
        else:
            latest_sub = db.query(models.TenantSubscription).filter(
                models.TenantSubscription.tenant_id == tenant.id,
                models.TenantSubscription.status == "active"
            ).order_by(models.TenantSubscription.end_date.desc()).first()
            if latest_sub:
                response.billing_end_date = latest_sub.end_date
                if not response.billing_cycle:
                    response.billing_cycle = latest_sub.billing_cycle
                    
    return response


@router.put("/tenants/{identifier}", response_model=TenantResponse)
async def update_tenant(
    identifier: str,
    tenant_data: TenantUpdate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Update an existing tenant by ID or Slug
    """
    print(f"DEBUG: Iniciando actualización de tenant {identifier}")
    print(f"DEBUG: Datos recibidos: {tenant_data.dict(exclude_unset=True)}")
    
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant_id = tenant.id
    
    # Check slug uniqueness if being changed
    if tenant_data.slug and tenant_data.slug != tenant.slug:
        existing = db.query(Tenant).filter(Tenant.slug == tenant_data.slug).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already exists")
    
    # Update fields
    if tenant_data.name is not None:
        tenant.name = tenant_data.name
    if tenant_data.slug is not None:
        tenant.slug = tenant_data.slug
    if tenant_data.rut is not None:
        tenant.rut = tenant_data.rut
    if tenant_data.email is not None:
        tenant.email = tenant_data.email
    if tenant_data.phone is not None:
        tenant.phone = tenant_data.phone
    if tenant_data.address is not None:
        tenant.address = tenant_data.address
    if tenant_data.region is not None:
        tenant.region = tenant_data.region
    if tenant_data.city is not None:
        tenant.city = tenant_data.city
    if tenant_data.country is not None:
        tenant.country = tenant_data.country
    if tenant_data.logo_url is not None:
        tenant.logo_url = tenant_data.logo_url
    if tenant_data.plan is not None:
        tenant.plan = tenant_data.plan
    if tenant_data.status is not None:
        tenant.status = tenant_data.status
        
    # Billing Updates
    billing_info = tenant.billing_info
    if not billing_info:
        # Auto-create if missing (should exist due to migration, but safe fallback)
        billing_info = models.TenantBillingInfo(tenant_id=tenant.id)
        db.add(billing_info)
    
    if tenant_data.billing_cycle is not None: tenant.billing_cycle = tenant_data.billing_cycle
    
    if tenant_data.billing_end_date is not None: 
        if isinstance(tenant_data.billing_end_date, str) and tenant_data.billing_end_date:
            try:
                tenant.billing_end_date = datetime.strptime(tenant_data.billing_end_date, "%Y-%m-%d")
            except ValueError:
                tenant.billing_end_date = datetime.fromisoformat(tenant_data.billing_end_date.replace('Z', '+00:00'))
        else:
            tenant.billing_end_date = tenant_data.billing_end_date

    if tenant_data.last_payment_date is not None:
        if isinstance(tenant_data.last_payment_date, str) and tenant_data.last_payment_date:
            try:
                tenant.last_payment_date = datetime.strptime(tenant_data.last_payment_date, "%Y-%m-%d")
            except ValueError:
                tenant.last_payment_date = datetime.fromisoformat(tenant_data.last_payment_date.replace('Z', '+00:00'))
        else:
             tenant.last_payment_date = tenant_data.last_payment_date
             
    if tenant_data.last_payment_method is not None: tenant.last_payment_method = tenant_data.last_payment_method
    if tenant_data.billing_notify_days is not None: tenant.billing_notify_days = tenant_data.billing_notify_days
    if tenant_data.billing_notify_channels is not None: tenant.billing_notify_channels = tenant_data.billing_notify_channels
    if tenant_data.billing_discount is not None: tenant.billing_discount = tenant_data.billing_discount
    if tenant_data.monthly_price is not None: billing_info.monthly_price = tenant_data.monthly_price
        
    if tenant_data.pending_reason is not None: tenant.pending_reason = tenant_data.pending_reason
    
    old_plan_id = tenant.subscription_plan_id
    if tenant_data.subscription_plan_id is not None:
        tenant.subscription_plan_id = tenant_data.subscription_plan_id
        # Sincronizar el nombre del plan (deprecated but used for display)
        new_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == tenant_data.subscription_plan_id).first()
        if new_plan:
            tenant.plan = new_plan.name
        # Al cambiar de plan, opcionalmente podrías querer resetear el precio al del nuevo plan,
        # pero para mantener el "precio pactado" solo lo hacemos si no se envió un precio específico
        if tenant_data.monthly_price is None:
            billing_info.monthly_price = new_plan.price
        # Sincronizar la columna plan (antigua) para reportes/vistas legacy
        tenant.plan = new_plan.name
    elif "subscription_plan_id" in tenant_data.dict(exclude_unset=True) and tenant_data.subscription_plan_id is None:
        tenant.subscription_plan_id = None
        tenant.plan = "FREE"
        if tenant_data.monthly_price is None:
            billing_info.monthly_price = 0.0
        if tenant_data.monthly_price is None:
            billing_info.monthly_price = 0.0
    
    plan_changed = old_plan_id != tenant.subscription_plan_id
    
    try:
        # === SYNC WITH TENANT SUBSCRIPTION ===
        # If the admin manually overrides billing here, we should update the active subscription record
        active_sub = db.query(models.TenantSubscription).filter(
            models.TenantSubscription.tenant_id == tenant.id,
            models.TenantSubscription.status == "active"
        ).order_by(models.TenantSubscription.end_date.desc()).first()

        if active_sub:
            if tenant_data.subscription_plan_id is not None:
                active_sub.subscription_plan_id = tenant.subscription_plan_id
                active_sub.monthly_price = billing_info.monthly_price
            
            if tenant.billing_end_date:
                active_sub.end_date = tenant.billing_end_date
                active_sub.next_billing_date = tenant.billing_end_date
                
            if tenant_data.billing_cycle is not None:
                active_sub.billing_cycle = tenant_data.billing_cycle

        db.commit()
        db.refresh(tenant)
        
        # Si el plan cambió, sincronizamos la configuración de módulos base del tenant
        if plan_changed:
            # 1. Definir módulos permitidos por el nuevo plan
            allowed_modules = []
            if tenant.subscription_plan:
                allowed_modules = tenant.subscription_plan.allowed_modules or []
            
            # Módulos base que siempre están permitidos
            base_modules = {"dashboard", "perfil"}
            all_allowed = set(allowed_modules) | base_modules
            
            # 2. Sincronizar TenantModuleConfig (Configuración por Rol del Tenant)
            # Usamos los blueprints para saber qué roles deben tener qué módulos
            blueprint_configs = db.query(models.RoleModuleBlueprint).all()
            bp_map = {}
            for bp in blueprint_configs:
                role_val = bp.role
                if role_val not in bp_map:
                    bp_map[role_val] = set()
                bp_map[role_val].add(bp.module_key)
            
            if "admin" not in bp_map:
                bp_map["admin"] = set()

            configs = db.query(models.TenantModuleConfig).filter(models.TenantModuleConfig.tenant_id == tenant_id).all()
            
            # Sincronizar para cada rol que tenga un blueprint
            for role_str, role_modules in bp_map.items():
                if role_str == "admin":
                    modules_to_activate = all_allowed
                else:
                    modules_to_activate = all_allowed.intersection(role_modules)
                
                for mod_key in modules_to_activate:
                    exists = next((c for c in configs if c.role == role_str and c.module_key == mod_key), None)
                    if not exists:
                        db.add(models.TenantModuleConfig(
                            tenant_id=tenant_id,
                            role=role_str,
                            module_key=mod_key,
                            is_active=True
                        ))
                    else:
                        exists.is_active = True

            # Desactivar módulos que ya no están en el plan
            # Recargamos para incluir los nuevos si hubo
            all_configs = db.query(models.TenantModuleConfig).filter(models.TenantModuleConfig.tenant_id == tenant_id).all()
            for c in all_configs:
                if c.module_key not in all_allowed:
                    c.is_active = False
            
            # 3. Limpiar UserModulePermission (Overrides Granulares por Usuario)
            # Si un módulo ya no es parte del plan, eliminamos el override
            # para que no "reviva" un módulo PRO en un plan FREE
            user_overrides = db.query(models.UserModulePermission).join(models.User).filter(
                models.User.tenant_id == tenant_id
            ).all()
            
            for up in user_overrides:
                if up.module_key not in all_allowed:
                    db.delete(up)
            
            db.commit()
            
        print(f"DEBUG: Tenant {tenant_id} actualizado exitosamente en DB")
    except Exception as e:
        db.rollback()
        print(f"DEBUG: Error al hacer commit para tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al guardar en base de datos: {str(e)}")
    
    # Calculate revenue
    cremations_count = db.query(Cremation).filter(Cremation.tenant_id == tenant.id).count()
    revenue = cremations_count * 50000
    
    response = TenantResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        rut=tenant.rut,
        email=tenant.email,
        phone=tenant.phone,
        logo_url=tenant.logo_url,
        status=tenant.status or "active",
        plan=tenant.plan or "FREE",
        subscription_plan_id=tenant.subscription_plan_id,
        revenue=revenue,
        pending_reason=tenant.pending_reason,
        created_at=tenant.created_at.isoformat() if tenant.created_at else "",
        
        # Billing
        billing_cycle=tenant.billing_cycle or "monthly",
        billing_status=tenant.billing_status or "active",
        billing_end_date=tenant.billing_end_date,
        last_payment_date=tenant.last_payment_date,
        last_payment_method=tenant.last_payment_method,
        billing_notify_days=tenant.billing_notify_days or 30,
        billing_notify_channels=tenant.billing_notify_channels or "email",
        billing_discount=tenant.billing_discount or 0,
        monthly_price=tenant.billing_info.monthly_price if tenant.billing_info else 0.0,
        resources=calculate_tenant_resources(db, tenant),
        polar_subscription_id=tenant.polar_subscription_id,
        polar_customer_id=tenant.polar_customer_id,
        subscription_status=tenant.subscription_status,
        current_period_end=tenant.current_period_end,
        demo_plan_id=tenant.demo_plan_id,
        demo_plan_name=(tenant.demo_plan.name if tenant.demo_plan_id and tenant.demo_plan else None),
        demo_expires_at=tenant.demo_expires_at if tenant.demo_active else None
    )

    # Precise Expiration Fallbacks
    if not response.billing_end_date:
        if tenant.billing_end_date:
            response.billing_end_date = tenant.billing_end_date
        else:
            latest_sub = db.query(models.TenantSubscription).filter(
                models.TenantSubscription.tenant_id == tenant.id,
                models.TenantSubscription.status == "active"
            ).order_by(models.TenantSubscription.end_date.desc()).first()
            if latest_sub:
                response.billing_end_date = latest_sub.end_date
                if not response.billing_cycle:
                    response.billing_cycle = latest_sub.billing_cycle
                    
    return response


# ==========================================
# Acceso de Demostración (plan superior temporal, sin tocar facturación)
# ==========================================
class DemoGrantRequest(BaseModel):
    plan_id: int
    months: int = 1  # 1 o 2 (máximo 2)


def _resolve_tenant(db: Session, identifier: str):
    tenant = None
    if str(identifier).isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    if not tenant:
        tenant = db.query(Tenant).filter(Tenant.slug == str(identifier)).first()
    return tenant


@router.post("/tenants/{identifier}/demo")
async def grant_demo_access(
    identifier: str,
    body: DemoGrantRequest,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Concede acceso temporal a un plan superior (demo) sin cambiar el plan
    pactado ni la facturación. Se revierte solo al vencer."""
    from datetime import timedelta
    tenant = _resolve_tenant(db, identifier)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == body.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    months = max(1, min(2, body.months or 1))  # tope 2 meses
    tenant.demo_plan_id = plan.id
    tenant.demo_expires_at = datetime.utcnow() + timedelta(days=30 * months)
    db.commit()
    db.refresh(tenant)

    return {
        "status": "granted",
        "demo_plan_id": plan.id,
        "demo_plan_name": plan.name,
        "demo_expires_at": tenant.demo_expires_at.isoformat(),
        "months": months,
    }


@router.delete("/tenants/{identifier}/demo")
async def revoke_demo_access(
    identifier: str,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """Revoca el acceso de demostración inmediatamente."""
    tenant = _resolve_tenant(db, identifier)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    tenant.demo_plan_id = None
    tenant.demo_expires_at = None
    db.commit()
    return {"status": "revoked"}


@router.post("/tenants/{identifier}/logo")
async def upload_tenant_logo(
    identifier: str,
    file: UploadFile = File(...),
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Upload a logo for a specific tenant by ID or Slug
    """
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

        # Temporary save for processing
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        temp_path = os.path.join(temp_dir, f"logo_{uuid.uuid4().hex[:8]}{ext}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            # Upload using MediaService with high quality mode for tenant logos
            media_item = MediaService.upload_media(
                db=db,
                local_path=temp_path,
                media_type="image",
                category="tenants",
                ratio="original", # Preserve logo aspect ratio
                description=f"Logo para {tenant.name}",
                alt_text=f"Logo {tenant.name}",
                processing_mode="original",
                custom_prefix=tenant.slug,
                tenant_id=tenant.id  # Logo de un tenant concreto -> tenant_{id}/
            )
            
            # Update database with the new URL
            tenant.logo_url = media_item.url
            db.commit()
            db.refresh(tenant)
            
            return {"logo_url": media_item.url}
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        # Update database
        logo_url = f"/static/tenants/{tenant_id}/logo/{filename}"
        tenant.logo_url = logo_url
        db.commit()

        return {"logo_url": logo_url}
    except Exception as e:
        print(f"Error uploading logo for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al subir el logo")

# --- Subscription Plans Management ---

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def get_plans(
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    return db.query(models.SubscriptionPlan).all()

@router.post("/plans", response_model=SubscriptionPlanResponse)
async def create_plan(
    plan_data: SubscriptionPlanCreate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    new_plan = models.SubscriptionPlan(**plan_data.dict())
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return new_plan

@router.put("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_plan(
    plan_id: int,
    plan_data: SubscriptionPlanCreate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    old_modules = set(plan.allowed_modules or [])
    new_data = plan_data.dict()
    new_modules = set(new_data.get('allowed_modules', []))

    # 'features' se actualiza solo si viene explícito en el body, para no
    # sobrescribirlo con null cuando el cliente no lo envía (ej. el botón
    # "Guardar Cambios" de la card vs. el modal "Configurar Características").
    features_val = new_data.pop('features', None)

    # Update plan fields
    for key, value in new_data.items():
        setattr(plan, key, value)

    if features_val is not None:
        plan.features = features_val

    db.commit()
    db.refresh(plan)

    # Propagation Logic: Symmetrically synchronize modules for all tenants on this plan
    # Modules added: Activate them for existing configs
    # Modules removed: Deactivate them and clean up user overrides
    base_modules = {"dashboard", "perfil"}
    all_allowed = new_modules | base_modules
    
    tenants = db.query(models.Tenant).filter(models.Tenant.subscription_plan_id == plan_id).all()
    tenant_ids = [t.id for t in tenants]
    
    if tenant_ids:
        # 1. Update TenantModuleConfig for all affected tenants
        # We'll use the blueprints as a guide for which roles should get which modules
        blueprint_configs = db.query(models.RoleModuleBlueprint).all()
        bp_map = {}
        for bp in blueprint_configs:
            role_val = bp.role
            if role_val not in bp_map:
                bp_map[role_val] = set()
            bp_map[role_val].add(bp.module_key)
        
        # Ensure 'admin' role is always considered even if bp is empty (though it shouldn't be)
        if "admin" not in bp_map:
            bp_map["admin"] = set()

        configs = db.query(models.TenantModuleConfig).filter(models.TenantModuleConfig.tenant_id.in_(tenant_ids)).all()
        
        for t_id in tenant_ids:
            t_configs = [c for c in configs if c.tenant_id == t_id]
            
            # Synchronize for all roles that have a blueprint
            for role_str, role_modules in bp_map.items():
                # Only enable modules that are allowed by the plan
                # For Admin, we allow everything in the plan.
                # For other roles, we only allow (Plan Allowed Modules INTERSECT Role Blueprint Modules)
                # This ensures we don't grant excessive access automatically to limited roles.
                
                if role_str == "admin":
                    modules_to_activate = all_allowed
                else:
                    modules_to_activate = all_allowed.intersection(role_modules)
                
                for mod_key in modules_to_activate:
                    exists = next((c for c in t_configs if c.role == role_str and c.module_key == mod_key), None)
                    if not exists:
                        db.add(models.TenantModuleConfig(
                            tenant_id=t_id,
                            role=role_str,
                            module_key=mod_key,
                            is_active=True
                        ))
                    else:
                        exists.is_active = True
                        
        # Deactivate modules in all roles that are NOT in the plan's and common allowed list
        # We reload configs to include newly added ones if any
        all_configs = db.query(models.TenantModuleConfig).filter(models.TenantModuleConfig.tenant_id.in_(tenant_ids)).all()
        for c in all_configs:
            if c.module_key not in all_allowed:
                c.is_active = False
                
        # 2. Update UserModulePermission (Overrides) for all users in affected tenants
        # If a module is removed from the plan, no user should have it via override
        user_overrides = db.query(models.UserModulePermission).join(models.User).filter(
            models.User.tenant_id.in_(tenant_ids)
        ).all()
        
        for up in user_overrides:
            if up.module_key not in all_allowed:
                db.delete(up)
                
        db.commit()

    return plan

@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: int,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    # Verificar si hay tenants usando este plan
    usage_count = db.query(models.Tenant).filter(models.Tenant.subscription_plan_id == plan_id).count()
    if usage_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar el plan '{plan.name}' porque está siendo usado por {usage_count} empresa(s)."
        )
    
    db.delete(plan)
    db.commit()
    return {"message": "Plan eliminado correctamente"}

@router.delete("/tenants/{identifier}")
async def delete_tenant(
    identifier: str,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Delete a tenant and ALL associated data (users, pets, orders, files, etc.).
    This is an irreversible operation.
    """
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant_id = tenant.id
    tenant_slug = tenant.slug

    try:
        # 1. Collect parent IDs for nested deletions
        cremation_ids = [r[0] for r in db.query(models.Cremation.id).filter(models.Cremation.tenant_id == tenant_id).all()]
        plan_ids = [r[0] for r in db.query(models.Plan.id).filter(models.Plan.tenant_id == tenant_id).all()]
        user_ids = [r[0] for r in db.query(models.User.id).filter(models.User.tenant_id == tenant_id).all()]

        # 2. DELETE LEAF NODES & DEPENDENCIES FIRST (THE MOST NESTED ONES)
        
        # User dependencies (BEFORE Users)
        if user_ids:
            db.query(models.UserModulePermission).filter(models.UserModulePermission.user_id.in_(user_ids)).delete(synchronize_session=False)
            db.query(models.UserAnnouncementView).filter(models.UserAnnouncementView.user_id.in_(user_ids)).delete(synchronize_session=False)
            db.query(models.AuditLog).filter(models.AuditLog.user_id.in_(user_ids)).delete(synchronize_session=False)
            db.query(models.TemporaryFormToken).filter(models.TemporaryFormToken.created_by_user_id.in_(user_ids)).delete(synchronize_session=False)
            # Reassign any logistic tasks to avoid crash if we delete the driver
            db.query(models.LogisticsTask).filter(models.LogisticsTask.driver_id.in_(user_ids)).update({"driver_id": None}, synchronize_session=False)

        # Audit Logs & Temporary Tokens filtering by tenant
        db.query(models.AuditLog).filter(models.AuditLog.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.TemporaryFormToken).filter(models.TemporaryFormToken.tenant_id == tenant_id).delete(synchronize_session=False)

        # Cremation dependencies (BEFORE Cremations)
        if cremation_ids:
            db.query(models.OrderEvidence).filter(models.OrderEvidence.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.CremationLogistics).filter(models.CremationLogistics.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.CremationTechnical).filter(models.CremationTechnical.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.CremationFinancial).filter(models.CremationFinancial.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.CremationDetails).filter(models.CremationDetails.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.CremationScheduling).filter(models.CremationScheduling.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.PartnerCommission).filter(models.PartnerCommission.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.Certificate).filter(models.Certificate.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.Document).filter(models.Document.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.LogisticsTask).filter(models.LogisticsTask.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.ServicioOC).filter(models.ServicioOC.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.PlanOC).filter(models.PlanOC.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)
            db.query(models.ProductoOC).filter(models.ProductoOC.cremation_id.in_(cremation_ids)).delete(synchronize_session=False)

        # Plan dependencies
        if plan_ids:
            db.query(models.PlanProduct).filter(models.PlanProduct.plan_id.in_(plan_ids)).delete(synchronize_session=False)
            db.query(models.PlanService).filter(models.PlanService.plan_id.in_(plan_ids)).delete(synchronize_session=False)

        # Reassign Partners to System Tenant (1)
        db.query(models.Partner).filter(models.Partner.tenant_id == tenant_id).update({"tenant_id": 1}, synchronize_session=False)
        
        # FormSubmissions references Pet, Customer and Partner
        db.query(models.FormSubmission).filter(models.FormSubmission.tenant_id == tenant_id).delete(synchronize_session=False)

        # Now delete Parents
        db.query(models.Cremation).filter(models.Cremation.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.CremationOC).filter(models.CremationOC.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.Plan).filter(models.Plan.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.User).filter(models.User.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # CRM - Delete after Cremations and FormSubmissions
        db.query(models.Pet).filter(models.Pet.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id).delete(synchronize_session=False)

        # All other tenant-related cleanup
        db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.Product).filter(models.Product.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.Service).filter(models.Service.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.Category).filter(models.Category.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.Provider).filter(models.Provider.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.WeightPricing).filter(models.WeightPricing.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.TenantModuleConfig).filter(models.TenantModuleConfig.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.Notification).filter(models.Notification.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.ThemeConfig).filter(models.ThemeConfig.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.FarewellTemplate).filter(models.FarewellTemplate.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.TenantAnnouncement).filter(models.TenantAnnouncement.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.TableConfiguration).filter(models.TableConfiguration.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.CertificateTemplate).filter(models.CertificateTemplate.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.BillingTransaction).filter(models.BillingTransaction.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.TenantSubscription).filter(models.TenantSubscription.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(models.TenantBillingInfo).filter(models.TenantBillingInfo.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 3. Finally delete the Tenant itself
        db.delete(tenant)
        db.commit()
        
        # 4. Cleanup Filesystem
        tenant_static_dir = os.path.join("app", "static", "tenants", str(tenant_id))
        if os.path.exists(tenant_static_dir):
            try:
                shutil.rmtree(tenant_static_dir)
            except Exception as fs_err:
                print(f"WARNING: Could not delete static directory {tenant_static_dir}: {str(fs_err)}")
            
        return {"message": f"Tenant {tenant_slug} and all its data deleted successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: Failed to delete tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting tenant resources: {str(e)}")

@router.post("/tenants/{identifier}/reset-password")
async def reset_tenant_password(
    identifier: str,
    data: PasswordReset,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Reset password for the administrator of a specific tenant by ID or Slug
    """
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant_id = tenant.id
    # Find the tenant admin
    admin_user = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.role == UserRole.admin
    ).first()
    
    if not admin_user:
        raise HTTPException(status_code=404, detail="Administrador del tenant no encontrado")
    
    # Update password
    admin_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    
    return {"message": f"Contraseña actualizada para {admin_user.email}"}


@router.get("/tenants/{identifier}/users", response_model=List[UserSimpleResponse])
async def get_tenant_users(
    identifier: str,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    List all users belonging to a specific tenant (by ID or Slug)
    """
    # Determine if identifier is ID or slug
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    users = db.query(User).filter(User.tenant_id == tenant.id).all()
    return [
        UserSimpleResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else ""
        ) for u in users
    ]


@router.get("/tenants/{identifier}/modules")
async def get_tenant_modules(
    identifier: str,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Get the module configuration for a tenant (by ID or Slug)
    """
    # Determine if identifier is ID or slug
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get plan modules
    plan_modules = []
    if tenant.subscription_plan:
        plan_modules = tenant.subscription_plan.allowed_modules or []
    
    # Get overrides
    overrides = db.query(models.TenantModuleConfig).filter(
        models.TenantModuleConfig.tenant_id == tenant.id
    ).all()
    
    # Get all system modules for reference
    all_modules = db.query(models.Module).all()
    
    return {
        "plan_modules": plan_modules,
        "overrides": [
            {
                "role": o.role,
                "module_key": o.module_key,
                "is_active": o.is_active
            } for o in overrides
        ],
        "all_modules": sort_modules([
            {
                "key": m.key,
                "name": m.name,
                "description": m.description
            } for m in all_modules
        ])
    }


@router.put("/tenants/{tenant_id}/modules")
async def update_tenant_modules(
    tenant_id: int,
    overrides: List[TenantModuleConfigUpdate],
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    """
    Apply module overrides for a tenant
    """
    # Clear existing overrides for this tenant to simplify
    db.query(models.TenantModuleConfig).filter(
        models.TenantModuleConfig.tenant_id == tenant_id
    ).delete()
    
    # Add new ones
    for o in overrides:
        new_override = models.TenantModuleConfig(
            tenant_id=tenant_id,
            role=o.role,
            module_key=o.module_key,
            is_active=o.is_active
        )
        db.add(new_override)
    
    db.commit()
    return {"message": "Configuración de módulos actualizada"}
@router.post("/tenants/{identifier}/users", response_model=UserSimpleResponse)
async def create_tenant_user(
    identifier: str,
    user_data: UserCreate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """
    Create a new user for a specific tenant (accepts numeric ID or slug)
    """
    if identifier.isdigit():
        tenant = db.query(Tenant).filter(Tenant.id == int(identifier)).first()
    else:
        tenant = db.query(Tenant).filter(Tenant.slug == identifier).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")

    # Check limit against the TARGET tenant, not the creator's own tenant
    from app.utils.limit_checker import LimitChecker
    LimitChecker.check_limit(db, tenant.id, "users")

    # Check if user exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    new_user = User(
        tenant_id=tenant.id,
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=user_data.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # --- AUTO-PROVISIONING DE PERMISOS ---
    db.refresh(tenant)
    if tenant and tenant.subscription_plan:
        allowed_modules = tenant.subscription_plan.allowed_modules or []
        # Añadir módulos base que siempre están permitidos
        base_modules = ["dashboard", "perfil"]
        all_allowed = set(allowed_modules) | set(base_modules)
        
        for mod_key in all_allowed:
            # Crear permiso granular inicial
            new_perm = models.UserModulePermission(
                user_id=new_user.id,
                module_key=mod_key,
                is_active=True,
                actions={"view": True, "create": True, "edit": True, "delete": False} # Delete false por defecto para no-admins
            )
            # Si el usuario es admin, le damos todo (aunque rbac.py ya tiene bypass, es bueno para coherencia UI)
            if new_user.role == models.UserRole.admin:
                new_perm.actions["delete"] = True
                
            db.add(new_perm)
        db.commit()
    
    return UserSimpleResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at.isoformat() if new_user.created_at else ""
    )

@router.put("/users/{user_id}", response_model=UserSimpleResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    old_role = user.role
    
    if user_data.name is not None: user.name = user_data.name
    if user_data.email is not None: user.email = user_data.email
    if user_data.role is not None: user.role = user_data.role
    if user_data.is_active is not None: user.is_active = user_data.is_active
    if user_data.password:
        user.password_hash = get_password_hash(user_data.password)
    
    db.commit()
    db.refresh(user)

    # Si el rol cambió, regeneramos los permisos granulares por defecto
    if user_data.role is not None and old_role != user_data.role:
        # Borrar permisos anteriores
        db.query(models.UserModulePermission).filter(
            models.UserModulePermission.user_id == user_id
        ).delete()
        
        # Asignar nuevos defaults según el plan del tenant
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if tenant and tenant.subscription_plan:
            allowed_modules = tenant.subscription_plan.allowed_modules or []
            base_modules = ["dashboard", "perfil"]
            all_allowed = set(allowed_modules) | set(base_modules)
            
            for mod_key in all_allowed:
                # Crear permiso granular inicial
                new_perm = models.UserModulePermission(
                    user_id=user.id,
                    module_key=mod_key,
                    is_active=True,
                    actions={"view": True, "create": True, "edit": True, "delete": False}
                )
                # Lógica específica por rol (simple por ahora, igual que create)
                if user.role == models.UserRole.admin:
                    new_perm.actions["delete"] = True
                    
                db.add(new_perm)
            db.commit()
    return UserSimpleResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else ""
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado correctamente"}

@router.get("/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: int,
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Get all modules
    all_modules = db.query(models.Module).all()
    
    # Get user specific permissions
    permissions = db.query(models.UserModulePermission).filter(
        models.UserModulePermission.user_id == user_id
    ).all()
    
    return {
        "modules": sort_modules([
            {
                "key": m.key,
                "name": m.name,
                "description": m.description
            } for m in all_modules
        ]),
        "permissions": [
            {
                "module_key": p.module_key,
                "is_active": p.is_active,
                "actions": p.actions
            } for p in permissions
        ]
    }

@router.put("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: int,
    permissions: List[UserPermissionUpdate],
    current_creator: User = Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    # Clear and set new
    db.query(models.UserModulePermission).filter(
        models.UserModulePermission.user_id == user_id
    ).delete()
    
    for p in permissions:
        new_perm = models.UserModulePermission(
            user_id=user_id,
            module_key=p.module_key,
            is_active=p.is_active,
            actions=p.actions
        )
        db.add(new_perm)
    
    db.commit()
    return {"message": "Permisos actualizados correctamente"}
