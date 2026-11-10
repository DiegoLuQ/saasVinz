"""Actualiza las cabeceras Cache-Control y Content-Type de los objetos existentes en R2.

Agrega 'Cache-Control: public, max-age=31536000, immutable' a las imágenes, videos y
archivos estáticos para que el navegador los guarde en caché y no consuma lecturas
Clase B en Cloudflare R2 con cada recarga de página.

Uso (desde backend/):
    python scripts/update_r2_cache_headers.py                 # Solo informa (dry-run)
    python scripts/update_r2_cache_headers.py --apply         # Aplica los cambios en R2
    python scripts/update_r2_cache_headers.py --prefix tenant_1/ --apply # Solo una carpeta
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.utils.r2 import (
    DEFAULT_CACHE_CONTROL,
    get_r2_client,
    guess_content_type,
    update_r2_object_cache_control,
)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="aplicar los cambios en R2 (sin esto es solo simulacion)")
    ap.add_argument("--prefix", type=str, default="", help="filtrar por prefijo (ej: tenant_1/ o library/)")
    ap.add_argument("--limit", type=int, default=0, help="limite maximo de objetos a procesar (0 = sin limite)")
    args = ap.parse_args()

    bucket = settings.R2_BUCKET_NAME
    if not bucket or not settings.USE_R2:
        print("R2 no esta configurado o USE_R2 no esta activo en .env.")
        return

    s3 = get_r2_client()
    print(f"Examinando bucket '{bucket}' (prefijo: '{args.prefix or 'todo el bucket'}')...")

    paginator = s3.get_paginator("list_objects_v2")
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=args.prefix)

    total_scanned = 0
    needs_update = []
    already_cached = 0

    for page in page_iterator:
        for obj in page.get("Contents", []):
            total_scanned += 1
            key = obj["Key"]
            if key.endswith("/"):
                continue  # Carpeta virtual

            try:
                head = s3.head_object(Bucket=bucket, Key=key)
                cc = head.get("CacheControl") or ""
                ct = head.get("ContentType") or ""
                expected_ct = guess_content_type(key)

                if "31536000" in cc and (not expected_ct or ct == expected_ct):
                    already_cached += 1
                else:
                    needs_update.append((key, cc, ct, expected_ct))
            except Exception as e:
                print(f"  Error consultando {key}: {e}")

            if args.limit and len(needs_update) >= args.limit:
                break
        if args.limit and len(needs_update) >= args.limit:
            break

    print(f"\nResumen:")
    print(f"  Total objetos examinados: {total_scanned}")
    print(f"  Ya tienen Cache-Control correcto: {already_cached}")
    print(f"  Pendientes de actualizacion: {len(needs_update)}")

    if not needs_update:
        print("\nTodos los objetos tienen Cache-Control optimizado.")
        return

    print("\nPrimeros 15 objetos pendientes:")
    for key, cc, ct, expected_ct in needs_update[:15]:
        print(f"  - {key} (actual: '{cc or 'sin cache'}', CT: '{ct}' -> '{expected_ct}')")
    if len(needs_update) > 15:
        print(f"  ... y {len(needs_update) - 15} mas.")

    if not args.apply:
        print("\nSimulacion completada. Para aplicar los encabezados en R2, ejecuta con --apply:")
        print("  python scripts/update_r2_cache_headers.py --apply")
        return

    print(f"\nAplicando Cache-Control a {len(needs_update)} objetos...")
    success = 0
    failed = 0
    for key, _, _, expected_ct in needs_update:
        ok = update_r2_object_cache_control(
            bucket_name=bucket,
            object_name=key,
            cache_control=DEFAULT_CACHE_CONTROL,
            content_type=expected_ct
        )
        if ok:
            success += 1
        else:
            failed += 1

    print(f"\nFin del proceso:")
    print(f"  Actualizados correctamente: {success}")
    if failed:
        print(f"  Fallidos: {failed}")


if __name__ == "__main__":
    main()

