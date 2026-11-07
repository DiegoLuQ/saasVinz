"""Campos del dueño en el certificado con imagen (nombre, RUT, correo, teléfono, dirección)."""
from types import SimpleNamespace

from app.utils.certificates import certificate_owner, generate_image_certificate_html


def test_campos_del_dueno():
    customer = SimpleNamespace(name="Ana Rojas", rut="11.111.111-1", email="ana@correo.cl",
                               phone="+56 9 1111 1111", address="Los Pinos 45", city="Ñuñoa")
    owner = certificate_owner(customer)
    assert owner["address"] == "Los Pinos 45, Ñuñoa"
    fields = [{"id": t, "type": t, "x": 50, "y": 10 + i * 10} for i, t in
              enumerate(["nombre_dueno", "rut_dueno", "correo_dueno", "telefono_dueno", "direccion_dueno"])]
    out = generate_image_certificate_html(background_url="", aspect_ratio="16:9", fields=fields, owner=owner)
    html = str(out)
    for v in ("Ana Rojas", "11.111.111-1", "ana@correo.cl", "+56 9 1111 1111", "Los Pinos 45, Ñuñoa"):
        assert v in html
    # Sin dueño: los campos no se dibujan
    empty = str(generate_image_certificate_html(background_url="", aspect_ratio="16:9", fields=fields))
    assert "Ana Rojas" not in empty and certificate_owner(None) == {}
