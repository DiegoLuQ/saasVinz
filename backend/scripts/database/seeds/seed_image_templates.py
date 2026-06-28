"""
Registro aislado de plantillas globales de imagen (sys_image_templates).

Este script es la ÚNICA fuente de verdad para las plantillas de imagen del
sistema. Vive en la raíz de `backend/` para poder eliminarse sin tocar
nada más del repositorio.

Uso:
    cd backend
    python seed_image_templates.py --seed     # registra/actualiza
    python seed_image_templates.py --clean    # elimina SOLO estas plantillas

Operaciones:
- --seed: idempotente. Si ya existe una fila con el mismo `name`, refresca
  description/default_phrase/supported_ratios/definition/is_active sin
  duplicar. Si la plantilla está `is_locked` (ya fue usada por un tenant)
  se omite con un aviso, para preservar el contrato de read-only.
- --clean: borra únicamente las filas cuyo `name` esté en SEED_TEMPLATES,
  y solo si no están en uso (usage_count == 0). Las plantillas con uso
  real se saltan para no corromper datos de tenants.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app import models


# ---------------------------------------------------------------------
# 1. Memoria Serena — minimalista, marfil + carbón, tipografía clásica.
#    Pensada para 1:1 (feed) y 9:16 (stories/portrait).
# ---------------------------------------------------------------------
TEMPLATE_MEMORIA_SERENA = {
    "background": {
        "type": "color",
        "value": "#FDFBF7",
        "opacity": 1,
    },
    "layers": [
        {
            "type": "photo",
            "id": "photo-1",
            "x": 50,
            "y": 26,
            "width": 38,
            "height": 25,
            "shape": "circle",
            "border_color": "#2D3748",
            "border_width": 2,
        },
        {
            "type": "text",
            "id": "static-1",
            "binding": "static",
            "static_text": "En memoria de",
            "x": 50,
            "y": 50,
            "width": 80,
            "font_family": "Cormorant Garamond",
            "font_size": 3.0,
            "font_weight": "400",
            "italic": True,
            "color": "#7c8896",
            "align": "center",
            "letter_spacing": 3,
            "shadow": False,
        },
        {
            "type": "text",
            "id": "pet-name-1",
            "binding": "pet_name",
            "x": 50,
            "y": 58,
            "width": 92,
            "font_family": "Playfair Display",
            "font_size": 8.5,
            "font_weight": "600",
            "italic": False,
            "color": "#2D3748",
            "align": "center",
            "letter_spacing": 0,
            "shadow": False,
        },
        {
            "type": "text",
            "id": "date-1",
            "binding": "date",
            "x": 50,
            "y": 69,
            "width": 80,
            "font_family": "Lora",
            "font_size": 2.6,
            "font_weight": "400",
            "italic": False,
            "color": "#7c8896",
            "align": "center",
            "letter_spacing": 0.5,
            "shadow": False,
        },
        {
            "type": "text",
            "id": "phrase-1",
            "binding": "phrase",
            "x": 50,
            "y": 84,
            "width": 78,
            "font_family": "Cormorant Garamond",
            "font_size": 3.2,
            "font_weight": "500",
            "italic": True,
            "color": "#3d4a5c",
            "align": "center",
            "letter_spacing": 0.3,
            "shadow": False,
        },
    ],
}


# ---------------------------------------------------------------------
# 2. Atardecer Dorado — cálido, negro absoluto con acentos dorados.
#    Pensada para 9:16 (stories) y 1:1 (feed).
# ---------------------------------------------------------------------
TEMPLATE_ATARDECER_DORADO = {
    "background": {
        "type": "color",
        "value": "#121212",
        "opacity": 1,
    },
    "layers": [
        {
            "type": "photo",
            "id": "photo-1",
            "x": 50,
            "y": 25,
            "width": 40,
            "height": 26,
            "shape": "rounded",
            "border_color": "#d4af37",
            "border_width": 2,
        },
        {
            "type": "text",
            "id": "static-1",
            "binding": "static",
            "static_text": "Tu luz nunca se apaga",
            "x": 50,
            "y": 49,
            "width": 80,
            "font_family": "Lora",
            "font_size": 2.6,
            "font_weight": "500",
            "italic": True,
            "color": "#d4af37",
            "align": "center",
            "letter_spacing": 2.5,
            "shadow": False,
        },
        {
            "type": "text",
            "id": "pet-name-1",
            "binding": "pet_name",
            "x": 50,
            "y": 58,
            "width": 92,
            "font_family": "Playfair Display",
            "font_size": 9.0,
            "font_weight": "700",
            "italic": False,
            "color": "#F7FAFC",
            "align": "center",
            "letter_spacing": 1,
            "shadow": True,
        },
        {
            "type": "text",
            "id": "date-1",
            "binding": "date",
            "x": 50,
            "y": 70,
            "width": 80,
            "font_family": "Lora",
            "font_size": 2.6,
            "font_weight": "400",
            "italic": False,
            "color": "#cbd5e1",
            "align": "center",
            "letter_spacing": 0.8,
            "shadow": False,
        },
        {
            "type": "text",
            "id": "phrase-1",
            "binding": "phrase",
            "x": 50,
            "y": 85,
            "width": 80,
            "font_family": "Cormorant Garamond",
            "font_size": 3.2,
            "font_weight": "500",
            "italic": True,
            "color": "#e2e8f0",
            "align": "center",
            "letter_spacing": 0.3,
            "shadow": False,
        },
    ],
}


SEED_TEMPLATES = [
    {
        "name": "Memoria Serena",
        "description": "Diseño minimalista en marfil con tipografía clásica. Solemne y luminoso.",
        "default_phrase": "Gracias por tantos momentos llenos de amor y compañía. Tu huella queda en nuestros corazones.",
        "supported_ratios": ["1:1", "9:16"],
        "definition": TEMPLATE_MEMORIA_SERENA,
        "is_active": True,
    },
    {
        "name": "Atardecer Dorado",
        "description": "Composición cálida sobre negro con acentos dorados. Solemne y atemporal.",
        "default_phrase": "Iluminaste cada uno de nuestros días. Tu luz nos acompaña, incluso a la distancia.",
        "supported_ratios": ["9:16", "1:1"],
        "definition": TEMPLATE_ATARDECER_DORADO,
        "is_active": True,
    },
]


def _query(db, name: str):
    return db.query(models.ImageTemplate).filter(models.ImageTemplate.name == name)


def cmd_seed() -> int:
    db = SessionLocal()
    try:
        created = updated = locked = 0
        for t in SEED_TEMPLATES:
            existing = _query(db, t["name"]).first()
            if existing:
                if existing.is_locked:
                    print(f"  [locked] '{t['name']}' ya está en uso por tenants — se omite (id={existing.id})")
                    locked += 1
                    continue
                existing.description = t["description"]
                existing.default_phrase = t["default_phrase"]
                existing.supported_ratios = t["supported_ratios"]
                existing.definition = t["definition"]
                existing.is_active = t["is_active"]
                print(f"  [update] '{t['name']}' actualizada (id={existing.id})")
                updated += 1
            else:
                row = models.ImageTemplate(
                    name=t["name"],
                    description=t["description"],
                    default_phrase=t["default_phrase"],
                    supported_ratios=t["supported_ratios"],
                    definition=t["definition"],
                    is_active=t["is_active"],
                    usage_count=0,
                )
                db.add(row)
                db.flush()
                print(f"  [create] '{t['name']}' creada (id={row.id})")
                created += 1
        db.commit()
        print(f"\nResumen seed: {created} creadas, {updated} actualizadas, {locked} bloqueadas.")
        return 0
    except Exception as e:
        db.rollback()
        print(f"Error en --seed: {e}")
        return 1
    finally:
        db.close()


def cmd_clean() -> int:
    db = SessionLocal()
    try:
        removed = skipped = missing = 0
        for t in SEED_TEMPLATES:
            existing = _query(db, t["name"]).first()
            if not existing:
                print(f"  [skip]   '{t['name']}' no estaba registrada")
                missing += 1
                continue
            if existing.is_locked:
                print(f"  [keep]   '{t['name']}' en uso ({existing.usage_count} tenants) — NO se elimina")
                skipped += 1
                continue
            db.delete(existing)
            print(f"  [delete] '{t['name']}' eliminada (id={existing.id})")
            removed += 1
        db.commit()
        print(f"\nResumen clean: {removed} eliminadas, {skipped} preservadas (en uso), {missing} inexistentes.")
        return 0
    except Exception as e:
        db.rollback()
        print(f"Error en --clean: {e}")
        return 1
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Plantillas globales de imagen — registro aislado.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--seed", action="store_true", help="Registra o actualiza las plantillas.")
    group.add_argument("--clean", action="store_true", help="Elimina SOLO las plantillas definidas en este script (omite las en uso).")
    args = parser.parse_args()

    if args.seed:
        return cmd_seed()
    return cmd_clean()


if __name__ == "__main__":
    sys.exit(main())
