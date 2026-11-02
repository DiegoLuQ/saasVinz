"""track_plan_explicit (plan TRACK con todas sus funciones definidas)

TRACK = plan de entrada «Controla cada servicio. Mantén informada a cada
familia.». Hasta ahora varias funciones quedaban incluidas por no estar
configuradas (flag ausente = permitido) o por la regla de respaldo del código
(marca blanca). Aquí se fijan TODAS en true/false, junto con precio y límites.
Solo toca la fila TRACK; FREE, NORMAL, PRO y ULTRA no cambian.

Mascotas y clientes ya no son un límite de los planes (no se aplican), por eso
max_pets / max_customers no se tocan.

Revision ID: e2b4d6f8a136
Revises: d0f2b4c6e813
Create Date: 2026-11-02 18:00:00.000000

"""
import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e2b4d6f8a136'
down_revision: Union[str, Sequence[str], None] = 'd0f2b4c6e813'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PRICE = 29900.0

TRACK_FEATURES = {
    # Dashboard
    "dashboard:metricas": True,
    # Clientes y mascotas (sin eliminar: can_delete = false)
    "clientes:crear": True, "clientes:editar": True, "clientes:eliminar": False,
    "clientes:convenios": False,
    "mascotas:crear": True, "mascotas:editar": True, "mascotas:eliminar": False,
    "mascotas:memorial": False,
    # Servicios, planes y órdenes
    "servicios:crear": True, "servicios:editar": True,
    "ordenes:crear": True, "ordenes:editar": True, "ordenes:eliminar": False,
    # Inventario (sin catálogo público de productos ni PDF)
    "inventario:productos:crear": True, "inventario:productos:editar": True,
    "inventario:productos:eliminar": False,
    "inventario:productos:catalogo": False, "inventario:productos:descargar_pdf": False,
    "inventario:categorias:gestionar": True, "inventario:proveedores:gestionar": True,
    # Documentos: certificado, repositorio, tarjetas y diseños para redes
    # (la IA consume créditos comprados: TRACK tiene 0 mensuales). Sin «Generar todo».
    "certificados:generar_pdf": True, "certificados:repositorio": True,
    "certificados:diseno": True, "certificados:redes": True,
    "certificados:generar_todo": False,
    # Operación y seguimiento para la familia (argumento principal del plan)
    "operaciones:panel": True, "operaciones:seguimiento:crear": True,
    "operaciones:avisos_familia": True,
    "pagos:ver_historial": True,
    # Veterinarias
    "veterinarios:gestionar": False, "veterinarios:comisiones:ver": False,
    "veterinarios:comisiones:liquidar": False,
    # Configuración
    "configuracion:roles": False, "configuracion:usuarios": False,
    "configuracion:formulario": True, "configuracion:flujo": True,
    "configuracion:creditos_ia": True,
    "configuracion:sin_marca_vinzer": False,
    # Integraciones
    "integraciones:widget": False, "integraciones:formulario_incrustable": False,
    "integraciones:video_bienvenida": False,
}


def upgrade() -> None:
    bind = op.get_bind()
    row = bind.execute(sa.text(
        "SELECT id FROM sys_subscription_plans WHERE upper(trim(name)) = 'TRACK'"
    )).first()
    if not row:
        return
    pct = bind.execute(sa.text(
        "SELECT annual_discount_pct FROM sys_saas_config LIMIT 1"
    )).scalar()
    pct = int(pct or 0)
    annual = float(round(PRICE * 12 * (1 - pct / 100)))
    bind.execute(sa.text("""
        UPDATE sys_subscription_plans SET
            features = CAST(:features AS json),
            price = :price, annual_price = :annual,
            max_orders = 25, max_users = 2, max_partners = 0,
            max_services = 10, max_plans = 5, max_products = 15,
            ai_monthly_credits = 0,
            can_delete = false, can_export = false,
            updated_at = now()
        WHERE id = :id
    """), {"features": json.dumps(TRACK_FEATURES), "price": PRICE, "annual": annual, "id": row.id})


def downgrade() -> None:
    # Configuración comercial: no se restaura la anterior (se edita en Admin → Planes).
    pass
