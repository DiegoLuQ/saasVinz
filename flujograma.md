# Flujograma de Instalación — Vinzer (SaaSCrematorio V2)

Runbook para desplegar Vinzer en un servidor (VPS) con Docker, **empezando por la
base de datos**. Complementa a `DESPLIEGUE.md` con el orden exacto de ejecución,
las versiones estables y el procedimiento de restauración de respaldos.

> El stack es **autocontenido**: este `docker-compose.yml` levanta su **propio
> PostgreSQL** (contenedor `vinzer_postgres`, con volumen persistente). Lo único
> externo es el reverse-proxy `nginx-proxy` + `acme-companion` (para HTTPS).

---

## 0. Versiones estables (probadas)

| Componente        | Versión           | De dónde sale                         |
|-------------------|-------------------|---------------------------------------|
| **PostgreSQL**    | `16-alpine`       | `docker-compose.yml` (servicio `postgres`) |
| **Python**        | `3.12-slim`       | `backend/Dockerfile`                  |
| **FastAPI**       | `0.128.0`         | `backend/requirements.txt`            |
| **Uvicorn**       | `0.40.0`          | `backend/requirements.txt`            |
| **SQLAlchemy**    | `2.0.45`          | `backend/requirements.txt`            |
| **Pydantic**      | `2.12.5`          | `backend/requirements.txt`            |
| **psycopg2-binary** | `2.9.11`        | `backend/requirements.txt`            |
| **Node.js**       | `20-alpine`       | `frontend-saas/Dockerfile`            |
| **Next.js**       | `16.1.4`          | `frontend-saas/package.json`          |
| **Redis**         | `7-alpine`        | `docker-compose.yml` (servicio `redis`) |
| **pgAdmin**       | `dpage/pgadmin4:latest` | `docker-compose.yml`       |

> **PostgreSQL 16** es obligatorio: los respaldos (`.dump`) se generan con
> `pg_dump` v16 (formato de archivo `v1.15`). Un `pg_restore` de una versión
> menor (p. ej. 15) falla con `unsupported version (1.15) in file header`.

---

## 1. Diagrama del flujo

```mermaid
flowchart TD
    A[1. DNS de subdominios -> IP del VPS] --> B[2. Clonar repo]
    B --> C[3. Crear y rellenar .env en el server]
    C --> D{4. Red externa del proxy existe?}
    D -- No --> D1[docker network create web_private_red_webapps]
    D -- Si --> E[5. Swap del VPS >= 4GB para el build]
    D1 --> E
    E --> F[6. docker compose build]
    F --> G[7. docker compose up -d postgres]
    G --> H{8. postgres healthy?}
    H -- No --> H1[Revisar logs de postgres]
    H1 --> H
    H -- Si --> I{9. Tienes un respaldo que restaurar?}
    I -- Si --> J[10a. Restaurar dump + GRANTs a vinzer_app]
    I -- No --> K[10b. Auto-provision del backend crea rol/BD/migraciones]
    J --> L[11. docker compose up -d  el resto del stack]
    K --> L
    L --> P[12. Proxy: subir client_max_body_size a 100m]
    P --> M[13. Verificar salud + certificados HTTPS]
    M --> N[14. Login creator y CAMBIAR contrasena]
```

---

## 2. Requisitos previos

- Docker + Docker Compose v2 (`docker compose version`).
- Reverse-proxy `nginx-proxy` + `acme-companion` **ya corriendo** en el VPS, con
  su **red externa** de Docker (por defecto `web_private_red_webapps`).
- DNS: todos los subdominios como registro **A** → IP del VPS.
- Cuentas: Cloudflare R2 (2 buckets: archivos + backups), Polar.sh, SMTP Gmail
  (contraseña de aplicación), reCAPTCHA v3.

### Subdominios (registro A → IP del VPS)

| Subdominio            | Variable `.env`   | Sirve                                  |
|-----------------------|-------------------|----------------------------------------|
| `vinzer.cl` + `www`   | `DOMAIN_MAIN`     | Landing (marketing)                    |
| `app.vinzer.cl`       | `DOMAIN_APP`      | Panel del tenant (operadores)          |
| `admin.vinzer.cl`     | `DOMAIN_ADMIN`    | Panel SuperAdmin (creator)             |
| `memorial.vinzer.cl`  | `DOMAIN_MEMORIALS`| Memoriales públicos                    |
| `track.vinzer.cl`     | `DOMAIN_TRACK`    | Seguimiento público (búsqueda por código) |
| `api-saas-keys.vinzer.cl` | `DOMAIN_API`  | Backend (API)                          |
| `pgadmin-saas.vinzer.cl`  | `DOMAIN_PGADMIN` | UI de administración de la BD         |

---

## 3. Paso a paso

### Paso 1 · DNS
Crea los registros **A** de la tabla anterior apuntando a la IP del VPS. Espera a
que propaguen (sin esto, `acme-companion` no emite los certificados).

### Paso 2 · Clonar
```bash
git clone <URL_DEL_REPO> saasVinz
cd saasVinz
```

### Paso 3 · Configurar `.env` (⚠️ NO viaja en git)
El `.env` está en `.gitignore`. En el servidor se crea a mano a partir del
template:
```bash
cp .env.example .env
nano .env
```
Rellena las **tres** secciones (infra, backend, frontend). Puntos críticos:

```dotenv
# --- Base de datos (PROPIA del stack) ---
POSTGRES_HOST=postgres            # nombre del servicio de compose, NO un contenedor externo
POSTGRES_DB=v3_saas
POSTGRES_USER=usuario_pro         # SUPERUSUARIO (migraciones + backups)
POSTGRES_PASSWORD=<pon-una-fuerte>

APP_USER=vinzer_app               # rol de la app (NO superusuario, RLS aplica)
APP_USER_PASSWORD=<pon-una-fuerte>

# --- Backend ---
ENVIRONMENT=production
SECRET_KEY=<genera-una>           # python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# --- Dominios ---
DOMAIN_MAIN=vinzer.cl
DOMAIN_TRACK=track.vinzer.cl
# ... resto de DOMAIN_* y NEXT_PUBLIC_*
```

> **Frontera de seguridad:** solo las `NEXT_PUBLIC_*` llegan al bundle del
> frontend (son públicas). Nunca pongas un secreto con prefijo `NEXT_PUBLIC_`.

> **Ojo con `POSTGRES_USER`/`POSTGRES_PASSWORD`:** la imagen de Postgres solo los
> lee la **primera vez** que inicializa el volumen `postgres_data`. Cambiarlos
> después no surte efecto salvo que recrees el volumen o hagas `ALTER ROLE`.

### Paso 4 · Verificar la red externa del proxy
```bash
docker network ls | grep web_private_red_webapps
# Si no existe:  docker network create web_private_red_webapps
```

### Paso 5 · Swap (evita que el build muera por falta de RAM)
El build del frontend (Next.js 16 + Turbopack) consume mucha memoria. En VPS con
poca RAM, `next build` muere con `signal SIGKILL` (OOM). Prevención:
```bash
free -h                                   # si Swap = 0B, agrégalo:
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Paso 6 · Build
```bash
docker compose build      # compila backend y frontend (hornea las NEXT_PUBLIC_*)
```

### Paso 7 · Levantar la base de datos primero
```bash
docker compose up -d postgres
docker compose ps          # espera a que 'postgres' quede (healthy)
```

### Paso 8 · Confirmar que Postgres está `healthy`
```bash
docker compose logs postgres --tail 20
docker exec -i vinzer_postgres pg_isready -U usuario_pro -d v3_saas
```

### Paso 9 · ¿Instalación nueva o restaurar respaldo?

- **Nueva (sin respaldo):** salta al Paso 10b.
- **Con respaldo (`.dump`):** haz el Paso 10a **antes** de levantar el backend,
  para que su auto-provisión no pise el dump.

### Paso 10a · Restaurar un respaldo
> El superusuario se llama `usuario_pro` (por `POSTGRES_USER`), **no** `postgres`.

```bash
# 1) (Opcional pero recomendado) BD limpia antes de restaurar
docker exec -i vinzer_postgres psql -U usuario_pro -d postgres \
  -c "DROP DATABASE IF EXISTS v3_saas;" \
  -c "CREATE DATABASE v3_saas OWNER usuario_pro;"

# 2) Restaurar el dump (pg_restore v16 lee el formato v1.15)
docker exec -i vinzer_postgres pg_restore -U usuario_pro -d v3_saas \
  --no-owner --role=usuario_pro \
  < /ruta/al/backup_v3_saas_YYYYMMDD_HHMMSS.dump

# 3) Dar permisos al rol de la app sobre las tablas restauradas.
#    (El dump puede traer GRANTs a un rol viejo; esto asegura vinzer_app.)
docker exec -i vinzer_postgres psql -U usuario_pro -d v3_saas <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vinzer_app') THEN
    CREATE ROLE vinzer_app LOGIN PASSWORD 'CAMBIA_ESTA_PASSWORD'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;
GRANT CONNECT ON DATABASE v3_saas TO vinzer_app;
GRANT USAGE ON SCHEMA public TO vinzer_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vinzer_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vinzer_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vinzer_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO vinzer_app;
SQL
```

> La contraseña de `vinzer_app` en el bloque SQL debe coincidir con
> `APP_USER_PASSWORD` del `.env`.

> **Cuidado con el heredoc al pegar:** en `<<'SQL' ... SQL`, la línea de cierre
> `SQL` debe ir **pegada al margen izquierdo, sin espacios**. Si tu terminal la
> pega con sangría, el heredoc nunca cierra y el bloque no se ejecuta. Alternativa
> robusta (sin heredoc, un `-c` por sentencia) — pega esto de una:
> ```bash
> docker exec -i vinzer_postgres psql -U usuario_pro -d v3_saas \
>   -c "CREATE ROLE vinzer_app LOGIN PASSWORD 'diego123' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;" \
>   -c "GRANT CONNECT ON DATABASE v3_saas TO vinzer_app;" \
>   -c "GRANT USAGE ON SCHEMA public TO vinzer_app;" \
>   -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vinzer_app;" \
>   -c "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vinzer_app;" \
>   -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vinzer_app;" \
>   -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vinzer_app;"
> ```

> Como el backend ya restauró los datos, arráncalo con `RUN_MIGRATIONS=false`
> **en esta primera vez** si quieres evitar que reintente migraciones/seeds sobre
> el dump (las migraciones son idempotentes, pero es más limpio). Quítalo en los
> siguientes arranques.

### Paso 10b · Instalación nueva (auto-provisión)
No hay pasos manuales de BD. Al levantar el backend, su `entrypoint.sh`:
1. Espera a Postgres (`pg_isready`).
2. Provisiona rol `vinzer_app` + base `v3_saas` + privilegios (`provision_db.sh`).
3. Aplica esquema, **todas** las migraciones `sql/*.sql` y los seeds.

Interruptores (en el `environment` del servicio `backend`):
`PROVISION_DB=false` (no crea rol/base) · `RUN_MIGRATIONS=false` (no migra/siembra).

### Paso 11 · Levantar el resto del stack
```bash
docker compose up -d          # backend, redis, frontend, pgadmin
docker compose ps             # todos "running"; postgres "healthy"
```

### Paso 12 · Verificación
```bash
docker compose logs -f backend        # "Setup Complete!" + "Uvicorn running"
docker exec -i vinzer_postgres psql -U vinzer_app -d v3_saas \
  -c "SELECT count(*) FROM sys_tenants;"   # el rol de la app puede leer
docker logs <contenedor_acme_companion> --tail 50   # certificados emitidos
```
En el navegador: `https://vinzer.cl`, `https://admin.vinzer.cl`,
`https://app.vinzer.cl`, `https://track.vinzer.cl`.

### Paso 13 · Seguridad post-instalación (¡IMPORTANTE!)
El seed crea un SuperAdmin por defecto (`creator@saascrematorio.cl` / `juan123`).
**Cambia la contraseña de inmediato** tras el primer login. Checklist:
- [ ] `SECRET_KEY` real y única.
- [ ] `ENVIRONMENT=production`.
- [ ] Contraseña del creator cambiada.
- [ ] `vinzer_app` **no** es superusuario.
- [ ] Contraseñas de pgAdmin y del rol de la app son fuertes.

---

## 4. Actualizaciones (redeploy)

```bash
git pull
# Si cambiaron variables NEXT_PUBLIC_* -> rebuild del frontend (se hornean en build):
docker compose build
docker compose up -d
```
Las migraciones nuevas se aplican solas al reiniciar el backend (idempotentes).

> El `.env` **no** viene en `git pull` (está en `.gitignore`). Si cambió su
> plantilla, replica los cambios a mano en el `.env` del servidor.

---

## 5. Respaldos

- Corren dentro del backend (tarea de fondo con `pg_advisory_lock`) y suben el
  dump al bucket **R2 de backups** (`R2_BUCKET_BACKUPS` + credenciales `*_BACKUP`).
- Se configuran desde el panel SuperAdmin (Configuración → Backups).
- **Prueba un restore** (Paso 10a) al menos una vez: un backup no restaurado no
  es un backup confiable.

---

## 6. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `unsupported version (1.15) in file header` | `pg_restore` < 16 sobre dump v16 | Usa `postgres:16-alpine` (ya está en el compose) |
| `role "postgres" does not exist` | El superusuario es `usuario_pro`, no `postgres` | Usa `-U usuario_pro` |
| `role "vinzer_app" does not exist` en GRANTs | El dump referencia un rol distinto | Corre el bloque de GRANTs del Paso 10a |
| El heredoc `<<'SQL'` se queda esperando (`>`) | La línea de cierre `SQL` va con sangría | Ciérrala sin espacios, o usa la variante multi-`-c` del Paso 10a |
| `next build` muere con `SIGKILL` | OOM (poca RAM) | Agrega swap (Paso 5) |
| `The data directory was initialized by PostgreSQL 15` | Volumen viejo de otra versión mayor | Borra el volumen `postgres_data` (pierdes datos) o migra con `pg_upgrade` |
| `WARN ... variable is not set` | Variable faltante en `.env` | Complétala; recuerda `NEXT_PUBLIC_VINZER_*` (con Z) |
| `SyntaxError: f-string expression part cannot include a backslash` | Código de 3.12 corriendo en Python 3.11 | El `Dockerfile` usa `python:3.12-slim` (ya corregido) |
| `413 (Content Too Large)` al subir imagen/nota | Límite `client_max_body_size` (1 MB) del nginx-proxy | Súbelo a 100 MB en el proxy (Sección 7) |
| `500` + `Failed to upload to R2` / `NoSuchBucket` | `R2_BUCKET_NAME` no coincide con el bucket real | Corrige `R2_BUCKET_NAME` en el `.env` y `docker compose up -d backend` (Sección 7) |
| `Failed to proxy .../notifications/stream` `ECONNRESET` | nginx-proxy bufferea el SSE | `proxy_buffering off;` en el vhost del API (Sección 7, pendiente) |
| No emite certificados HTTPS | DNS no propagado o `VIRTUAL_HOST` mal | Verifica DNS → IP y los dominios del compose |
| `network ... not found` | Red externa del proxy inexistente | Ajusta `EXTERNAL_NETWORK` o créala |

---

## 7. Configuración del reverse-proxy compartido (nginx-proxy)

El nginx-proxy del VPS (contenedor **`reverse-proxy`**, imagen `jwilder/nginx-proxy`)
es **externo y compartido** con otros sitios. Un par de ajustes son necesarios
para que Vinzer funcione del todo.

### 7.1 Subir el límite de tamaño de subida (arregla el `413`)

Por defecto nginx limita el cuerpo a **1 MB**, así que subir una imagen de
evidencia da `413 (Content Too Large)`. La petición cruza el proxy **dos veces**
(navegador → `app.vinzer.cl`, y el rewrite de Next → `api-saas-keys.vinzer.cl`),
por eso el límite se sube **global**.

**Fix rápido (inmediato, pero se pierde si el proxy se recrea):**
```bash
docker exec reverse-proxy sh -c 'echo "client_max_body_size 100m;" > /etc/nginx/conf.d/upload_size.conf'
docker exec reverse-proxy nginx -t
docker exec reverse-proxy nginx -s reload
```

**Fix permanente** (el volumen `/etc/nginx/vhost.d/` sí es persistente; nginx-proxy
incluye `vhost.d/default` en todos los server blocks):
```bash
docker exec reverse-proxy sh -c 'echo "client_max_body_size 100m;" > /etc/nginx/vhost.d/default'
docker restart reverse-proxy      # regenera la config para que incluya el archivo (~2s de corte a TODOS los sitios)
# Verifica:
docker exec reverse-proxy sh -c 'grep -r client_max_body_size /etc/nginx/vhost.d/ /etc/nginx/conf.d/'
```
> El `restart` es necesario porque nginx-proxy decide incluir `vhost.d/default` al
> **generar** la config (docker-gen). Alternativa sin reinicio: se activa solo la
> próxima vez que hagas `docker compose up -d` de tu stack (dispara la regeneración).

### 7.2 Notificaciones en tiempo real (SSE) — `ECONNRESET` (pendiente)

`Failed to proxy .../notifications/stream ... ECONNRESET` es el stream SSE que
nginx-proxy corta por su *buffering*. **No es bloqueante** (la app reconecta). Se
arregla creando un archivo de location para el vhost del API — mismo patrón
`_location` que ya usas para otros sitios:
```bash
# /etc/nginx/vhost.d/api-saas-keys.vinzer.cl_location
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 24h;
```

---

## 8. Conexión a pgAdmin

En `https://pgadmin-saas.vinzer.cl` → **Register Server**:

- **General → Name**: cualquier etiqueta (ej. `Vinzer`).
- **Connection**:
  - **Host name/address**: `postgres` (nombre del servicio de compose; también sirve `vinzer_postgres`). **NO** `localhost` ni la IP del VPS.
  - **Port**: `5432`
  - **Maintenance database**: `v3_saas`
  - **Username**: `usuario_pro` (superusuario) — o `vinzer_app` para ver con RLS aplicado.
  - **Password**: la de `POSTGRES_PASSWORD` (o `APP_USER_PASSWORD`).

> Funciona porque pgAdmin y Postgres comparten la red interna `db_internal`.
> Postgres no está publicado al host, solo es alcanzable dentro de esa red.

---

## 9. Registro de cambios de esta implementación

Decisiones y ajustes aplicados durante la puesta en marcha (para trazabilidad):

- **PostgreSQL propio en el compose** (`postgres:16-alpine`, contenedor
  `vinzer_postgres`, volumen `postgres_data`, healthcheck, red interna
  `db_internal`). Antes se asumía un Postgres compartido externo; ahora el stack
  es autocontenido. `POSTGRES_HOST=postgres`.
- **Postgres 16 (no 15)**: los `.dump` de producción están en formato `v1.15`
  (`pg_dump` 16); con 15 fallan al restaurar.
- **Backend en Python 3.12** (`python:3.12-slim`): el código usa sintaxis válida
  desde 3.12 (backslash en f-strings). Se alineó producción al entorno de dev y se
  corrigió `certificates.py` para que también sea compatible.
- **Subdominio `track.vinzer.cl`**: añadido a `VIRTUAL_HOST`/`LETSENCRYPT_HOST` del
  frontend y variable `DOMAIN_TRACK`.
- **Marca unificada `vinzer` (con Z)**: rol de BD `vinzer_app`, prefijo de API keys
  `pk_vinzer_live_`, clases/atributos del widget embebible y variables
  `NEXT_PUBLIC_VINZER_*` (antes había deriva `vincer`/`vinzer`).
- **nginx-proxy**: `client_max_body_size 100m` global (Sección 7.1) para permitir
  subir evidencias.
- **R2**: `R2_BUCKET_NAME` debe ser el **bucket real** de archivos (el que sirve el
  dominio público `pub-*.r2.dev`), no un nombre inventado — de lo contrario las
  subidas dan `NoSuchBucket`. Para descubrirlo:
  ```bash
  docker exec vinzer_backend python -c "from app.utils.r2 import get_r2_client; print([b['Name'] for b in get_r2_client().list_buckets()['Buckets']])"
  ```
- **Contraseñas**: se mantuvieron en `diego123` por decisión explícita (rotar a
  futuro). **Polar** sigue en `sandbox`.

---

## Resumen del orden

```
1. DNS -> IP
2. git clone
3. cp .env.example .env  y rellenar (a mano en el server)
4. Verificar/crear red externa del proxy
5. Swap >= 4GB
6. docker compose build
7. docker compose up -d postgres   -> esperar "healthy"
8. (Restaurar dump + GRANTs)  Ó  (dejar que el backend auto-provisione)
9. docker compose up -d            -> resto del stack
10. Proxy: client_max_body_size 100m (Sección 7.1) -> permite subir evidencias
11. Verificar salud + certificados
12. Login creator y CAMBIAR contraseña
```

REVISAR - 
https://aistudio.google.com/u/0/prompts/10KrNt2DyJGKevNZsmHSZ2wWDhLKs98Pq

AL MIGRAR DE 2GB DE RAM A 4GB DE RAM 

Sí, 100% de acuerdo. A medida que tu SaaS empiece a recibir clientes reales y tráfico, migrar tus DNS a Cloudflare será la mejor decisión que puedes tomar.
Aquí te explico la razón técnica y tu mapa de ruta recomendado:
🛡️ ¿Por qué te conviene migrar tus DNS a Cloudflare más adelante?
Ahorro masivo de RAM y CPU en tu VPS:
Al usar el proxy de Cloudflare (la "Nube Naranja"), Cloudflare guarda en caché las imágenes de R2 y los archivos estáticos de tu Frontend Next.js. Esto significa que hasta el 70% del tráfico no tocará tu servidor Hetzner, haciendo que tu VPS de 2GB/4GB de RAM trabaje súper relajado.
Seguridad Anti-DDoS y WAF (Firewall):
Cloudflare oculta la dirección IP real de tu servidor Hetzner. Si un bot o atacante intenta hacerle un ataque de denegación de servicio (DDoS) a vinzer.cl, Cloudflare lo frena en el Edge antes de que llegue a tu VPS.
Dominio Personalizado R2 (cdn.vinzer.cl):
Al tener los DNS en Cloudflare, conectar tu bucket R2 a cdn.vinzer.cl tomará solo 1 clic y eliminas el límite de tasa de la URL de desarrollo (.r2.dev).
🗺️ Tu Mapa de Ruta Recomendado
📍 FASE 1: HOY (Lanzamiento en VPS 2GB RAM)
Te quedas en Hetzner DNS con la URL pública de R2 (.r2.dev).
Es la forma más rápida y limpia de salir a producción hoy sin enredarte cambiando NameServers.
📍 FASE 2: Cuando migres al VPS de 4GB de RAM (Crecimiento)
Paso A (Upgrade de Servidor): En el panel de Hetzner usas la función "Rescale" para pasar a 4GB RAM (CPX21). Esto toma solo 2 minutos y no borra nada de tus bases de datos ni archivos.
Paso B (Migración a Cloudflare DNS): Cambias los servidores de nombres (NS) de tu dominio a Cloudflare.
Paso C (Dominio R2): Conectas cdn.vinzer.cl a tu bucket y ejecutas la consulta SQL de reemplazo que vimos anteriormente.
¡Tienes una visión de arquitectura muy clara!
¿Cómo va la compilación del proyecto con docker compose build y docker compose up -d?