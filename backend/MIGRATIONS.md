# Guía de Migraciones con Alembic y PostgreSQL

Esta guía documenta el sistema de migraciones de base de datos implementado en SaaS Crematorio utilizando **Alembic**, **SQLAlchemy** y **PostgreSQL**.

---

## 📌 Arquitectura y Configuración

- **Ubicación de configuración**: `backend/alembic.ini`
- **Entorno de ejecución de Alembic**: `backend/alembic/env.py`
- **Historial de revisiones**: `backend/alembic/versions/`
- **Conexión**: Alembic utiliza automáticamente las credenciales de administración configuradas en `.env`:
  `DB_ADMIN_URL` (usuario con privilegios DDL) o fallback a `SQLALCHEMY_DATABASE_URL`.
- **Modelos**: Alembic importa `app.models`, registrando automáticamente todas las entidades modulares (Auth, Admin, CRM, Operaciones, Catálogo, Memorials, Integraciones, etc.) a través de `Base.metadata`.

---

## 🚀 Flujo de Trabajo para Desarrolladores

### 1. Crear una nueva migración tras cambiar modelos SQLAlchemy

Cuando agregues o modifiques un modelo en `backend/app/api/...`:

```bash
# Desde la carpeta backend/ con el venv activo:
alembic revision --autogenerate -m "add_campo_x_to_tabla_y"
```

Alembic detectará automáticamente las diferencias entre el código Python y PostgreSQL, generando un nuevo archivo en `alembic/versions/<id>_<mensaje>.py`.

### 2. Revisar la migración generada

> [!IMPORTANT]
> Siempre abre y revisa el archivo `.py` recién generado en `alembic/versions/` antes de aplicarlo.
> Verifica que las funciones `upgrade()` y `downgrade()` contengan exactamente los cambios esperados y no borren columnas de forma imprevista.

### 3. Aplicar las migraciones a la base de datos

```bash
alembic upgrade head
```

Esto ejecuta todas las migraciones pendientes hasta la última versión disponible.

### 4. Consultar el estado actual

- Ver la revisión actualmente aplicada en tu base de datos:
  ```bash
  alembic current
  ```
- Ver el historial completo de revisiones:
  ```bash
  alembic history --verbose
  ```

### 5. Revertir cambios (Rollback)

- Deshacer la última migración aplicada:
  ```bash
  alembic downgrade -1
  ```
- Revertir hasta una revisión específica:
  ```bash
  alembic downgrade <revision_id>
  ```

---

## 🛡️ Buenas Prácticas y Reglas del Proyecto

1. **Campos Globales vs. Multitenant (RLS):**
   - Si una tabla soporta registros globales (ej. plantillas o recursos del sistema sin tenant), `tenant_id` debe ser `nullable=True`.
2. **Nuevas Columnas en Tablas con Datos Existentes:**
   - Si agregas una columna requerida (`nullable=False`), proporciona un valor por defecto (`server_default='...'` o `default=...`) para no romper registros existentes.
3. **Despliegues y Docker:**
   - En contenedores, `entrypoint.sh` ejecuta automáticamente `alembic upgrade head` al iniciar, garantizando que staging y producción siempre estén actualizados.
4. **Bases de Datos Existentes:**
   - Si montas una base de datos ya creada sin historial de Alembic, puedes marcar el estado actual sin ejecutar DDL mediante:
     ```bash
     alembic stamp head
     ```
