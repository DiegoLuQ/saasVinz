from datetime import datetime
from zoneinfo import ZoneInfo

try:
    CHILE_TZ = ZoneInfo("America/Santiago")
except Exception:
    # On Windows, zoneinfo might need help finding the database
    try:
        import tzdata
        CHILE_TZ = ZoneInfo("America/Santiago")
    except Exception:
        # Fallback to UTC if absolutely necessary, though Chile is preferred
        print("WARNING: America/Santiago timezone not found, falling back to UTC")
        from datetime import timezone
        CHILE_TZ = timezone.utc

def get_now():
    """
    Returns the current datetime aware of the America/Santiago timezone.
    """
    return datetime.now(CHILE_TZ)

def to_santiago(dt: datetime):
    """
    Converts a naive or aware datetime to America/Santiago.
    """
    if dt.tzinfo is None:
        # Assume it's UTC if naive, as it's our current storage convention
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(CHILE_TZ)
