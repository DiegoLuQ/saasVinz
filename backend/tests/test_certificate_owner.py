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


def test_dia_mes_y_anio_sueltos():
    """Elementos Día / Mes / Año del editor: partes de la fecha con formato fijo del diseño;
    con una fecha de la ficha menos precisa, la parte que no se sabe queda vacía."""
    from datetime import datetime
    fields = [
        {"id": "d", "type": "fecha_actual", "format": "part_day", "x": 10, "y": 10},
        {"id": "m", "type": "fecha_actual", "format": "part_month_name", "x": 20, "y": 10},
        {"id": "y", "type": "fecha_actual", "format": "part_year", "x": 30, "y": 10},
        {"id": "bd", "type": "fecha_nacimiento", "format": "part_day", "x": 40, "y": 10},
        {"id": "by", "type": "fecha_nacimiento", "format": "part_year", "x": 50, "y": 10},
    ]
    out = generate_image_certificate_html(
        background_url="", aspect_ratio="16:9", fields=fields, current_date=datetime(2026, 3, 5),
        birth_date=datetime(2015, 1, 1), birth_precision="year",
        overrides={"y": {"format": "long"}})  # el tenant no cambia una parte suelta
    texts = [f["value"] for f in out["printed"]]
    assert texts == ["05", "marzo", "2026", "2015"]  # día de nacimiento desconocido = vacío
