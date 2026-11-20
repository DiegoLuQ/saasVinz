"""price_seasons

Temporadas de precios de los planes SaaS (Admin → Planes → «Temporadas de precios»):
cada una tiene nombre, precio mensual por plan, % de descuento anual, aviso de
«precio de lanzamiento» y, opcional, otra temporada cuyo precio se muestra tachado.
Una sola está vigente; al activarla se copian sus precios a sys_subscription_plans
(price / annual_price) y su % a sys_saas_config, así todo el sistema la usa.
Los crematorios que ya contrataron mantienen su precio (sys_tenants.contracted_price)
y ahora guardan con qué temporada lo contrataron (contracted_season).

Seed: «Lanzamiento» = los precios y el descuento de hoy (vigente). Los crematorios
con precio congelado quedan marcados con esa temporada.

Revision ID: a3e5c7f9b192
Revises: f3c5d7e9a281
Create Date: 2026-11-20 10:00:00.000000

"""
import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'a3e5c7f9b192'
down_revision: Union[str, Sequence[str], None] = 'f3c5d7e9a281'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_price_seasons (
            id SERIAL PRIMARY KEY,
            name VARCHAR(60) NOT NULL,
            prices JSON NOT NULL DEFAULT '{}',
            annual_discount_pct INTEGER NOT NULL DEFAULT 0,
            launch BOOLEAN NOT NULL DEFAULT FALSE,
            compare_season_id INTEGER NULL REFERENCES sys_price_seasons(id) ON DELETE SET NULL,
            is_current BOOLEAN NOT NULL DEFAULT FALSE,
            activated_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uix_price_season_current ON sys_price_seasons ((is_current)) WHERE is_current;
        ALTER TABLE sys_tenants ADD COLUMN IF NOT EXISTS contracted_season VARCHAR(60);
    """)

    conn = op.get_bind()
    if not conn.execute(sa.text("SELECT 1 FROM sys_price_seasons LIMIT 1")).first():
        prices = {str(pid): float(price) for pid, price in conn.execute(
            sa.text("SELECT id, price FROM sys_subscription_plans WHERE price IS NOT NULL")).all()}
        cfg = conn.execute(sa.text("SELECT annual_discount_pct, annual_discount_launch FROM sys_saas_config LIMIT 1")).first()
        pct = int(cfg[0]) if cfg and cfg[0] is not None else 25
        launch = bool(cfg[1]) if cfg and cfg[1] is not None else True
        conn.execute(
            sa.text("""INSERT INTO sys_price_seasons (name, prices, annual_discount_pct, launch, is_current, activated_at)
                       VALUES ('Lanzamiento', CAST(:p AS JSON), :pct, :launch, TRUE, now())"""),
            {"p": json.dumps(prices), "pct": pct, "launch": launch},
        )
        conn.execute(sa.text(
            "UPDATE sys_tenants SET contracted_season = 'Lanzamiento' "
            "WHERE contracted_price IS NOT NULL AND contracted_season IS NULL"))

    _grant_to_app_role()


def _grant_to_app_role() -> None:
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_price_seasons TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_price_seasons_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE sys_tenants DROP COLUMN IF EXISTS contracted_season;
        DROP TABLE IF EXISTS sys_price_seasons CASCADE;
    """)
