import logging
from urllib.parse import quote, urlparse
from app.core.config import settings
from app.services.email import send_action_email
from app.services.family_notices import tenant_brand, _tracking_base
from app.services.public_form_config import tier_range_text
from app import models

logger = logging.getLogger(__name__)


def format_clp(val: float | int | None) -> str:
    if val is None:
        return "$0"
    return f"${int(round(val)):,}".replace(",", ".")


def _app_dashboard_url() -> str:
    parsed = urlparse(settings.FRONTEND_URL)
    host = parsed.netloc[4:] if parsed.netloc.startswith("www.") else parsed.netloc
    if "lvh.me" in host or "localhost" in host:
        return "http://app.lvh.me:3000/dashboard/ordenes-cremacion"
    return f"{parsed.scheme or 'https'}://app.{host}/dashboard/ordenes-cremacion"


async def send_submission_notifications(
    tenant_id: int,
    submission_id: int,
    submission_code: str,
    owner_dict: dict,
    pet_dict: dict,
    enriched_services: list[dict],
) -> None:
    """
    Envía las notificaciones por correo tras recibir una solicitud pública:
    1. Confirmación oficial a la familia (Reply-To = tenant.email).
    2. Alerta de nueva orden al tenant (Reply-To = email del cliente).
    """
    try:
        from app.database import SessionLocal
        from app.core.tenant_context import apply_bypass_rls

        db = SessionLocal()
        apply_bypass_rls(db)
        try:
            tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
            if not tenant:
                logger.warning("[EMAIL] Tenant %s no encontrado para envío de solicitud %s", tenant_id, submission_code)
                return

            customer_email = (owner_dict.get("email") or "").strip()
            tenant_email = (tenant.email or "").strip()
            customer_name = (owner_dict.get("fullName") or "Familia").strip()
            pet_name = (pet_dict.get("name") or "tu angelito").strip()
            species = (pet_dict.get("type") or "").strip()
            breed = (pet_dict.get("breed") or "").strip()

            # Resolver tramo de peso y recargo
            weight_tier_id = pet_dict.get("weightTierId")
            weight_kg = pet_dict.get("weightKg")
            matched_tier = None
            if weight_tier_id:
                try:
                    matched_tier = db.query(models.WeightPricing).filter(
                        models.WeightPricing.id == int(weight_tier_id),
                        models.WeightPricing.tenant_id == tenant.id
                    ).first()
                except Exception:
                    matched_tier = None

            tier_price = float(matched_tier.price or 0.0) if matched_tier and matched_tier.price else 0.0
            if matched_tier:
                range_str = tier_range_text(matched_tier.min_weight, matched_tier.max_weight)
                tier_name = f"{matched_tier.label} ({range_str})" if matched_tier.label else range_str
            else:
                tier_name = f"{weight_kg} kg" if weight_kg else (pet_dict.get("weightRange") or "")

            # Extraer planes y adicionales
            plan_item = next((s for s in enriched_services if s.get("type") == "plan"), None)
            plan_name = plan_item.get("name") if plan_item else None
            plan_price = float(plan_item.get("price") or 0.0) if plan_item else 0.0

            extra_items = [s for s in enriched_services if s.get("type") != "plan"]
            extras_total = sum(float(s.get("price") or 0.0) for s in extra_items)
            total_price = plan_price + extras_total + tier_price
            # «Precio a cotizar» y notas importantes de los servicios (constancia del aviso)
            on_request = [s.get("name") for s in extra_items if s.get("price_on_request")]
            notes = [(s.get("name"), s.get("important_note")) for s in extra_items if s.get("important_note")]

            def _extra_label(s: dict, with_price: bool) -> str:
                if s.get("price_on_request"):
                    return f"{s.get('name')} (precio a cotizar)"
                return f"{s.get('name')} ({format_clp(s.get('price'))})" if with_price else str(s.get("name"))

            # URLs
            tracking_link = f"{_tracking_base()}/{tenant.slug}/track/{quote(pet_name)}/{submission_code}"
            dashboard_link = _app_dashboard_url()
            brand = tenant_brand(tenant)

            # -------------------------------------------------------------
            # 1. Correo a la Familia (Confirmación)
            # -------------------------------------------------------------
            if customer_email and "@" in customer_email:
                family_rows = [
                    ("Código de solicitud", submission_code),
                    ("Mascota", f"{pet_name}{f' ({species})' if species else ''}"),
                ]
                if plan_name:
                    family_rows.append(("Plan contratado", f"{plan_name} — {format_clp(plan_price)}" if plan_price > 0 else plan_name))
                if tier_name:
                    family_rows.append(("Tramo de peso", f"{tier_name} — {format_clp(tier_price)}" if tier_price > 0 else tier_name))
                if extra_items:
                    family_rows.append(("Servicios adicionales", ", ".join(_extra_label(s, False) for s in extra_items)))
                if total_price > 0:
                    family_rows.append(("Total estimado", format_clp(total_price) + (" + servicios a cotizar" if on_request else "")))
                for name, note in notes:
                    family_rows.append((f"Importante · {name}", note))

                # «Recuerdos para honrar a X»: hasta 6 productos (el más vendido siempre) + catálogo
                # oficial; solo con los enlaces oficiales completos (services/official_links.py).
                souvenirs = None
                try:
                    from app.services import official_links
                    shop_url = official_links.with_ref(official_links.store_url(db, tenant), submission_code)
                    items = official_links.souvenir_products(db, tenant.id) if shop_url else []
                    if items:
                        souvenirs = {
                            "title": f"Recuerdos para honrar a {pet_name}",
                            "subtitle": f"Lleva a {pet_name} siempre cerca. Puedes revisar con calma las opciones de relicarios y recuerdos.",
                            "items": [{"name": p.name, "price": format_clp(p.sale_price) if (p.sale_price or 0) > 0 else "",
                                       "image_url": p.image_url} for p in items],
                            "button_label": "Ver catálogo de recuerdos y relicarios",
                            "url": shop_url,
                        }
                except Exception as e:
                    logger.warning("[EMAIL] No se pudo armar el bloque de recuerdos (%s): %s", submission_code, e)

                try:
                    await send_action_email(
                        to=customer_email,
                        subject=f"Recibimos tu solicitud para {pet_name} — {tenant.name}",
                        title="Recibimos tu solicitud",
                        paragraphs=[
                            f"Hola {customer_name.split(' ')[0]}:",
                            f"Hemos recibido tu solicitud para acompañar a {pet_name}. En {tenant.name} cuidaremos cada detalle con el máximo cariño y respeto.",
                            "Nuestro equipo revisará la información y se pondrá en contacto contigo a la brevedad para coordinar todos los detalles.",
                            *([f"El valor de {', '.join(on_request)} no está incluido en el total: {tenant.name} te lo informará antes de realizarlo."] if on_request else []),
                        ],
                        button_label="Ver seguimiento en vivo",
                        button_url=tracking_link,
                        footer=f"Si tienes dudas o necesitas asistencia, comunícate directamente con {tenant.name} a través de sus canales de atención.",
                        kicker=tenant.name,
                        brand=brand,
                        reply_to=tenant_email or None,
                        rows=family_rows,
                        products=souvenirs,
                    )
                    logger.info("[EMAIL] Confirmación enviada a la familia: %s (%s)", customer_email, submission_code)
                except Exception as e:
                    logger.error("[EMAIL] Error enviando confirmación a la familia (%s): %s", customer_email, e)

            # -------------------------------------------------------------
            # 2. Correo al Tenant (Alerta de Nueva Orden)
            # -------------------------------------------------------------
            if tenant_email and "@" in tenant_email:
                tenant_rows = [
                    ("Código de solicitud", submission_code),
                    ("Tutor / Familia", customer_name),
                    ("Teléfono / WhatsApp", str(owner_dict.get("phone") or "No indicado")),
                    ("Email tutor", customer_email or "No indicado"),
                ]
                if owner_dict.get("rut"):
                    tenant_rows.append(("RUT tutor", str(owner_dict.get("rut"))))
                tenant_rows.append(("Mascota", f"{pet_name} ({species}{f' - {breed}' if breed else ''})"))
                if tier_name:
                    tenant_rows.append(("Tamaño / Peso", f"{tier_name} (+{format_clp(tier_price)})" if tier_price > 0 else tier_name))
                if plan_name:
                    tenant_rows.append(("Plan elegido", f"{plan_name} ({format_clp(plan_price)})" if plan_price > 0 else plan_name))
                if extra_items:
                    tenant_rows.append(("Servicios adicionales", ", ".join(_extra_label(s, True) for s in extra_items)))
                if total_price > 0:
                    tenant_rows.append(("Total estimado", format_clp(total_price) + (" + servicios a cotizar" if on_request else "")))
                if on_request:
                    tenant_rows.append(("Por cotizar", "Informa a la familia el valor de: " + ", ".join(on_request)))
                for name, note in notes:
                    tenant_rows.append((f"Nota mostrada · {name}", note))
                if owner_dict.get("veterinary"):
                    tenant_rows.append(("Lugar de retiro", str(owner_dict.get("veterinary"))))
                if owner_dict.get("address"):
                    tenant_rows.append(("Dirección entrega", str(owner_dict.get("address"))))
                if owner_dict.get("comments"):
                    tenant_rows.append(("Comentarios", str(owner_dict.get("comments"))))

                try:
                    await send_action_email(
                        to=tenant_email,
                        subject=f"🐾 Nueva solicitud: {pet_name} ({customer_name}) — Código {submission_code}",
                        title="Nueva solicitud de servicio recibida",
                        paragraphs=[
                            f"Has recibido una nueva solicitud de servicio a través del formulario público de {tenant.name}.",
                            f"El tutor {customer_name} ha ingresado los datos para su mascota {pet_name}. Revisa los detalles a continuación para coordinar la atención.",
                        ],
                        button_label="Ver órdenes en el panel",
                        button_url=dashboard_link,
                        footer=f"Solicitud registrada a través de la plataforma web de {tenant.name}.",
                        kicker="Nueva Solicitud",
                        brand=brand,
                        reply_to=customer_email or None,
                        rows=tenant_rows,
                    )
                    logger.info("[EMAIL] Alerta de nueva orden enviada al tenant: %s (%s)", tenant_email, submission_code)
                except Exception as e:
                    logger.error("[EMAIL] Error enviando alerta al tenant (%s): %s", tenant_email, e)

        finally:
            db.close()
    except Exception as e:
        logger.exception("[EMAIL] Error general en send_submission_notifications: %s", e)
