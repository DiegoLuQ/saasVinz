"""Correo del formulario: «ñ», tildes y símbolos se limpian en vez de impedir el envío."""
from app.utils.sanitize import sanitize_email, validate_email_strict


def test_ene_y_tildes_se_limpian():
    for raw, expected in [
        ("Muñoz.Pérez@Gmail.com", "munoz.perez@gmail.com"),
        ("josé@hotmail.cl", "jose@hotmail.cl"),
        ("  ana ñ@b.cl ", "anan@b.cl"),
        ("x@@y.com", "x@y.com"),
    ]:
        email = sanitize_email(raw)
        assert email == expected
        assert validate_email_strict(email) is None
