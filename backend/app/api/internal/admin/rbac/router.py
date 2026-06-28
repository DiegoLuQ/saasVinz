from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, auth, schemas
from typing import List, Literal
from pydantic import BaseModel

router = APIRouter()

# Módulo estructural: siempre activo para todos los roles, no editable desde el
# blueprint (cada usuario necesita su perfil). 'dashboard' SÍ es controlable por rol.
PROTECTED_MODULES = {"perfil"}

class ModuleToggle(BaseModel):
    role: str
    module_key: str
    is_active: bool

class BlueprintCell(BaseModel):
    role: str
    module_key: str
    # mandatory  -> fila con is_mandatory=True
    # optional   -> fila con is_mandatory=False
    # disabled   -> sin fila (el rol no tiene el módulo en el blueprint)
    state: Literal["mandatory", "optional", "disabled"]

class BlueprintUpdate(BaseModel):
    cells: List[BlueprintCell]

@router.get("/modules")
def get_modules(db: Session = Depends(get_db)):
    """Lista todos los módulos disponibles en el sistema."""
    return db.query(models.Module).all()

@router.get("/blueprint")
def get_blueprint(db: Session = Depends(get_db)):
    """Retorna la matriz maestra (blueprint) de roles y módulos."""
    return db.query(models.RoleModuleBlueprint).all()

@router.post("/blueprint/update")
def update_blueprint(
    data: BlueprintUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_creator)
):
    """
    Reemplaza la matriz global de blueprint de roles/módulos. Solo el Creador.

    Recibe la matriz completa (lista de celdas con su estado) y la reconcilia
    en UNA transacción: upsert de las celdas mandatory/optional y borrado de las
    que pasaron a 'disabled'. Si algo falla, se revierte todo (no deja el RBAC
    global en estado parcial).
    """
    # 1. Validar roles y módulos contra el sistema (rechazar claves desconocidas)
    valid_roles = {r.value for r in models.UserRole}
    valid_modules = {m.key for m in db.query(models.Module).all()}

    for cell in data.cells:
        if cell.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Rol inválido: {cell.role}")
        if cell.module_key not in valid_modules:
            raise HTTPException(status_code=400, detail=f"Módulo inválido: {cell.module_key}")

    # 2. Reconciliar en una sola transacción
    try:
        upserts = 0
        deletes = 0
        for cell in data.cells:
            # Los módulos estructurales nunca se almacenan en el blueprint
            if cell.module_key in PROTECTED_MODULES:
                continue

            existing = db.query(models.RoleModuleBlueprint).filter(
                models.RoleModuleBlueprint.role == cell.role,
                models.RoleModuleBlueprint.module_key == cell.module_key
            ).first()

            if cell.state == "disabled":
                if existing:
                    db.delete(existing)
                    deletes += 1
            else:
                is_mandatory = cell.state == "mandatory"
                if existing:
                    if existing.is_mandatory != is_mandatory:
                        existing.is_mandatory = is_mandatory
                        upserts += 1
                else:
                    db.add(models.RoleModuleBlueprint(
                        role=cell.role,
                        module_key=cell.module_key,
                        is_mandatory=is_mandatory
                    ))
                    upserts += 1

        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar el blueprint: {e}")

    return {"status": "success", "upserts": upserts, "deletes": deletes}

@router.get("/tenant-config/{role}", response_model=List[dict])
def get_tenant_config(
    role: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Retorna la configuración de todos los módulos del sistema para un rol específico."""
    # 1. Obtener todos los módulos del sistema
    all_modules = db.query(models.Module).all()
    
    # 2. Obtener Blueprint para este rol (para saber qué es obligatorio)
    blueprint = db.query(models.RoleModuleBlueprint).filter(
        models.RoleModuleBlueprint.role == role
    ).all()
    bp_map = {b.module_key: b.is_mandatory for b in blueprint}
    
    # 3. Plan EFECTIVO del tenant (demo si está vigente) — coherente con el
    #    bootstrap y check_permission.
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    plan = tenant.effective_plan if tenant else None
    allowed_by_plan = (plan.allowed_modules or []) if plan else []

    # 4. Config del tenant (el admin puede apagar opcionales)
    tenant_configs = db.query(models.TenantModuleConfig).filter(
        models.TenantModuleConfig.tenant_id == current_user.tenant_id,
        models.TenantModuleConfig.role == role
    ).all()
    config_map = {c.module_key: c.is_active for c in tenant_configs}

    # 5. Capa de ROL: si el rol tiene blueprint definido es autoritativo
    #    (admin/creator exentos: mantienen lo permitido por el plan).
    base_modules = ["dashboard", "perfil"]  # exentos del techo del plan
    role_is_privileged = role in (models.UserRole.admin, models.UserRole.creator)
    role_allowed_keys = None
    if blueprint and not role_is_privileged:
        # Solo 'perfil' es base siempre-permitido. 'dashboard' es controlable:
        # debe estar en el blueprint del rol para quedar habilitado.
        role_allowed_keys = set(bp_map.keys()) | {"perfil"}

    # 6. Mezclar
    result = []
    for m in all_modules:
        is_in_bp = m.key in bp_map or m.key in allowed_by_plan
        is_mandatory = bp_map.get(m.key, False)
        in_plan = m.key in allowed_by_plan or m.key in base_modules

        if role_allowed_keys is not None:
            # Blueprint autoritativo para este rol
            if m.key not in role_allowed_keys or not in_plan:
                # fuera del blueprint del rol, o el plan no lo incluye (techo)
                is_active = False
            elif is_mandatory:
                is_active = True
            else:
                # opcional: visible por defecto salvo que el tenant lo apague
                is_active = config_map.get(m.key, True)
        else:
            # Sin blueprint para el rol (o admin/creator): comportamiento previo
            default_active = is_mandatory or (role_is_privileged and in_plan)
            is_active = config_map.get(m.key, default_active)
            if role_is_privileged and in_plan:
                is_active = True
            if not in_plan and m.key != "configuracion":
                is_active = False

        result.append({
            "module_key": m.key,
            "name": m.name,
            "icon": m.icon,
            "is_mandatory": is_mandatory,
            "is_active": is_active,
            "is_in_blueprint": is_in_bp
        })

    return result

@router.put("/toggle-module")
def toggle_module(
    data: ModuleToggle,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Permite al Admin del tenant (o al Creator) activar/desactivar módulos opcionales."""
    if current_user.role not in (models.UserRole.admin, models.UserRole.creator):
        raise HTTPException(status_code=403, detail="Solo el Administrador puede cambiar configuraciones.")

    # 1. Validar que el módulo existe
    module = db.query(models.Module).filter(models.Module.key == data.module_key).first()
    if not module:
        raise HTTPException(status_code=404, detail="Módulo no encontrado.")

    # 2. Verificar si es obligatorio en el blueprint (si existe en el blueprint)
    bp = db.query(models.RoleModuleBlueprint).filter(
        models.RoleModuleBlueprint.role == data.role,
        models.RoleModuleBlueprint.module_key == data.module_key
    ).first()
    
    if bp and bp.is_mandatory and not data.is_active:
        raise HTTPException(status_code=400, detail="No se puede desactivar un módulo obligatorio.")

    # 2. Actualizar o Crear config
    config = db.query(models.TenantModuleConfig).filter(
        models.TenantModuleConfig.tenant_id == current_user.tenant_id,
        models.TenantModuleConfig.role == data.role,
        models.TenantModuleConfig.module_key == data.module_key
    ).first()
    
    if config:
        config.is_active = data.is_active
    else:
        new_config = models.TenantModuleConfig(
            tenant_id=current_user.tenant_id,
            role=data.role,
            module_key=data.module_key,
            is_active=data.is_active
        )
        db.add(new_config)
    
    db.commit()
    return {"status": "success", "is_active": data.is_active}
@router.get("/my-modules", response_model=List[str])
def get_my_modules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Calcula los módulos finales activos para el usuario actual,
    mezclando la config por rol del tenant y los overrides granulares por usuario.
    """
    # 1. Obtener config base por rol para el tenant
    role_config = db.query(models.TenantModuleConfig).filter(
        models.TenantModuleConfig.tenant_id == current_user.tenant_id,
        models.TenantModuleConfig.role == current_user.role,
        models.TenantModuleConfig.is_active == True
    ).all()
    
    active_keys = {cfg.module_key for cfg in role_config}
    
    # 1.1 Incluir módulos mandatorios del blueprint que NO estén en la config (pero que deberían estar activos)
    blueprint_mandatory = db.query(models.RoleModuleBlueprint).filter(
        models.RoleModuleBlueprint.role == current_user.role,
        models.RoleModuleBlueprint.is_mandatory == True
    ).all()
    
    for bp in blueprint_mandatory:
        active_keys.add(bp.module_key)

    # 2. Filtrar por Plan de Suscripción (Capa Base del Tenant)
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    if tenant and tenant.subscription_plan_id:
        plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == tenant.subscription_plan_id).first()
        if plan:
            base_modules = {"dashboard", "perfil"}
            allowed_set = set(plan.allowed_modules) | base_modules
            active_keys = {k for k in active_keys if k in allowed_set}
    
    # 3. Obtener overrides granulares del usuario (Capa Final - PREVALECE)
    user_perms = db.query(models.UserModulePermission).filter(
        models.UserModulePermission.user_id == current_user.id
    ).all()
    for up in user_perms:
        if up.is_active:
            active_keys.add(up.module_key)
        else:
            if up.module_key in active_keys:
                active_keys.remove(up.module_key)
                    
    return list(active_keys)
    
@router.get("/my-permissions")
def get_my_granular_permissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Retorna todos los permisos granulares (acciones) del usuario actual, filtrados por plan."""
    
    # 1. Obtener el Plan del Tenant
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    # Plan efectivo: demo si está vigente, si no el contratado
    plan = tenant.effective_plan if tenant else None

    # 2. Obtener permisos base del usuario
    user_perms = db.query(models.UserModulePermission).filter(
        models.UserModulePermission.user_id == current_user.id
    ).all()
    
    # Convertir a dict para manipular
    perms_dict = {p.module_key: p for p in user_perms}
    
    # 3. Si es Admin, asegurar que tiene todos los módulos (que el plan permita)
    if current_user.role == models.UserRole.admin:
        all_modules = db.query(models.Module).all()
        for m in all_modules:
            if m.key not in perms_dict:
                # Crear permiso ficticio para el Admin
                perms_dict[m.key] = schemas.UserPermissionInDB(
                    id=0,
                    user_id=current_user.id,
                    module_key=m.key,
                    is_active=True,
                    actions={"view": True, "create": True, "edit": True, "delete": True}
                )

    # 4. Aplicar Overrides de Plan (CAPA BASE - Se puede sobreescribir por granular)
    result = []
    base_modules = {"dashboard", "perfil"}
    
    # Identificar cuáles perms son explícitos de DB (no generados dinámicamente para admin)
    explicit_perms_keys = {p.module_key for p in user_perms}
    
    for module_key, perm in perms_dict.items():
        # Clonar acciones para no modificar el objeto original si viene de DB
        actions = dict(perm.actions) if hasattr(perm, 'actions') else dict(perm["actions"])
        is_active = perm.is_active if hasattr(perm, 'is_active') else perm["is_active"]
        
        # Si NO es un permiso explícito (es uno heredado o generado para admin), aplicamos límites de plan
        if plan and module_key not in explicit_perms_keys:
            # Si el módulo no está en el plan, desactivar
            if module_key not in plan.allowed_modules and module_key not in base_modules:
                is_active = False
            
            # Si el plan prohíbe eliminación
            if not plan.can_delete:
                # Excepción: Servicios en FREE pueden borrarse (seguimos lógica anterior)
                if module_key != "servicios":
                    actions["delete"] = False
        
        result.append({
            "module_key": module_key,
            "is_active": is_active,
            "actions": actions
        })
        
    return result

def check_permission(module_key: str, action: str):
    """
    Dependencia reutilizable para verificar permisos granulares.
    Uso: Depends(check_permission("mascotas", "delete"))
    """
    def _check(
        db: Session = Depends(get_db),
        current_user: models.User = Depends(auth.get_current_user)
    ):
        # 0. Creator (SuperAdmin) siempre tiene permiso total — bypass todo
        if current_user.role in (models.UserRole.creator, "creator"):
            return True

        # 0.5 Bloqueo por suscripción vencida (post-gracia): se bloquean todos los
        #     módulos excepto configuracion/dashboard/perfil para que el tenant
        #     pueda regularizar el pago. Ver utils.subscription.
        from app.utils.subscription import is_subscription_locked, ALLOWED_MODULES_WHEN_LOCKED
        if module_key not in ALLOWED_MODULES_WHEN_LOCKED:
            if is_subscription_locked(getattr(current_user, "tenant", None)):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "subscription_locked",
                        "module": module_key,
                        "message": "Tu suscripción venció y el período de gracia finalizó. Regulariza tu pago en Configuración → Facturación para reactivar este módulo.",
                    },
                )

        # 0.7 Techo de ROL (blueprint global). Si el rol tiene blueprint definido,
        #     es autoritativo: un módulo fuera de él queda SIN acceso para ese rol,
        #     por encima de cualquier permiso por-usuario obsoleto. Admin/creator exentos.
        role_blueprint = []
        if current_user.role not in (models.UserRole.admin, models.UserRole.creator, "creator"):
            role_blueprint = db.query(models.RoleModuleBlueprint).filter(
                models.RoleModuleBlueprint.role == current_user.role
            ).all()
        role_allowed_keys = None
        role_mandatory_keys = set()
        if role_blueprint:
            role_mandatory_keys = {b.module_key for b in role_blueprint if b.is_mandatory}
            # Solo 'perfil' es base siempre-permitido; 'dashboard' es controlable.
            role_allowed_keys = {b.module_key for b in role_blueprint} | {"perfil"}
            if module_key not in role_allowed_keys:
                raise HTTPException(status_code=403, detail=f"Tu rol no tiene acceso al módulo {module_key}")

        # 1. Buscar override granular individual para el usuario (CAPA DE EXCEPCIÓN)
        perm = db.query(models.UserModulePermission).filter(
            models.UserModulePermission.user_id == current_user.id,
            models.UserModulePermission.module_key == module_key
        ).first()

        # Si hay un override granular explícito, este MANDA sobre el plan
        if perm:
            if not perm.is_active:
                raise HTTPException(status_code=403, detail=f"Acceso denegado al módulo {module_key}")

            if not perm.actions.get(action):
                raise HTTPException(status_code=403, detail=f"No tienes permiso para {action} en {module_key}")

            return True

        # 2. Verificación de Plan de Suscripción (Si no hay override granular)
        #    Usa el plan efectivo (demo si está vigente, si no el contratado)
        tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
        plan = tenant.effective_plan if tenant else None
        if plan:
            base_modules = {"dashboard", "perfil"}
            if module_key not in (plan.allowed_modules or []) and module_key not in base_modules:
                raise HTTPException(status_code=403, detail=f"El módulo {module_key} no está incluido en tu plan actual ({plan.name})")

            if action == "delete" and not plan.can_delete:
                if module_key != "servicios":
                    raise HTTPException(status_code=403, detail=f"Tu plan actual ({plan.name}) no permite eliminar registros en este módulo.")

        # 3. Admin siempre tiene permiso total para los módulos habilitados por plan
        if current_user.role == models.UserRole.admin:
            return True

        # 4. Fallback: Si no hay override granular, verificar si el módulo está activo para su ROL en el tenant
        # Un módulo se considera activo si:
        # a) Tiene un registro en TenantModuleConfig con is_active=True
        # b) NO tiene registro en TenantModuleConfig pero es MANDATORIO en el blueprint para ese rol
        
        tenant_config = db.query(models.TenantModuleConfig).filter(
            models.TenantModuleConfig.tenant_id == current_user.tenant_id,
            models.TenantModuleConfig.role == current_user.role,
            models.TenantModuleConfig.module_key == module_key
        ).first()

        is_active = False
        if tenant_config:
            is_active = tenant_config.is_active
            # Un mandatorio del blueprint no se puede apagar desde el tenant
            if module_key in role_mandatory_keys:
                is_active = True
        elif role_allowed_keys is not None:
            # Blueprint autoritativo para este rol y el módulo está permitido
            # (ya pasó el techo): opcionales y mandatorios visibles por defecto.
            is_active = True
        else:
            # Sin blueprint para el rol: comportamiento previo (solo mandatorio activa)
            bp = db.query(models.RoleModuleBlueprint).filter(
                models.RoleModuleBlueprint.role == current_user.role,
                models.RoleModuleBlueprint.module_key == module_key
            ).first()
            if bp and bp.is_mandatory:
                is_active = True

        # Si el módulo está activo para el rol, permitimos todas las acciones EXCEPTO delete (por seguridad base)
        # El Admin puede otorgar 'delete' explícitamente creando un permiso granular.
        if is_active:
            if action == "delete":
                raise HTTPException(status_code=403, detail=f"Solo administradores pueden eliminar en {module_key}")
            return True
            
        raise HTTPException(status_code=403, detail=f"No tienes acceso al módulo {module_key}")

    return _check
