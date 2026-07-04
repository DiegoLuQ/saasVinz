# Guía de Despliegue — SaaSCrematorio V2 (Vincer)

Paso a paso para instalar el proyecto en un servidor (VPS) con Docker.
Escrito a partir del `docker-compose.yml`, los `Dockerfile` y los scripts de
base de datos reales del repo.

---

## 1. Requisitos previos (además de Docker)

| Requisito | Por qué | Notas |
|---|---|---|
| **Docker + Docker Compose v2** | Corre todos los servicios | `docker --version`, `docker compose version` |
| **Reverse proxy `nginx-proxy` + `acme-companion` YA corriendo** | El compose **no** levanta proxy propio; se engancha por `VIRTUAL_HOST`/`LETSENCRYPT_HOST` | Debe existir la **red externa** de docker (ej. `web_private_red_webapps`) |
| **PostgreSQL compartido YA corriendo** | El compose **no** levanta una base de datos; reusa un contenedor existente (ej. `evolution_postgres`) | Necesitas acceso de **superusuario** para provisionar rol + base |
| **DNS de los subdominios → IP del VPS** | El proxy enruta por hostname y Let's Encrypt emite los certificados | Ver tabla de subdominios abajo |
| **Cuenta Cloudflare R2** | Almacenamiento de archivos (S3-compatible) + backups | Necesitas **2 buckets**: uno de archivos y uno de respaldos, con sus API keys |
| **Cuenta Polar.sh** | Procesamiento de pagos/suscripciones | Access token + webhook secret |
| **Cuenta de correo SMTP (Gmail)** | Envío de emails transaccionales | Usar una **contraseña de aplicación**, no la del correo |
| **reCAPTCHA v3** | Anti-bot en formularios públicos | Site key (frontend) + secret key (backend) |

> Si NO tienes un nginx-proxy o un Postgres compartido en el VPS, tendrás que
> añadirlos al compose (un servicio `postgres` con volumen y un proxy como
> Traefik/Caddy/nginx-proxy). Esta guía asume el escenario para el que el
> proyecto ya está configurado: proxy y BD compartidos y externos.

### Subdominios a crear en el DNS

Todos como registro **A** (o CNAME) apuntando a la IP del VPS:

| Subdominio (ejemplo) | Variable en `.env` | Sirve |
|---|---|---|
| `vincer.cl` + `www.vincer.cl` | `DOMAIN_MAIN` | Landing (marketing) |
| `app.vincer.cl` | `DOMAIN_APP` | Panel del tenant (operadores) |
| `admin.vincer.cl` | `DOMAIN_ADMIN` | Panel SuperAdmin (creator) |
| `memorial.vincer.cl` | `DOMAIN_MEMORIALS` | Memoriales públicos |
| `api-saas-keys.vincer.cl` | `DOMAIN_API` | Backend (API) |
| `pgadmin-saas.vincer.cl` | `DOMAIN_PGADMIN` | UI de administración de la BD |

> `track.*` y `veterinary.*` existen en el código pero **no** están en el
> `VIRTUAL_HOST` del compose todavía. Si vas a usarlos, añádelos al DNS y al
> `VIRTUAL_HOST`/`LETSENCRYPT_HOST` del servicio `frontend`.

---

## 2. Clonar el repositorio

```bash
git clone <URL_DEL_REPO> vincer
cd vincer
```

---

## 3. Configurar variables de entorno (UN solo archivo)

Toda la configuración del despliegue vive en el **`.env` de la raíz**. El compose
lo reparte: los secretos van al contenedor del backend y las `NEXT_PUBLIC_*` se
hornean en el frontend durante el build.

```bash
cp .env.example .env
nano .env
```

El `.env.example` está dividido en tres secciones comentadas; rellena las tres:

1. **Infraestructura / Compose** — Postgres compartido, usuario de la app,
   PgAdmin, dominios, red externa.
2. **Backend (secretos de runtime)** — `SECRET_KEY` (¡genérala!), `ENVIRONMENT=production`,
   R2 (archivos + backups), Polar, reCAPTCHA **secret**, correo SMTP.
3. **Frontend (`NEXT_PUBLIC_*`, públicas)** — reCAPTCHA **site key**, dominio
   público de R2, URLs base. Las 3 build-arg (`API_URL`, `ROOT_DOMAIN`,
   `MEMORIAL_DOMAIN`) las deriva el compose de los `DOMAIN_*`; el resto son
   explícitas.

Genera la clave secreta con:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

> **Frontera de seguridad:** los secretos del backend (sección 2) **nunca** se
> pasan al frontend. Solo las `NEXT_PUBLIC_*` (sección 3) llegan al build del
> frontend, y son públicas por diseño (quedan visibles en el navegador). No
> pongas secretos con el prefijo `NEXT_PUBLIC_`.

> **`backend/.env` y `frontend-saas/.env`** solo se usan para **desarrollo local
> sin Docker** (`uvicorn` / `npm run dev`). En el servidor no se leen: manda el
> `.env` de la raíz. Ambos están en `.gitignore`.

---

## 4. Base de datos: provisión automática

**No hay pasos manuales de base de datos.** Al levantar el backend (paso 6), su
`entrypoint.sh` hace todo esto solo, en orden:

1. Espera a que PostgreSQL acepte conexiones (`pg_isready`).
2. **Provisiona** (idempotente, `backend/scripts/provision_db.sh`): crea el rol
   de la app `vincer_app` (sin superusuario, con RLS), crea la base `v3_saas` y
   otorga los privilegios —incluidos los *default privileges*, para que las
   tablas que creen las migraciones queden accesibles al rol de la app.
3. Aplica el esquema, **todas** las migraciones (`sql/*.sql`) y los seeds.

Todo usa las credenciales del `.env` raíz. **Único requisito:** que
`POSTGRES_USER` (el superusuario del Postgres compartido) tenga privilegios para
`CREATE ROLE` y `CREATE DATABASE` (lo tiene si es superusuario).

### Interruptores (opcionales)

Si prefieres provisionar la base a mano (o ya existe), desactiva los pasos
automáticos poniendo estas variables en el entorno del servicio `backend`:

| Variable | Efecto |
|---|---|
| `PROVISION_DB=false` | No crea rol/base/privilegios (asume que ya existen) |
| `RUN_MIGRATIONS=false` | No aplica migraciones ni seeds |

> Provisión manual (solo si desactivas `PROVISION_DB`): el repo trae
> `backend/scripts/database/setup_production_roles.sql` como referencia.

---

## 5. Verificar que la red externa existe

```bash
docker network ls | grep web_private_red_webapps
```

Si no aparece, créala (o corrige `EXTERNAL_NETWORK` en `.env` al nombre real de
la red de tu reverse-proxy):

```bash
docker network create web_private_red_webapps
```

---

## 6. Construir y levantar

```bash
docker compose build          # compila backend y frontend (hornea las NEXT_PUBLIC_*)
docker compose up -d          # levanta backend, redis, frontend, pgadmin
docker compose ps             # todos deben quedar "running"
```

**Qué pasa al arrancar el backend** (`entrypoint.sh`):
1. Espera a que PostgreSQL acepte conexiones (`pg_isready`).
2. **Provisiona** el rol de la app y la base de datos (idempotente) — ver paso 4.
3. Corre `setup_initial_db.py`, que aplica el esquema base, **todas** las
   migraciones de `backend/scripts/database/sql/*.sql` (incluidas 014, 018, 019)
   y siembra planes y datos núcleo.
4. Arranca Uvicorn.

> Interruptores: `PROVISION_DB=false` (no provisiona la BD) y
> `RUN_MIGRATIONS=false` (no migra ni siembra), en el entorno del servicio `backend`.

---

## 7. Verificación post-instalación

```bash
# Logs del backend (deberías ver "Setup Complete!" y "Uvicorn running")
docker compose logs -f backend

# Salud de la API (desde el VPS)
curl -s http://localhost:8000/health   # dentro del contenedor/host según red

# Certificados: revisa que acme-companion emitió los de tus dominios
docker logs <contenedor_acme_companion> --tail 50
```

Abre en el navegador:
- `https://vincer.cl` → landing
- `https://admin.vincer.cl` → login del SuperAdmin
- `https://app.vincer.cl` → login del tenant

---

## 8. Primer acceso y seguridad (¡IMPORTANTE!)

El seed crea un usuario **SuperAdmin (creator)** por defecto:

- **Email:** `creator@saascrematorio.cl`
- **Password:** `juan123`

**Cambia esta contraseña de inmediato** tras el primer login (o crea un creator
nuevo y elimina este). Es una credencial pública del repo.

Checklist de seguridad mínima antes de considerar el despliegue "vivo":
- [ ] `SECRET_KEY` real y única (no el placeholder).
- [ ] `ENVIRONMENT=production` (oculta `/docs`, oculta detalle de errores 500).
- [ ] Contraseña del creator cambiada.
- [ ] `APP_USER` (`vincer_app`) **no** es superusuario (para que el aislamiento
      multi-tenant por RLS funcione).
- [ ] Contraseñas de PgAdmin y del rol de la app son fuertes.

---

## 9. Actualizaciones (redeploy)

```bash
git pull
docker compose build
docker compose up -d
```

Las migraciones nuevas se aplican solas al reiniciar el backend (son
idempotentes: usan `IF NOT EXISTS` / `ON CONFLICT`). Los privilegios de las
tablas nuevas también se otorgan solos, porque el paso de provisión configura
*default privileges* para el rol de la app.

---

## 10. Backups

- Los respaldos automáticos corren dentro del backend (tarea de fondo con
  `pg_advisory_lock`) y suben el dump al bucket **R2 de backups**
  (`R2_BUCKET_BACKUPS` + credenciales `*_BACKUP`).
- Se configuran/activan desde el panel SuperAdmin (Configuración → Backups).
- **Prueba un restore** al menos una vez: un backup que no se ha restaurado no
  es un backup confiable.

---

## 11. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El backend no arranca, error de `SECRET_KEY` | Quedó el placeholder | Genera una clave real en `backend/.env` |
| `permission denied for table ...` en la API | La provisión no corrió (¿`PROVISION_DB=false`?) | Reinicia el backend con `PROVISION_DB` activo, o corre `provision_db.sh` |
| El backend no crea el rol/base | `POSTGRES_USER` no es superusuario | Dale al usuario privilegios `CREATE ROLE` + `CREATE DATABASE`, o provisiona a mano |
| No se emiten certificados HTTPS | DNS no propagado o `VIRTUAL_HOST` mal | Verifica DNS → IP y los dominios del compose |
| El frontend muestra `localhost` / valores en blanco | Faltan las `NEXT_PUBLIC_*` en el `.env` raíz al hacer build | Complétalas y `docker compose build frontend` (se hornean en build) |
| Rate limit se resetea/no comparte | `REDIS_URL` quedó en `memory://` | Debe ser `redis://redis:6379/0` (lo inyecta el compose) |
| `network ... not found` | La red externa no existe o el nombre no coincide | Ajusta `EXTERNAL_NETWORK` o crea la red |

---

## Resumen del orden de ejecución

```
1. DNS de subdominios → IP del VPS
2. cp .env.example .env  y rellenar las 3 secciones (un solo archivo)
3. Verificar/crear la red externa de docker
4. docker compose build
5. docker compose up -d      → el backend provisiona la BD y migra solo
6. Verificar salud + certificados
7. Login creator y CAMBIAR CONTRASEÑA
```

> La creación del rol, la base y las migraciones son **automáticas** al
> arrancar el backend (paso 4 de esta guía). No hay pasos manuales de BD.
