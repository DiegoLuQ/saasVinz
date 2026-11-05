"""Grupos de planes (srv_plans.group_name) y el filtro por grupo de cada enlace
del catálogo de planes (inv_catalog_tokens.plan_groups).

plan_groups: None = el enlace muestra todos los planes activos; si no, la lista
de grupos que muestra, donde "" representa los planes «Sin grupo». Se compara
sin distinguir mayúsculas.
"""
from typing import Iterable, List, Optional

from sqlalchemy.orm import Session

from app import models
from app.api.internal.catalog.schemas import clean_group_name

MAX_LINK_GROUPS = 50


def clean_plan_groups(raw: Optional[Iterable]) -> Optional[List[str]]:
    """Normaliza la lista de un enlace: sin repetidos; vacía o None = todos (None)."""
    if raw is None:
        return None
    out: List[str] = []
    seen = set()
    for value in list(raw)[:MAX_LINK_GROUPS]:
        name = clean_group_name(value) or ""  # vacío = «Sin grupo»
        if name.lower() not in seen:
            seen.add(name.lower())
            out.append(name)
    return out or None


def plan_matches(group_name: Optional[str], groups: Optional[List[str]]) -> bool:
    if not groups:
        return True
    wanted = {g.lower() for g in groups}
    return (group_name or "").lower() in wanted


def existing_plan_groups(db: Session, tenant_id: int) -> List[str]:
    rows = (
        db.query(models.Plan.group_name)
        .filter(models.Plan.tenant_id == tenant_id, models.Plan.group_name.isnot(None))
        .distinct()
        .all()
    )
    return sorted({g for (g,) in rows if g}, key=str.lower)


def rename_in_links(db: Session, tenant_id: int, old: str, new: Optional[str]) -> None:
    """Al renombrar un grupo, los enlaces que lo mostraban siguen mostrándolo."""
    from app.api.internal.catalog.models import CatalogShareToken

    tokens = db.query(CatalogShareToken).filter(
        CatalogShareToken.tenant_id == tenant_id,
        CatalogShareToken.catalog_type == "plans",
        CatalogShareToken.plan_groups.isnot(None),
    ).all()
    for t in tokens:
        groups = list(t.plan_groups or [])
        if any(g.lower() == old.lower() for g in groups):
            groups = [new or "" if g.lower() == old.lower() else g for g in groups]
            t.plan_groups = clean_plan_groups(groups)
