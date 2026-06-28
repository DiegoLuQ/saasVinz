import os
from pydantic_settings import BaseSettings

_INSECURE_SECRET_KEYS = {"", "placeholder-key-for-dev-only", "CHANGE_ME_genera_una_clave_aleatoria_de_64_bytes"}

class Settings(BaseSettings):
    PROJECT_NAME: str = "SaaSCrematorio"
    # 'development' | 'production'. En producción algunas protecciones fallan-cerrado
    # (ej. reCAPTCHA sin clave) y los errores 500 no exponen detalle al cliente.
    ENVIRONMENT: str = "development"
    # OBLIGATORIO: debe provenir del entorno (.env). Sin valor seguro la app no arranca.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week

    @property
    def IS_PRODUCTION(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"
    
    # Se utiliza postgresql:// y se lee el valor del .env automáticamente si está presente
    # Administración (Superuser para migraciones)
    SQLALCHEMY_DATABASE_URL: str = "postgresql://user:pass@localhost/dbname"
    DB_ADMIN_USER: str = ""
    DB_ADMIN_PASS: str = ""

    @property
    def DB_ADMIN_URL(self) -> str:
        if self.DB_ADMIN_USER and self.DB_ADMIN_PASS:
            # Reemplazar el usuario y contraseña en la URL base o construir una nueva
            # Para simplicidad, asumimos el mismo host/db
            from sqlalchemy.engine.url import make_url
            url = make_url(self.SQLALCHEMY_DATABASE_URL)
            return str(url.set(username=self.DB_ADMIN_USER, password=self.DB_ADMIN_PASS))
        return self.SQLALCHEMY_DATABASE_URL

    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_API: str = "100/minute"
    # Por defecto usamos memoria para evitar errores si no hay Redis configurado
    REDIS_URL: str = "memory://"

    # R2 Storage
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_ENDPOINT_URL: str = ""
    R2_PUBLIC_URL: str = ""
    R2_PUBLIC_DOMAIN: str = "" # Added to map from .env
    USE_R2: bool = False

    def model_post_init(self, __context):
        # Falla-cerrado: no permitir arrancar con una SECRET_KEY ausente o de placeholder.
        # Un JWT firmado con una clave conocida es forjable (escalada a SuperAdmin).
        if self.SECRET_KEY in _INSECURE_SECRET_KEYS:
            raise RuntimeError(
                "SECRET_KEY no configurada o insegura. Defínela en el entorno "
                "(ej: python -c \"import secrets; print(secrets.token_urlsafe(64))\")."
            )

        if self.R2_PUBLIC_DOMAIN and not self.R2_PUBLIC_URL:
            self.R2_PUBLIC_URL = self.R2_PUBLIC_DOMAIN

    # Polar.sh Payments
    POLAR_ACCESS_TOKEN: str = ""
    POLAR_WEBHOOK_SECRET: str = ""
    POLAR_SERVER: str = "sandbox" # 'sandbox' or 'production'
    BASE_URL: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://lvh.me:3000"

    class Config:
        # Buscamos el .env en la carpeta backend (subiendo desde backend/app/core)
        env_file = os.path.join(os.path.dirname(__file__), "../../.env")
        extra = "ignore"

settings = Settings()
