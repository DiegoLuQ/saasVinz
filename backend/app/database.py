from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URL

# Configuración del motor para PostgreSQL
# pool_pre_ping=True asegura que las conexiones sigan vivas
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from sqlalchemy import event
from app.core.tenant_context import get_tenant_id

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """
    Al sacar una conexión del pool, declara el contexto RLS según el contextvar.
    Si no hay tenant en contexto, fuerza deny-all (en vez de heredar lo previo),
    de modo que una request que aún no fijó su tenant no pueda leer datos ajenos.
    """
    tenant_id = get_tenant_id()
    cursor = dbapi_connection.cursor()
    try:
        if tenant_id == "bypass":
            cursor.execute("SELECT set_config('app.bypass_rls', 'true', false)")
            cursor.execute("SELECT set_config('app.current_tenant_id', '', false)")
        elif tenant_id:
            cursor.execute("SELECT set_config('app.current_tenant_id', %s, false)", (str(tenant_id),))
            cursor.execute("SELECT set_config('app.bypass_rls', 'false', false)")
        else:
            # Sin contexto declarado -> deny-all (no heredar el tenant previo)
            cursor.execute("SELECT set_config('app.current_tenant_id', '', false)")
            cursor.execute("SELECT set_config('app.bypass_rls', 'false', false)")
    finally:
        cursor.close()
    # set_config(..., is_local=false) es a nivel de sesión y sobrevive al commit.
    # Cerramos la transacción implícita que abre psycopg2 para no dejar la
    # conexión "in transaction" (rompería el pool_pre_ping posterior).
    dbapi_connection.commit()


@event.listens_for(SessionLocal, "after_begin")
def reapply_rls_on_begin(session, transaction, connection):
    """
    Cada vez que la sesión inicia una transacción (incluida la NUEVA que se abre
    tras un commit), re-declara el contexto RLS guardado en session.info.

    Motivo: el Session ligado al Engine devuelve la conexión al pool en cada
    commit; el evento `checkin` la limpia a deny-all y el `checkout` siguiente la
    reabre sin tenant (el contextvar no sobrevive el salto de hilos del threadpool
    de FastAPI). Con las políticas estrictas (007), eso bloqueaba el SELECT del
    refresh tras un create -> "Could not refresh instance". Aquí restauramos el
    tenant/bypass justo después de que la conexión vuelve a estar disponible.
    """
    ctx = session.info.get("rls_context")
    if not ctx:
        return
    try:
        if ctx.get("mode") == "bypass":
            connection.exec_driver_sql("SELECT set_config('app.bypass_rls', 'true', false)")
            connection.exec_driver_sql("SELECT set_config('app.current_tenant_id', '', false)")
        else:
            connection.exec_driver_sql(
                "SELECT set_config('app.current_tenant_id', %s, false)",
                (ctx["tenant_id"],),
            )
            connection.exec_driver_sql("SELECT set_config('app.bypass_rls', 'false', false)")
    except Exception:
        # No interrumpir la transacción si la reaplicación falla; las políticas
        # estrictas (deny-all) garantizan que nunca se filtren datos de otro tenant.
        pass


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """
    Al devolver la conexión al pool, limpia los GUCs de RLS a deny-all.
    Garantiza que ninguna conexión reciclada conserve el tenant o el bypass
    de una request anterior (defensa contra fuga de contexto entre tenants).
    """
    if dbapi_connection is None:
        return
    try:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("SELECT set_config('app.current_tenant_id', '', false)")
            cursor.execute("SELECT set_config('app.bypass_rls', 'false', false)")
        finally:
            cursor.close()
        # Cerrar la transacción implícita: si la conexión vuelve al pool
        # "in transaction", el siguiente pool_pre_ping falla al fijar autocommit.
        dbapi_connection.commit()
    except Exception:
        # Si la conexión está en mal estado, el pool la reciclará; no propagar.
        pass


def get_db():
    # Import local para evitar ciclo de importación (tenant_context no depende de database).
    from app.core.tenant_context import apply_tenant_rls, apply_bypass_rls
    db = SessionLocal()
    tenant_id = get_tenant_id()
    try:
        if tenant_id:
            if tenant_id == "bypass":
                apply_bypass_rls(db)
            else:
                # Set the tenant_id in the PostgreSQL session for RLS
                apply_tenant_rls(db, tenant_id)
        yield db
    finally:
        db.close()
