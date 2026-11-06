import secrets
import string

def generate_unique_code(length=10):
    # secrets (CSPRNG): estos códigos funcionan como capacidad de acceso público
    # (tracking/submissions), no deben ser predecibles.
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


# Código corto del enlace público del memorial (memorial.vinzer.cl/<crematorio>/<mascota>-<código>).
# Sin letras/números que se confunden (0/o, 1/l/i) y siempre con al menos un dígito:
# así el middleware lo distingue de rutas normales de dos segmentos (p. ej. /planning/plan-mensual).
MEMORIAL_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"
MEMORIAL_CODE_LENGTH = 7


def generate_memorial_code() -> str:
    while True:
        code = "".join(secrets.choice(MEMORIAL_CODE_ALPHABET) for _ in range(MEMORIAL_CODE_LENGTH))
        if any(c.isdigit() for c in code):
            return code
