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
