"""Borra las fotos de formularios web que quedaron huérfanas.

Antes, eliminar un registro web borraba la fila pero no sus fotos en R2 ni su
ficha en la biblioteca de medios (`web_media_library`, categoría `submissions`).
Este script busca esas fichas y borra las que ya ningún registro usa (mismo
chequeo que el borrado de mascotas: `_still_referenced`).

Uso (desde backend/):
    python scripts/cleanup_orphan_submission_photos.py            # solo informa
    python scripts/cleanup_orphan_submission_photos.py --apply    # borra
    python scripts/cleanup_orphan_submission_photos.py --tenant 5 --apply
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import app.main  # noqa: E402,F401  (registra todos los modelos)
from app import models  # noqa: E402
from app.api.internal.common.media_service import MediaService  # noqa: E402
from app.api.internal.crm.pets.purge import _still_referenced  # noqa: E402
from app.core.tenant_context import apply_bypass_rls  # noqa: E402
from app.database import SessionLocal  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="borrar de verdad (sin esto solo informa)")
    ap.add_argument("--tenant", type=int, help="solo este crematorio (id)")
    args = ap.parse_args()

    db = SessionLocal()
    apply_bypass_rls(db)
    try:
        q = db.query(models.MediaLibrary).filter(models.MediaLibrary.category == "submissions")
        if args.tenant:
            q = q.filter(models.MediaLibrary.tenant_id == args.tenant)
        rows = q.order_by(models.MediaLibrary.id).all()
        orphans = [m for m in rows if not _still_referenced(db, m.url)]
        size = sum(m.file_size or 0 for m in orphans)
        print(f"Fotos de formularios: {len(rows)} · huérfanas: {len(orphans)} ({size / 1_048_576:.1f} MB)")
        for m in orphans[:20]:
            print(f"  [{m.tenant_id}] {m.url}")
        if len(orphans) > 20:
            print(f"  … y {len(orphans) - 20} más")

        if not args.apply:
            print("\nNada borrado. Repite con --apply para borrarlas.")
            return
        deleted = failed = 0
        for m in orphans:
            try:
                if MediaService.delete_media(db, m):
                    deleted += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"  error con {m.url}: {e}")
                failed += 1
        print(f"\nBorradas: {deleted} · con error: {failed}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
