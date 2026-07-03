import secrets
import string

def generate_unique_code(length=10):
    # secrets (CSPRNG): estos códigos funcionan como capacidad de acceso público
    # (tracking/submissions), no deben ser predecibles.
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))
