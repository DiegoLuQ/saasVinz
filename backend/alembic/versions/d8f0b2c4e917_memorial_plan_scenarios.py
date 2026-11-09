"""memorial_plan_scenarios

Escenarios de diseño incluidos por plan de memorial (rec_plans.features.scenarios).
Valores iniciales: Partner = solo Santuario Sereno; Recuerdo = Santuario + Altar;
Eterno = + Jardín Celestial; Infinito = los 4. El SuperAdmin los cambia en
Admin → Memoriales → Planes y precios. Ver app/services/memorial_plans.py.

Revision ID: d8f0b2c4e917
Revises: c6f8a0b2d871
Create Date: 2026-11-08 20:30:00.000000

"""
import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd8f0b2c4e917'
down_revision: Union[str, Sequence[str], None] = 'c6f8a0b2d871'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ALL = ["normal", "altar", "cielo", "constelacion"]
INITIAL = {
    "partner": ["normal"],
    "recuerdo": ["normal", "altar"],
    "eterno": ["normal", "altar", "cielo"],
    "infinito": ALL,
}


def _set(conn, fn) -> None:
    rows = conn.execute(sa.text("SELECT id, name_db, kind, features FROM rec_plans")).fetchall()
    for pid, name_db, kind, features in rows:
        data = features if isinstance(features, dict) else (json.loads(features) if features else {})
        new = fn(dict(data), (name_db or "").lower(), kind)
        if new is not None:
            conn.execute(sa.text("UPDATE rec_plans SET features = CAST(:f AS JSON) WHERE id = :id"),
                         {"f": json.dumps(new), "id": pid})


def upgrade() -> None:
    def add(data, name_db, kind):
        if "scenarios" in data:
            return None
        if kind == "partner":
            data["scenarios"] = INITIAL["partner"]
        elif kind == "vinzer":
            data["scenarios"] = INITIAL.get(name_db, ALL)
        else:
            return None  # legacy: se rige por Partner
        return data
    _set(op.get_bind(), add)


def downgrade() -> None:
    def drop(data, name_db, kind):
        if "scenarios" not in data:
            return None
        data.pop("scenarios")
        return data
    _set(op.get_bind(), drop)
