"""
Registro aislado de plantillas globales de despedida.

Este script es la ÚNICA fuente de verdad para las plantillas globales
del sistema (tenant_id IS NULL). Vive en la raíz de `backend/` para
poder eliminarse sin tocar nada más del repositorio.

Uso:
    cd backend
    python seed_farewells.py --seed     # registra/actualiza las plantillas
    python seed_farewells.py --clean    # elimina SOLO estas plantillas globales

Operaciones:
- --seed: SOLO inserta filas que no existan (por nombre). NUNCA sobrescribe
  filas existentes. Esto preserva las ediciones que el SuperAdmin haga
  desde el panel (nombre, descripción, is_default, imagen de fondo, etc).
  Si quieres "refrescar" una plantilla desde código, hace primero `--clean`
  y luego `--seed`.
- --clean: borra únicamente las filas cuyo `name` esté en SEED_TEMPLATES
  y cuyo `tenant_id IS NULL`. Nunca toca plantillas de tenants reales.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app import models
from sqlalchemy import text


# ---------------------------------------------------------------------
# 1. Silencio Sublime — minimalista, marfil y carbón.
# ---------------------------------------------------------------------
TEMPLATE_SILENCIO_SUBLIME = {
    "format": "1:1",
    "theme": "calm",
    "elements": {
        "petName": "Nombre de Mascota",
        "petNameX": 0,
        "petNameY": -10,
        "subtitle": "1 mayo 2018 — 9 abril 2026",
        "subtitleX": 0,
        "subtitleY": 50,
        "farewellText": "Gracias por cada instante de ternura compartida. Tu presencia silenciosa nos acompañará para siempre.",
        "farewellTextX": 0,
        "farewellTextY": 85,
        "footerText": "",
        "footerX": 0,
        "footerY": 0,
        "image1Url": None,
        "image1X": 0,
        "image1Y": 0,
        "image2Url": None,
        "image2X": 0,
        "image2Y": -140,
        "decorativeElements": [],
    },
    "styles": {
        "font": "serif",
        "color": "#2D3748",
        "background": "#FDFBF7",
    },
    "frame": {
        "enabled": False,
        "color": "#2D3748",
        "width": 0,
        "margin": 0,
    },
    "textFormatting": {
        "bold": False,
        "italic": False,
        "hasBackground": False,
        "backgroundColor": "rgba(255, 255, 255, 0)",
        "padding": 12,
        "fontSize": 17,
        "textAlign": "center",
        "width": 460,
        "height": 110,
        "zIndex": 20,
        "maxCharacters": 500,
        "lineHeight": 1.7,
    },
    "subtitleFormatting": {
        "bold": False,
        "italic": True,
        "hasBackground": False,
        "backgroundColor": "rgba(255, 255, 255, 0)",
        "padding": 6,
        "fontSize": 16,
        "textAlign": "center",
        "width": 420,
        "height": 30,
        "zIndex": 15,
    },
    "petNameFormatting": {
        "bold": True,
        "italic": False,
        "fontSize": 42,
        "textAlign": "center",
        "letterSpacing": 2,
    },
    "imageSettings": {
        "image1": {
            "shape": "circle",
            "size": 0,
            "objectFit": "cover",
            "borderColor": "transparent",
            "borderWidth": 0,
            "zIndex": 10,
            "hidden": True,
        },
        "image2": {
            "shape": "circle",
            "size": 140,
            "objectFit": "cover",
            "borderColor": "#d4af37",
            "borderWidth": 3,
            "zIndex": 10,
            "glow": {
                "enabled": False,
                "color": "rgba(212,175,55,0.6)",
                "size": 24,
            },
        },
    },
    "backgroundImage": {
        "url": None,
        "opacity": 0.0,
        "size": "cover",
        "filter": "none",
    },
}


# ---------------------------------------------------------------------
# 2. Rayo de Luz — cálido, dorado, sobre negro absoluto.
# ---------------------------------------------------------------------
TEMPLATE_RAYO_DE_LUZ = {
    "format": "1:1",
    "theme": "warm",
    "elements": {
        "petName": "Nombre de Mascota",
        "petNameX": 0,
        "petNameY": -10,
        "subtitle": "Tu luz nunca se apaga",
        "subtitleX": 0,
        "subtitleY": 50,
        "farewellText": "Iluminaste cada uno de nuestros días. Ese rayo cálido seguirá guiándonos, incluso en la distancia.",
        "farewellTextX": 0,
        "farewellTextY": 85,
        "footerText": "",
        "footerX": 0,
        "footerY": 0,
        "image1Url": None,
        "image1X": 0,
        "image1Y": 0,
        "image2Url": None,
        "image2X": 0,
        "image2Y": -140,
        "decorativeElements": [],
    },
    "styles": {
        "font": "sans",
        "color": "#F7FAFC",
        "background": "#121212",
    },
    "frame": {
        "enabled": True,
        "color": "#d4af37",
        "width": 4,
        "margin": 14,
    },
    "textFormatting": {
        "bold": False,
        "italic": False,
        "hasBackground": False,
        "backgroundColor": "rgba(0, 0, 0, 0)",
        "padding": 12,
        "fontSize": 17,
        "textAlign": "center",
        "width": 480,
        "height": 110,
        "zIndex": 20,
        "maxCharacters": 500,
        "lineHeight": 1.65,
    },
    "subtitleFormatting": {
        "bold": True,
        "italic": False,
        "hasBackground": False,
        "backgroundColor": "rgba(0, 0, 0, 0)",
        "padding": 6,
        "fontSize": 18,
        "textAlign": "center",
        "width": 420,
        "height": 30,
        "zIndex": 15,
        "color": "#d4af37",
    },
    "petNameFormatting": {
        "bold": True,
        "italic": False,
        "fontSize": 44,
        "textAlign": "center",
        "letterSpacing": 2,
    },
    "imageSettings": {
        "image1": {
            "shape": "rounded",
            "size": 0,
            "objectFit": "cover",
            "borderColor": "transparent",
            "borderWidth": 0,
            "zIndex": 10,
            "hidden": True,
        },
        "image2": {
            "shape": "rounded",
            "size": 150,
            "objectFit": "cover",
            "borderColor": "#d4af37",
            "borderWidth": 2,
            "zIndex": 10,
            "glow": {
                "enabled": True,
                "color": "rgba(212,175,55,0.55)",
                "size": 28,
            },
        },
    },
    "backgroundImage": {
        "url": None,
        "opacity": 0.0,
        "size": "cover",
        "filter": "none",
    },
}


# ---------------------------------------------------------------------
# 3. Retrato Pleno — 9:16. Foto banner full-width arriba; debajo el nombre
#    y la frase de despedida. Sin subtítulo. Pensada para stories/portrait.
# ---------------------------------------------------------------------
TEMPLATE_RETRATO_PLENO = {
    "format": "9:16",
    "theme": "calm",
    "elements": {
        "petName": "Nombre de Mascota",
        "petNameX": 0,
        "petNameY": 15,
        "subtitle": "2015 — 2026",
        "subtitleX": 0,
        "subtitleY": 115,
        "farewellText": "Siempre vivirás en nuestros corazones",
        "farewellTextX": 0,
        "farewellTextY": 70,
        "footerText": "",
        "footerX": 0,
        "footerY": 0,
        "image1Url": None,
        "image1X": 0,
        "image1Y": 0,
        "image2Url": None,
        "image2X": 0,
        "image2Y": -130,
        "decorativeElements": [],
    },
    "styles": {
        "font": "serif",
        "color": "#2c2c2c",
        "background": "#f4ede3",
    },
    "frame": {
        "enabled": False,
        "color": "#1a1a1a",
        "width": 0,
        "margin": 0,
    },
    "textFormatting": {
        "bold": False,
        "italic": True,
        "hasBackground": False,
        "backgroundColor": "rgba(255,255,255,0)",
        "padding": 12,
        "fontSize": 18,
        "textAlign": "center",
        "width": 500,
        "height": 0,
        "zIndex": 20,
        "maxCharacters": 280,
        "lineHeight": 1.55,
    },
    "subtitleFormatting": {
        "bold": False,
        "italic": False,
        "hasBackground": False,
        "backgroundColor": "rgba(255,255,255,0)",
        "padding": 0,
        "fontSize": 18,
        "textAlign": "center",
        "width": 420,
        "height": 0,
        "zIndex": 15,
    },
    "petNameFormatting": {
        "bold": True,
        "italic": False,
        "fontSize": 48,
        "textAlign": "center",
        "letterSpacing": 1,
    },
    "imageSettings": {
        "image1": {
            "shape": "circle",
            "size": 0,
            "objectFit": "cover",
            "borderColor": "transparent",
            "borderWidth": 0,
            "zIndex": 10,
            "hidden": True,
        },
        "image2": {
            "size": 380,
            "shape": "circle",
            "objectFit": "cover",
            "borderColor": "transparent",
            "borderWidth": 0,
            "zIndex": 10,
            "glow": {
                "enabled": True,
                "color": "rgba(235, 210, 150, 0.65)",
                "size": 60,
            },
        },
    },
    "backgroundImage": {
        "url": "/storage/backgrounds/retrato_pleno_bg.webp",
        "opacity": 1.0,
        "size": "cover",
        "filter": "none",
    },
}


SEED_TEMPLATES = [
    {
        "name": "Silencio Sublime",
        "description": "Diseño minimalista en marfil y carbón. Solemne, pacífico, discreto.",
        "config": TEMPLATE_SILENCIO_SUBLIME,
        "is_default": True,
    },
    {
        "name": "Rayo de Luz",
        "description": "Composición cálida sobre negro absoluto, con acentos dorados.",
        "config": TEMPLATE_RAYO_DE_LUZ,
        "is_default": False,
    },
    {
        "name": "Retrato Pleno",
        "description": "Vertical 9:16 — elegante retrato circular con flores, vela y tipografía clásica.",
        "config": TEMPLATE_RETRATO_PLENO,
        "is_default": False,
    },
]


def _global_query(db, name: str):
    return (
        db.query(models.FarewellTemplate)
        .filter(
            models.FarewellTemplate.name == name,
            models.FarewellTemplate.tenant_id.is_(None),
        )
    )


def cmd_seed() -> int:
    db = SessionLocal()
    try:
        db.execute(text("SET app.bypass_rls = 'true'"))
        created = preserved = 0
        for t in SEED_TEMPLATES:
            existing = _global_query(db, t["name"]).first()
            if existing:
                print(f"  [keep]   '{t['name']}' ya existe (id={existing.id}) — se preservan tus ediciones")
                preserved += 1
                continue
            row = models.FarewellTemplate(
                name=t["name"],
                description=t["description"],
                config=t["config"],
                is_default=t["is_default"],
                tenant_id=None,
            )
            db.add(row)
            db.flush()
            print(f"  [create] '{t['name']}' creada (id={row.id})")
            created += 1
        db.commit()
        print(f"\nResumen seed: {created} creadas, {preserved} preservadas.")
        print("Para refrescar una plantilla desde código: corre --clean y luego --seed.")
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
        db.execute(text("SET app.bypass_rls = 'true'"))
        removed = 0
        for t in SEED_TEMPLATES:
            deleted = _global_query(db, t["name"]).delete(synchronize_session=False)
            if deleted:
                print(f"  [delete] '{t['name']}' eliminada ({deleted} fila/s)")
                removed += deleted
            else:
                print(f"  [skip]   '{t['name']}' no estaba registrada")
        db.commit()
        print(f"\nResumen clean: {removed} plantilla(s) global(es) eliminada(s).")
        return 0
    except Exception as e:
        db.rollback()
        print(f"Error en --clean: {e}")
        return 1
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Plantillas globales de despedida — registro aislado.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--seed", action="store_true", help="Registra o actualiza las plantillas globales.")
    group.add_argument("--clean", action="store_true", help="Elimina SOLO las plantillas definidas en este script.")
    args = parser.parse_args()

    if args.seed:
        return cmd_seed()
    return cmd_clean()


if __name__ == "__main__":
    sys.exit(main())
