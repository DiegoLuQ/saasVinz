# Plan de Mejoras — SaaSCrematorio V2

> Generado el 2026-07-02 a partir de una revisión del código actual (incluye los módulos nuevos de widgets/API keys y tracking público).
> Prioridad: 🔴 Alta (seguridad/estabilidad) · 🟡 Media (deuda técnica con impacto) · 🟢 Baja (mejora incremental).
>
> **Estado (actualizado 2026-07-02)**: ✅ implementado en esta sesión · ⏳ pendiente.
>
> | Implementado ✅ | Pendiente ⏳ |
> |---|---|
> | S-03/P-01 (Redis en compose), S-04, S-05, S-06, S-07, S-08, C-01, C-03, C-04, C-06, F-02, F-03 (typecheck; errores TS ya no existen), P-06 (docs deshabilitados en prod) | S-01 (cookie httpOnly), S-02 (refresh tokens), S-09 (aplicar migraciones en prod), C-02, C-05, F-01, F-04, F-05, F-06, P-02, P-03, P-04, P-05, P-07 |

---

## 1. Seguridad

### 🔴 S-01 · Token de sesión legible por JavaScript
- **Dónde**: `frontend-saas/src/lib/auth/token.ts` lee `saasc_token` vía `document.cookie`.
- **Riesgo**: cualquier XSS (incluso en una dependencia de terceros) puede exfiltrar el JWT y suplantar al usuario durante 7 días.
- **Mejora**: mover la sesión a cookie `httpOnly` + `Secure` + `SameSite=Lax` emitida por un route handler de Next (patrón BFF), o como mínimo acompañar con una CSP estricta. El middleware ya lee la cookie del request, así que el cambio es compatible con el enrutado actual.

### 🔴 S-02 · JWT de 7 días sin refresh tokens
- **Dónde**: `backend/app/auth.py` (expiración 7 días, decisión pendiente desde la auditoría de junio).
- **Mejora**: access token corto (30–60 min) + refresh token rotatorio con revocación. Combinado con S-01, reduce drásticamente la ventana de un token robado.

### 🔴 S-03 · Rate limiting inefectivo en multi-réplica ✅ HECHO
> Servicio `redis` añadido a `docker-compose.yml` y `REDIS_URL=redis://redis:6379/0` inyectado al backend. La librería `redis` ya estaba en requirements.
- **Dónde**: `backend/app/core/rate_limiter.py` usa `settings.REDIS_URL`; en producción sigue `memory://`.
- **Riesgo**: con 3 réplicas detrás de Traefik, el límite de login de 5/min se convierte en ~15/min por atacante, y el contador se resetea en cada deploy.
- **Mejora**: desplegar Redis real y apuntar `REDIS_URL` a él. Es el mismo Redis que serviría para caché (ver O-05).

### 🔴 S-04 · Fuerza bruta contra códigos de tracking públicos ✅ HECHO
> `/resolve` limitado a 10/min por IP y `/{slug}/{pet}/{token}` a 30/min; mensaje 404 unificado; `generate_unique_code` migrado de `random` a `secrets` (CSPRNG). `FormSubmission.code` resultó ser de 10 chars (no 6), suficiente entropía.
- **Dónde**: `backend/app/api/public/tracking/router.py` → `GET /resolve/{code}` hace **bypass RLS global** y acepta tres tipos de código, incluido `FormSubmission.code`.
- **Riesgo**: `verification_code` (10 chars alfanuméricos) es robusto, pero si el código de submissions es corto (los form tokens usan PIN de 6 dígitos) el endpoint es enumerable cross-tenant.
- **Mejora**: rate limit específico y agresivo en `/resolve` (p. ej. 10/min por IP), respuesta 404 uniforme con retardo, y verificar/aumentar la entropía de `FormSubmission.code`.

### 🟡 S-05 · Endurecer el motor de widgets (nuevo) ✅ HECHO
> Rate limit 60/min por API key (30/min en tracking), `last_used_at` con throttle de 5 min, y el índice único en `api_key` ya existía en la migración 018.
- **Dónde**: `backend/app/api/public/widget/router.py` + `backend/app/api/internal/integrations/services.py`.
- Lo bueno: aislamiento por tenant tras validar la key, whitelist de Origin, gating por plan PRO/ULTRA.
- Mejoras:
  - **Rate limit por API key** (no solo por IP): un sitio cliente comprometido no debe poder martillar la API.
  - `key.last_used_at = ...; db.commit()` ejecuta un **UPDATE + commit en cada request** → throttlear (p. ej. actualizar solo si pasaron >5 min) para quitar escrituras del hot path.
  - El stub `/tracking/{tracking_code}` acepta `verification_code` con solo la API key del tenant: documentar que la key da acceso a consultar estados de cualquier orden del tenant, y devolver el mínimo de datos (hoy ya es mínimo — mantenerlo así cuando se implemente el timeline).
  - Las claves se guardan en claro; siendo claves públicas (`pk_...`) es aceptable, pero conviene **índice único en `api_key`** (lookup por request) si la migración 018 no lo incluye.

### 🟡 S-06 · CORS hardcodeado y demasiado amplio ✅ HECHO
> `CORS_ORIGINS` (separado por comas) en `app/core/config.py` con defaults compatibles; `expose_headers` restringido a `Content-Disposition` (lo único que lee el frontend).
- **Dónde**: `backend/app/main.py:132-168`.
- **Problema**: lista de orígenes mezclando dev y producción en el código, con `allow_credentials=True` + `expose_headers=["*"]` + `allow_headers=["*"]`.
- **Mejora**: cargar orígenes desde variable de entorno por ambiente (`CORS_ORIGINS`), y restringir `expose_headers` a lo que el frontend realmente lee.

### 🟡 S-07 · Cabeceras de seguridad HTTP ausentes ✅ HECHO
> `headers()` en `next.config.ts`: nosniff, Referrer-Policy, HSTS, Permissions-Policy en toda la app; `X-Frame-Options: SAMEORIGIN` excepto `/memorials` (el admin los previsualiza en iframe cross-subdominio).
- No hay CSP, `X-Frame-Options`/`frame-ancestors`, `HSTS` ni `X-Content-Type-Options` visibles ni en Next (`next.config`) ni en FastAPI/Traefik.
- **Mejora**: definirlas en Traefik (un solo punto para las 3 réplicas + frontend). Ojo: el widget embebible necesita excepción de framing solo en sus rutas (`/widget/*`).

### 🟡 S-08 · Logs locales sin rotación y con riesgo de datos sensibles ✅ HECHO (rotación)
> `RotatingFileHandler` (10 MB × 5) para ambos logs y el `ErrorLoggingMiddleware` ya no abre archivos a mano en el request path. Pendiente: sanitizar datos personales en tracebacks.
- **Dónde**: `main.py` escribe `backend_access.log` (todas las rutas) y `error_debug.log` (tracebacks completos) en el filesystem del contenedor.
- **Problema**: con 3 réplicas los logs quedan dispersos y crecen sin límite; los tracebacks pueden contener datos personales (mascotas/clientes → aplica Ley 19.628/21.719).
- **Mejora**: logging estructurado a stdout (recolectado por Docker), `RotatingFileHandler` si se mantiene archivo, y sanitizar payloads en errores.

### 🔴 S-09 · Recordatorio de despliegue
- La migración `014_audit_logs_nullable_tenant.sql` fue aplicada en la DB local (junio 2026) pero **sigue pendiente en producción**. Requiere credenciales `DB_ADMIN_USER/PASS`. Verificar también que la `018_add_tenant_api_keys_table.sql` (nueva) entre en el mismo runbook.

---

## 2. Optimización de Código

### 🔴 C-01 · Backups disparados por tráfico HTTP ✅ HECHO
> Nuevo `app/services/backup_scheduler.py`: tarea asyncio en startup, chequeo cada 5 min, `pg_try_advisory_lock` para exclusión entre réplicas. `BackupSchedulerMiddleware` eliminado.
- **Dónde**: `BackupSchedulerMiddleware` en `main.py:77-124`.
- **Problema**: el backup automático solo corre si alguien visita `/api/internal/maintenance/backups/status`, usa `threading.Thread` sin control, y con 3 réplicas dos pueden disparar el backup a la vez (la ventana entre leer `last_backup_at` y marcar `in_progress` es una race).
- **Mejora**: mover a un scheduler real (APScheduler en un solo worker, o cron del host llamando un script) con `pg_advisory_lock` para exclusión entre réplicas — el mismo patrón ya usado en `deps_limits.py`.

### 🟡 C-02 · `main.py` monolítico
- 369 líneas mezclando 5 middlewares ASGI escritos a mano + registro de ~45 routers.
- **Mejora**: extraer registro de routers a `app/router_registry.py` y los middlewares a `app/middleware/`. `ErrorLoggingMiddleware` además escribe archivo **síncrono dentro del request path** — reemplazar por el logger estándar.

### 🟡 C-03 · Rutas legacy duplicadas ✅ HECHO
> Verificado que el frontend solo usa `/ops-records` y `farewell-templates`; los montajes legacy (`/internal/documents`, `farewell_templates`) fueron eliminados de `main.py`.
- `documents_router` montado en `/ops-records` **y** `/documents`; `farewell_router` en `farewell-templates` **y** `farewell_templates` (`main.py:199-200, 285-286`).
- **Mejora**: confirmar con logs de acceso qué prefijo usa el frontend, migrar y eliminar el legacy (o responder 301 + header `Deprecation` durante una versión).

### 🟡 C-04 · Sin caché en el catálogo del widget ✅ HECHO
> `Cache-Control: public, max-age=300` + ETag (con respuesta 304) en `/catalog` y `/products-services`.
- **Dónde**: `GET /api/public/widget/catalog` consulta tenant + services + products + plans en cada page view de sitios de terceros — tráfico que el tenant no controla.
- **Mejora**: `Cache-Control: public, max-age=300` + ETag, o caché Redis de 60–300 s por `tenant_id`. Es el endpoint con mejor ratio esfuerzo/beneficio para cachear.

### 🟡 C-05 · Módulo integrations dividido
- `integrations/` tiene `models/schemas/services` pero su router vive en `creator/widgets/` y otro en `public/widget/`. Funciona, pero rompe la convención `module/{router,models,schemas,services}` documentada.
- **Mejora**: dejar `integrations/` como dueño del dominio (modelos + servicio) y que los routers importen de ahí (ya lo hacen) — documentarlo en el `__init__.py` o mover los routers dentro de `integrations/`.

### 🟢 C-06 · `seed_plans.py` desincronizado ✅ HECHO (guard)
> El seed ahora aborta si ya existen planes en la DB; solo sirve para bootstrap de una DB vacía.
- Sigue definiendo 4 planes sin Track y con precios viejos. Ya está advertido en CLAUDE.md, pero el riesgo de que alguien lo ejecute en producción persiste.
- **Mejora**: hacer que el seed falle si ya existen planes (guard), o regenerarlo desde la DB real.

---

## 3. Frontend

### 🟡 F-01 · Cuatro librerías solapadas de export/imagen
- `package.json` incluye `html2canvas`, `html-to-image`, `jspdf` **y** `@react-pdf/renderer` — cuatro soluciones para "capturar/generar documento", todas pesadas.
- **Mejora**: auditar usos y consolidar en máximo dos (p. ej. `@react-pdf/renderer` para PDFs y `html-to-image` para capturas). Cargar siempre con `dynamic import` para que no entren al bundle inicial.

### 🟡 F-02 · `console.log` por request en middleware de producción ✅ HECHO
> Condicionado a `NODE_ENV !== 'production'`.
- `src/middleware.ts:54` loguea host/path en **cada request** que pasa el matcher.
- **Mejora**: eliminarlo o condicionarlo a `process.env.NODE_ENV !== 'production'`.

### 🟡 F-03 · Errores TypeScript pre-existentes sin red de contención ✅ HECHO
> Verificado 2026-07-02: `tsc --noEmit` pasa limpio (los errores que menciona CLAUDE.md ya fueron corregidos). Se añadió el script `npm run typecheck` — falta engancharlo a CI cuando exista pipeline.
- `tsc --noEmit` falla hoy (null-vs-undefined en `gestion-servicios/plan/[id]`, `mascotas/`, etc.), lo que impide activar el chequeo en CI y deja pasar errores nuevos.
- **Mejora**: corregir los existentes una vez y añadir `tsc --noEmit` al pipeline (o al menos como pre-push). Es la mejora que más previene regresiones futuras.

### 🟡 F-04 · SEO/rendimiento de páginas públicas
- Las páginas públicas (tracking `/track`, memoriales, `/vincer`) son la cara visible ante familias y clientes potenciales.
- **Mejora**: `generateMetadata` con OpenGraph por memorial/tenant, componentes servidor donde no haya interactividad, skeletons de carga consistentes, y `next/image` en las landings de Vincer.

### 🟢 F-05 · Widget embebible: versionado y contrato
- El script servido desde `public/widget/` va a correr en sitios de terceros: cualquier cambio rompe integraciones ajenas.
- **Mejora**: versionar la ruta (`/widget/v1/widget.js`), definir política de compatibilidad y cache (`Cache-Control` largo + versión en el nombre), y documentar el contrato JSON de `/catalog` como API estable.

### 🟢 F-06 · Presupuesto de bundle
- Con framer-motion, konva/react-konva y las libs de export, conviene correr `next build` con `@next/bundle-analyzer` una vez por release y fijar un presupuesto (p. ej. <250 KB de First Load JS en rutas públicas).

---

## 4. Optimización SaaS (producto/operación)

### 🔴 P-01 · Redis real en producción
Desbloquea tres cosas a la vez: rate limiting compartido entre réplicas (S-03), caché del widget (C-04) y espacio para colas ligeras. Es la inversión de infraestructura con más retorno inmediato.

### 🟡 P-02 · Observabilidad
- Ya existe `correlation_id` en errores 500 — propagarlo: que el frontend lo muestre en el toast de error y lo mande a un Sentry/GlitchTip.
- Métricas mínimas por tenant: requests, errores, uso de límites (`pets/orders/customers` vs. cap del plan). Hoy no hay forma de ver "salud por tenant" sin entrar a la DB.

### 🟡 P-03 · Uso de límites como palanca de upsell
- Los caps se aplican (`deps_limits.py`) pero el tenant solo se entera al chocar con el límite.
- **Mejora**: banner/notificación al 80 % de uso con CTA de upgrade (FREE→Track→NORMAL→PRO). El módulo de notificaciones internas ya existe; es principalmente trabajo de frontend + un endpoint de "uso actual vs. límites".

### 🟡 P-04 · Verificación de backups
- El backup automático (C-01) nunca se ha validado con un **restore de prueba**. Un backup no restaurable es equivalente a no tener backup. Agendar un restore trimestral a una DB efímera y registrar el resultado.

### 🟡 P-05 · Robustez de facturación (Polar)
- Revisar que los webhooks de Polar sean **idempotentes** (reintentos de Polar no deben duplicar suscripciones/pagos) y definir el flujo de dunning: qué pasa con el tenant cuando falla el cobro (gracia → degradar a FREE → suspender), hoy no está definido como política explícita.

### 🟢 P-06 · API pública versionada ✅ PARCIAL
- Con el widget nace la primera API consumida por terceros. Antes de que crezca: prefijo `/api/public/v1/...` para los endpoints nuevos, y OpenAPI público solo de ese subconjunto.
- ✅ Hecho: `/docs`, `/redoc` y `/openapi.json` deshabilitados cuando `ENVIRONMENT=production`. ⏳ Pendiente: versionado `/v1`.

### 🟢 P-07 · Completar el portal veterinario (B2B)
- Sigue "Próximamente": el modelo de datos y comisiones existen, falta el autoservicio (clínicas creando solicitudes, viendo referidos y liquidaciones). Es la línea de producto que diferencia a Vincer de un CRM genérico y ya tiene la mitad del backend construido.

---

## Orden de ataque sugerido

| Sprint | Ítems | Tema | Estado |
|--------|-------|------|--------|
| 1 | S-03 + P-01, S-04, S-09 | Redis + brute force + migraciones pendientes | ✅ salvo S-09 (aplicar en prod al desplegar) |
| 2 | S-01, S-02 | Sesión: cookie httpOnly + refresh tokens | ⏳ requiere sesión dedicada (afecta login de todos los usuarios) |
| 3 | C-01, S-08, S-06 | Backups con scheduler real, logging, CORS por env | ✅ |
| 4 | F-03, F-02, F-01 | Deuda TS + limpieza frontend | ✅ salvo F-01 (consolidar libs de export) |
| 5 | C-04, F-05, S-05, P-06 | Endurecer y versionar el motor de widgets | ✅ salvo F-05 (versionado del script) |
| 6+ | P-02, P-03, P-05, F-04 | Observabilidad, upsell, billing, SEO | ⏳ |

### Notas de despliegue de esta remediación
1. `docker-compose up -d redis` (nuevo servicio) antes de recrear el backend; sin Redis el backend con `REDIS_URL=redis://redis:6379/0` fallará el rate limit.
2. Aplicar en producción las migraciones pendientes: `014_audit_logs_nullable_tenant.sql` y `018_add_tenant_api_keys_table.sql` (requieren `DB_ADMIN_USER/PASS`).
3. En el `.env` de producción del backend: definir `CORS_ORIGINS` (opcional — sin definir se usan los defaults actuales) y verificar `ENVIRONMENT=production` para que `/docs` quede deshabilitado.
4. El endpoint `/api/internal/documents/*` (legacy) fue retirado; el frontend ya usaba `/ops-records`. Si alguna integración externa lo consumía, restaurar el montaje.
