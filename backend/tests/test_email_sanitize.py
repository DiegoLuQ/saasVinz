"""Correo del formulario: «ñ», tildes y símbolos se limpian en vez de impedir el envío."""
from app.utils.sanitize import sanitize_email, validate_email_strict, format_title_case_name


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


def test_format_title_case_name():
    for raw, expected in [
        ("DANIELA BLANCO", "Daniela Blanco"),
        ("daniela blanco", "Daniela Blanco"),
        ("  DANIELA   BLANCO  ", "Daniela Blanco"),
        ("LEÓN", "León"),
        ("ÁNGEL GÓMEZ", "Ángel Gómez"),
        ("MARÍA JOSÉ", "María José"),
        ("Jean-Pierre", "Jean-Pierre"),
        ("JEAN-PIERRE", "Jean-Pierre"),
        ("pelusa", "Pelusa"),
        (None, ""),
        ("", ""),
    ]:
        assert format_title_case_name(raw) == expected

