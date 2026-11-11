"""
Utility for sanitizing user-generated text input.
Strips HTML tags, dangerous attributes, and normalizes whitespace.
No external dependencies — uses Python's stdlib only.
"""

import re
import html


# Strip all HTML tags
_TAG_RE = re.compile(r'<[^>]+>')

# Strip common XSS event handlers (onmouseover, onclick, etc.)
_EVENT_HANDLER_RE = re.compile(r'\bon\w+\s*=', re.IGNORECASE)

# Strip javascript: protocol
_JS_PROTO_RE = re.compile(r'javascript\s*:', re.IGNORECASE)


def sanitize_text(value: str, max_length: int = 1000) -> str:
    """
    Sanitize a user-supplied text string:
    1. Strip HTML tags
    2. Remove event handler attributes (onclick, onmouseover, etc.)
    3. Remove javascript: protocol references
    4. Unescape HTML entities (so &amp; becomes & , etc.)
    5. Normalize excessive whitespace/newlines
    6. Truncate to max_length
    """
    if not isinstance(value, str):
        return ""

    # Strip HTML tags
    cleaned = _TAG_RE.sub('', value)

    # Remove event handlers
    cleaned = _EVENT_HANDLER_RE.sub('', cleaned)

    # Remove javascript: protocol
    cleaned = _JS_PROTO_RE.sub('', cleaned)

    # Unescape HTML entities (e.g. &lt; → <, then we just have text)
    cleaned = html.unescape(cleaned)

    # Escape any remaining < > to prevent rendering as HTML
    cleaned = cleaned.replace('<', '').replace('>', '')

    # Normalize excessive newlines (max 2 consecutive)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    # Normalize excessive spaces on same line
    cleaned = re.sub(r'[ \t]{4,}', '   ', cleaned)

    # Strip leading/trailing whitespace
    cleaned = cleaned.strip()

    # Truncate
    return cleaned[:max_length]


_EMAIL_STRICT_RE = re.compile(r"^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
_GMAIL_TYPOS = {
    "gmail.con", "gmail.co", "gmail.cm", "gmail.cpm", "gmail.om", "gmail.cl",
    "gmai.com", "gamil.com", "gmial.com", "gmal.com", "gmaill.com", "gnail.com", "gmail.comm"
}
_OTHER_TYPOS = {
    "hotmail.con": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "hotamil.com": "hotmail.com",
    "outlook.con": "outlook.com",
    "outlok.com": "outlook.com",
    "yahoo.con": "yahoo.com",
}


def sanitize_email(raw: str | None) -> str | None:
    """Limpia espacios, caracteres prohibidos y auto-corrige typos conocidos de dominio."""
    if not isinstance(raw, str):
        return None
    cleaned = re.sub(r"\s+", "", raw).strip().lower()
    if not cleaned:
        return None
    # Quitar puntos consecutivos
    cleaned = re.sub(r"\.{2,}", ".", cleaned)
    if "@" in cleaned:
        parts = cleaned.split("@", 1)
        local, domain = parts[0], parts[1]
        if domain in _GMAIL_TYPOS:
            domain = "gmail.com"
        elif domain in _OTHER_TYPOS:
            domain = _OTHER_TYPOS[domain]
        cleaned = f"{local}@{domain}"
    return cleaned[:100]


def validate_email_strict(email: str | None) -> str | None:
    """Retorna un mensaje de error si el email es inválido, o None si es válido."""
    if not email:
        return None
    if len(email) > 100:
        return "El email no puede exceder 100 caracteres"
    if any(c.isspace() for c in email):
        return "El email no puede contener espacios"
    if ".." in email:
        return "El email no puede contener puntos consecutivos"
    if not _EMAIL_STRICT_RE.match(email):
        return "Formato de email inválido (solo se permiten letras, números, puntos, guiones y guion bajo)"
    local, domain = email.split("@", 1)
    if local.startswith(".") or local.endswith(".") or domain.startswith(".") or domain.endswith("."):
        return "Formato de email inválido"
    if (domain.startswith("gmail.") or re.match(r"^(gmai|gamil|gmial|gmal|gmaill|gnail)\.", domain)) and domain != "gmail.com":
        return "Si usas Gmail debe terminar en @gmail.com"
    if domain.endswith(".con"):
        return "Dominio inválido: revisa si quisiste escribir .com"
    return None

