from fastapi import Depends, HTTPException, status
from app.api.deps import get_current_user
from app import models


def check_feature(feature_key: str, default: bool = False):
    """
    Factory de dependencia que valida que el plan del tenant tenga habilitado un
    feature flag granular (ej. 'certificados:generar_pdf', 'mascotas:memorial').

    Fuente de verdad: SubscriptionPlan.features (dict configurable desde el panel
    admin -> Planes -> "Configurar Características"). Reemplaza los antiguos
    candados hardcodeados por NOMBRE de plan (['PRO','ULTRA']).
    """
    def dependency(current_user: models.User = Depends(get_current_user)) -> bool:
        # SuperAdmin (creator) no está sujeto a restricciones de plan
        if current_user.role in ("creator", models.UserRole.creator):
            return True

        tenant = getattr(current_user, "tenant", None)

        # Bloqueo por suscripción vencida (post-gracia): el módulo es el prefijo
        # del feature_key (ej. 'certificados:generar_pdf' -> 'certificados').
        from app.utils.subscription import is_subscription_locked, ALLOWED_MODULES_WHEN_LOCKED
        module_of_feature = feature_key.split(":", 1)[0]
        if module_of_feature not in ALLOWED_MODULES_WHEN_LOCKED and is_subscription_locked(tenant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "subscription_locked",
                    "module": module_of_feature,
                    "message": "Tu suscripción venció y el período de gracia finalizó. Regulariza tu pago en Configuración → Facturación para reactivar esta función.",
                },
            )

        # Control de acceso por features: usamos effective_plan (respeta el plan
        # demo vigente, igual que check_permission). Fallback al plan contratado.
        plan = None
        if tenant:
            plan = getattr(tenant, "effective_plan", None) or getattr(tenant, "subscription_plan", None)
        features = getattr(plan, "features", None) if plan else None
        if not isinstance(features, dict):
            features = {}

        enabled = features.get(feature_key, default)
        if not isinstance(enabled, bool):
            enabled = default

        if not enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Característica no incluida en tu plan",
                    "feature": feature_key,
                    "message": "Tu plan actual no incluye esta característica. Habilítala desde la configuración del plan.",
                },
            )
        return True

    return dependency
