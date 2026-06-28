"""
Resolución de la IP real del cliente detrás del reverse proxy (Traefik).

En producción, request.client.host es la IP del proxy, no la del cliente.
Traefik añade X-Forwarded-For con la cadena de saltos; el primer valor es
la IP original del cliente. Solo confiamos en el header cuando la conexión
directa proviene de una red privada (el proxy del docker-compose); si el
backend quedara expuesto directo a internet, el header podría falsificarse.
"""
import ipaddress

from fastapi import Request


def _is_private(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return ip.is_private or ip.is_loopback


def get_client_ip(request: Request) -> str:
    direct = request.client.host if request.client else ""

    # Solo honramos X-Forwarded-For si quien nos habla es el proxy interno.
    if direct and _is_private(direct):
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Traefik AÑADE la IP del cliente al final del header (no lo sobreescribe),
            # por lo que el primer valor puede venir falsificado por el cliente.
            # Con exactamente un proxy de confianza, el último valor es el que
            # añadió Traefik y es el único confiable.
            last = forwarded.split(",")[-1].strip()
            if last:
                return last

    return direct or "unknown"
