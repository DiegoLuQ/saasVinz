"""
Carga masiva de servicios desde Excel, hecha por el propio crematorio
(Gestión de Servicios → Importar Excel).

- Identidad de un servicio = nombre + grupo (sin mayúsculas): el mismo nombre
  puede existir en grupos distintos. Si ya existe en ese grupo, la fila se omite
  (nunca actualiza ni borra).
- Se respeta el límite del plan (`max_services`, cuenta solo servicios activos).
- Vista previa (dry_run) con el estado de cada fila; al confirmar se crean las
  filas válidas y las que tienen error quedan fuera.
- La carga inicial del SuperAdmin (servicios + productos) sigue en
  app/api/internal/creator/catalog_import/.
"""
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.api.internal.catalog.schemas import MAX_GROUP_NAME
from app.utils.limit_checker import LimitChecker

MAX_ROWS = 500
MAX_NAME = 120
MAX_PRICE = 100_000_000
EXAMPLE_MARK = "(ejemplo)"
SHEET = "Servicios"

# (encabezado, ancho, obligatorio)
COLUMNS = [
    ("Nombre", 36, True),
    ("Descripción", 50, False),
    ("Precio", 14, True),
    ("Costo", 12, False),
    ("Estado operativo", 18, False),
    ("Visible en formulario web", 24, False),
    ("Grupo", 24, False),
    ("Servicio especial", 18, False),
]

YES = {"si", "sí", "s", "yes", "true", "1", "x"}
NO = {"no", "n", "false", "0"}
ACTIVE = {"activo", "activa", "si", "sí", "1", "true"}
INACTIVE = {"inactivo", "inactiva", "no", "0", "false"}


class ImportFileError(ValueError):
    """El archivo no es una plantilla válida (se responde 400)."""


def _norm(value: Optional[str]) -> str:
    return " ".join((value or "").split()).lower()


def _key(name: str, group: Optional[str]) -> Tuple[str, str]:
    return _norm(name), _norm(group)


# ---------------------------------------------------------------------------
# Plantilla
# ---------------------------------------------------------------------------

def existing_groups(db: Session, tenant_id: int) -> List[str]:
    rows = (
        db.query(models.Service.group_name)
        .filter(models.Service.tenant_id == tenant_id, models.Service.group_name.isnot(None))
        .distinct()
        .all()
    )
    return sorted({g for (g,) in rows if g}, key=lambda g: g.lower())


def build_template(groups: List[str]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = SHEET

    header_fill = PatternFill("solid", fgColor="0F172A")
    for idx, (title, width, required) in enumerate(COLUMNS, start=1):
        cell = ws.cell(row=1, column=idx, value=f"{title} *" if required else title)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(vertical="center")
        ws.column_dimensions[cell.column_letter].width = width
    ws.append([
        "Cremación individual (ejemplo)", "Cremación con devolución de cenizas",
        85000, 30000, "Activo", "Sí", groups[0] if groups else "Cremaciones", "No",
    ])
    for cell in ws[2]:
        cell.font = Font(italic=True, color="64748B")
    ws.freeze_panes = "A2"

    last = MAX_ROWS + 1

    def add_list(col: int, formula: str, strict: bool = True):
        dv = DataValidation(type="list", formula1=formula, allow_blank=True)
        dv.showErrorMessage = strict  # Grupo: sugiere los existentes pero acepta uno nuevo
        ws.add_data_validation(dv)
        letter = ws.cell(row=1, column=col).column_letter
        dv.add(f"{letter}2:{letter}{last}")

    add_list(5, '"Activo,Inactivo"')
    add_list(6, '"Sí,No"')
    add_list(8, '"Sí,No"')
    if groups:
        ws_groups = wb.create_sheet("Grupos")
        for g in groups:
            ws_groups.append([g])
        ws_groups.sheet_state = "hidden"
        add_list(7, f"Grupos!$A$1:$A${len(groups)}", strict=False)

    ws_info = wb.create_sheet("Instrucciones")
    lines = [
        "Carga masiva de servicios — Vinzer",
        "",
        "1. Completa la hoja 'Servicios'. Las columnas con * son obligatorias. La fila 2 es un ejemplo: bórrala o reemplázala.",
        "2. Precio y Costo en pesos, sin puntos ni signo $ (ej: 45000).",
        "3. Estado operativo: Activo o Inactivo (vacío = Activo).",
        "4. Visible en formulario web: Sí o No (vacío = Sí).",
        "5. Grupo: elige uno existente o escribe uno nuevo (vacío = Sin grupo).",
        "6. Servicio especial (eutanasia, exhumación…): Sí o No (vacío = No).",
        "7. El mismo nombre puede repetirse en grupos distintos. Si ya existe en ese grupo, la fila se omite.",
        f"8. Máximo {MAX_ROWS} filas. No cambies el nombre de la hoja ni de las columnas.",
    ]
    for line in lines:
        ws_info.append([line])
    ws_info["A1"].font = Font(bold=True, size=14)
    ws_info.column_dimensions["A"].width = 110

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Lectura / validación
# ---------------------------------------------------------------------------

def _text(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    s = " ".join(str(value).split())
    return s or None


def _number(value: Any, field: str, errors: List[str], *, required: bool) -> Optional[float]:
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            errors.append(f"«{field}» es obligatorio")
        return None
    if isinstance(value, str):
        cleaned = value.strip().replace("$", "").replace(".", "").replace(",", ".").replace(" ", "")
        try:
            value = float(cleaned)
        except ValueError:
            errors.append(f"«{field}» no es un número válido")
            return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        errors.append(f"«{field}» no es un número válido")
        return None
    if value < 0:
        errors.append(f"«{field}» no puede ser negativo")
        return None
    if value > MAX_PRICE:
        errors.append(f"«{field}» es demasiado alto")
        return None
    return float(value)


def _choice(value: Any, yes: set, no: set, default: bool, field: str, hint: str, errors: List[str]) -> bool:
    s = _text(value)
    if s is None:
        return default
    s = s.lower()
    if s in yes:
        return True
    if s in no:
        return False
    errors.append(f"«{field}» debe ser {hint}")
    return default


def _find_sheet(wb):
    for name in wb.sheetnames:
        if name.strip().lower() == SHEET.lower():
            return wb[name]
    # Un archivo con una sola hoja también vale (ej. exportado de otro sistema con la plantilla).
    if len(wb.sheetnames) == 1:
        return wb[wb.sheetnames[0]]
    raise ImportFileError("El archivo debe tener una hoja llamada 'Servicios'. Usa la plantilla descargada.")


def _check_headers(ws):
    expected = [c[0].lower() for c in COLUMNS]
    first = next(ws.iter_rows(min_row=1, max_row=1, max_col=len(COLUMNS), values_only=True), ())
    found = [(_text(v) or "").rstrip(" *").lower() for v in first]
    found += [""] * (len(COLUMNS) - len(found))
    if found != expected:
        raise ImportFileError("La hoja no tiene las columnas de la plantilla. Descarga la plantilla nuevamente.")


def service_capacity(db: Session, tenant_id: int) -> Dict[str, Optional[int]]:
    """Cupo de servicios activos del plan (None = ilimitado)."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    plan = tenant.effective_plan if tenant else None
    limit = getattr(plan, "max_services", None) if plan else 5
    usage = LimitChecker.get_usage(db, tenant_id, "services")
    if limit is None or limit == -1 or limit >= 999999:
        return {"limit": None, "usage": usage, "available": None}
    return {"limit": limit, "usage": usage, "available": max(0, limit - usage)}


def process_import(db: Session, tenant_id: int, content: bytes, *, dry_run: bool) -> Dict[str, Any]:
    try:
        wb = load_workbook(BytesIO(content), read_only=True, data_only=True)
    except Exception:
        raise ImportFileError("El archivo no es un Excel válido (.xlsx).")

    ws = _find_sheet(wb)
    _check_headers(ws)
    n = len(COLUMNS)
    raw_rows = []
    for idx, row in enumerate(ws.iter_rows(min_row=2, max_col=n, values_only=True), start=2):
        row = list(row) + [None] * (n - len(row))
        if all(_text(v) is None for v in row):
            continue
        raw_rows.append((idx, row))
        if len(raw_rows) > MAX_ROWS:
            raise ImportFileError(f"Máximo {MAX_ROWS} filas por archivo.")
    if not raw_rows:
        raise ImportFileError("El archivo no tiene filas para importar.")

    existing = {
        _key(name, group)
        for name, group in db.query(models.Service.name, models.Service.group_name)
        .filter(models.Service.tenant_id == tenant_id)
        if name
    }
    # Grupos ya usados: un grupo nuevo escrito con otras mayúsculas se une al existente.
    group_labels = {g.lower(): g for g in existing_groups(db, tenant_id)}

    rows: List[Dict[str, Any]] = []
    to_create: List[dict] = []
    seen: set = set()
    for row_num, (name, desc, price, cost, status, visible, group, special) in raw_rows:
        errs: List[str] = []
        name = _text(name)
        if not name:
            errs.append("«Nombre» es obligatorio")
        elif len(name) > MAX_NAME:
            errs.append(f"«Nombre» admite como máximo {MAX_NAME} caracteres")
        price = _number(price, "Precio", errs, required=True)
        cost = _number(cost, "Costo", errs, required=False)
        is_active = _choice(status, ACTIVE, INACTIVE, True, "Estado operativo", "Activo o Inactivo", errs)
        show_in_form = _choice(visible, YES, NO, True, "Visible en formulario web", "Sí o No", errs)
        is_special = _choice(special, YES, NO, False, "Servicio especial", "Sí o No", errs)
        group = _text(group)
        if group and len(group) > MAX_GROUP_NAME:
            errs.append(f"«Grupo» admite como máximo {MAX_GROUP_NAME} caracteres")
        elif group:
            group = group_labels.setdefault(group.lower(), group)

        item = {
            "row": row_num, "name": name, "group": group, "price": price, "cost": cost or 0.0,
            "is_active": is_active, "show_in_form": show_in_form, "is_special": is_special,
            "status": "new", "messages": errs,
        }
        if errs:
            item["status"] = "error"
        elif name.lower().endswith(EXAMPLE_MARK):
            item["status"] = "example"
            item["messages"] = ["Fila de ejemplo de la plantilla"]
        else:
            key = _key(name, group)
            if key in seen:
                item["status"] = "error"
                item["messages"] = ["Repetido en el archivo (mismo nombre y grupo)"]
            elif key in existing:
                item["status"] = "exists"
                item["messages"] = ["Ya existe en ese grupo"]
            else:
                seen.add(key)
                to_create.append({
                    "name": name, "description": _text(desc), "price": price, "cost": cost or 0.0,
                    "is_active": is_active, "show_in_form": show_in_form, "is_special": is_special,
                    "group_name": group,
                })
        rows.append(item)

    if not dry_run and to_create:
        # Mismo lock que check_resource_limit: serializa las altas de servicios del
        # tenant hasta el commit, así el cupo calculado abajo no queda viejo.
        resource_idx = list(LimitChecker.RESOURCE_CONFIG.keys()).index("services")
        db.execute(text("SELECT pg_advisory_xact_lock(:tid, :rid)"), {"tid": tenant_id, "rid": resource_idx})

    capacity = service_capacity(db, tenant_id)
    active_new = sum(1 for s in to_create if s["is_active"])
    over_limit = capacity["available"] is not None and active_new > capacity["available"]

    summary = {
        "dry_run": dry_run,
        "rows": rows,
        "counts": {
            "new": len(to_create),
            "exists": sum(1 for r in rows if r["status"] == "exists"),
            "error": sum(1 for r in rows if r["status"] == "error"),
            "example": sum(1 for r in rows if r["status"] == "example"),
        },
        "new_groups": sorted(
            {s["group_name"] for s in to_create if s["group_name"]} - set(existing_groups(db, tenant_id)),
            key=str.lower,
        ),
        "capacity": capacity,
        "active_new": active_new,
        "over_limit": over_limit,
        "applied": False,
        "created": 0,
    }
    if dry_run or not to_create:
        return summary
    if over_limit:
        db.rollback()  # suelta el lock
        raise ImportFileError(
            f"Tu plan permite {capacity['limit']} servicios activos y ya tienes {capacity['usage']}: "
            f"el archivo agrega {active_new} activos. Marca algunos como Inactivo o mejora tu plan."
        )

    try:
        for s in to_create:
            db.add(models.Service(tenant_id=tenant_id, **s))
        db.commit()
    except Exception:
        db.rollback()
        raise

    summary["applied"] = True
    summary["created"] = len(to_create)
    return summary
